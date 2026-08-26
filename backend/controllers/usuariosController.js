/**
 * controllers/usuariosController.js
 * CRUD de usuarios - Sistema simplificado usando campo 'rol' en tabla usuarios
 */

const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
const bcrypt = require('bcryptjs');

/**
 * Obtener todos los usuarios
 */
const getUsuarios = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const usuarios = await conn.query(`
            SELECT 
                id_usuario,
                email,
                nombre,
                rol,
                activo,
                creado_en
            FROM usuarios
            ORDER BY creado_en DESC
        `);

        res.json(usuarios);
    } catch (err) {
        logError('Error obteniendo usuarios:', err);
        res.status(500).json({ message: 'Error al obtener usuarios', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtener un usuario por ID
 */
const getUsuarioPorId = async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();

        const [usuario] = await conn.query(`
            SELECT id_usuario, email, nombre, rol, activo, creado_en
            FROM usuarios WHERE id_usuario = ?
        `, [id]);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(usuario);
    } catch (err) {
        logError('Error obteniendo usuario:', err);
        res.status(500).json({ message: 'Error al obtener usuario', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Crear nuevo usuario
 * 
 * Validaciones:
 * - Email único en usuarios (no puede duplicarse)
 * - Si email existe en clientes:
 *   - Con id_usuario → rechaza (cliente ya vinculado)
 *   - Sin id_usuario → crea usuario y vincula automáticamente
 */
const crearUsuario = async (req, res) => {
    const { email, password, nombre, rol } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    // Validar rol
    const rolesValidos = ['admin', 'staff', 'cliente'];
    const rolFinal = rolesValidos.includes(rol) ? rol : 'cliente';

    let conn;
    try {
        conn = await pool.getConnection();

        // ✅ Verificar si el email ya existe en usuarios
        const [existenteUsuario] = await conn.query('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
        if (existenteUsuario) {
            return res.status(409).json({ message: 'El email ya está registrado en usuarios' });
        }

        // ✅ Verificar si el email existe en clientes
        let idClienteExistente = null;
        const [clienteExistente] = await conn.query('SELECT id_cliente, id_usuario FROM clientes WHERE email = ?', [email]);
        
        if (clienteExistente) {
            if (clienteExistente.id_usuario) {
                // El cliente ya está vinculado a otro usuario
                return res.status(409).json({
                    message: 'Este email ya está vinculado a otro usuario (ID: ' + clienteExistente.id_usuario + ')',
                    id_cliente: clienteExistente.id_cliente,
                    id_usuario_existente: clienteExistente.id_usuario
                });
            }
            // El cliente existe pero sin id_usuario (lo vincularemos después)
            idClienteExistente = clienteExistente.id_cliente;
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insertar usuario
        const result = await conn.query(`
            INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
            VALUES (?, ?, ?, ?, 1)
        `, [email, passwordHash, nombre || '', rolFinal]);

        const nuevoIdUsuario = Number(result.insertId);

        // ✅ Si hay un cliente existente sin id_usuario, vincularlo
        if (idClienteExistente) {
            await conn.query('UPDATE clientes SET id_usuario = ? WHERE id_cliente = ?', [nuevoIdUsuario, idClienteExistente]);
            logVerbose(`[USUARIOS] Usuario #${nuevoIdUsuario} vinculado automáticamente a cliente #${idClienteExistente}`);
            res.status(201).json({
                message: 'Usuario creado y vinculado automáticamente a cliente',
                id: nuevoIdUsuario,
                id_cliente: idClienteExistente
            });
        } else {
            res.status(201).json({
                message: 'Usuario creado exitosamente',
                id: nuevoIdUsuario
            });
        }
    } catch (err) {
        logError('Error creando usuario:', err);
        res.status(500).json({ message: 'Error al crear usuario', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Actualizar usuario existente
 * 
 * Validaciones al cambiar email:
 * - No puede duplicarse en usuarios
 * - Si existe en clientes con id_usuario diferente → rechaza
 * - Si existe en clientes sin id_usuario → vincula
 */
const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { email, password, nombre, rol, activo } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        // Verificar que el usuario existe
        const [usuario] = await conn.query('SELECT id_usuario, email as email_actual FROM usuarios WHERE id_usuario = ?', [id]);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Si cambia el email, aplicar validaciones
        let clienteParaVincular = null;
        if (email && email !== usuario.email_actual) {
            // ✅ Verificar que no exista otro usuario con ese email
            const [existenteUsuario] = await conn.query('SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?', [email, id]);
            if (existenteUsuario) {
                return res.status(409).json({ message: 'El email ya está en uso por otro usuario' });
            }

            // ✅ Verificar si el email existe en clientes
            const [clienteExistente] = await conn.query('SELECT id_cliente, id_usuario FROM clientes WHERE email = ?', [email]);
            if (clienteExistente) {
                if (clienteExistente.id_usuario && clienteExistente.id_usuario != id) {
                    // El cliente está vinculado a otro usuario
                    return res.status(409).json({
                        message: 'Este email ya está vinculado a otro usuario (ID: ' + clienteExistente.id_usuario + ')',
                        id_cliente: clienteExistente.id_cliente
                    });
                } else if (!clienteExistente.id_usuario) {
                    // El cliente existe pero sin id_usuario, lo vincularemos
                    clienteParaVincular = clienteExistente.id_cliente;
                }
            }
        }

        // Construir query de actualización dinámicamente
        let updates = [];
        let params = [];

        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (nombre !== undefined) {
            updates.push('nombre = ?');
            params.push(nombre);
        }
        if (rol !== undefined) {
            const rolesValidos = ['admin', 'staff', 'cliente'];
            if (rolesValidos.includes(rol)) {
                updates.push('rol = ?');
                params.push(rol);
            }
        }
        if (activo !== undefined) {
            updates.push('activo = ?');
            params.push(activo ? 1 : 0);
        }
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            updates.push('password_hash = ?');
            params.push(passwordHash);
        }

        if (updates.length > 0) {
            params.push(id);
            await conn.query(`UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ?`, params);
        }

        // ✅ Si hay un cliente para vincular, hacerlo después de actualizar
        if (clienteParaVincular) {
            await conn.query('UPDATE clientes SET id_usuario = ? WHERE id_cliente = ?', [id, clienteParaVincular]);
            logVerbose(`[USUARIOS] Usuario #${id} vinculado automáticamente a cliente #${clienteParaVincular} (por cambio de email)`);
            res.json({
                message: 'Usuario actualizado y vinculado automáticamente a cliente',
                id_cliente: clienteParaVincular
            });
        } else {
            res.json({ message: 'Usuario actualizado exitosamente' });
        }
    } catch (err) {
        logError('Error actualizando usuario:', err);
        res.status(500).json({ message: 'Error al actualizar usuario', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Verifica si un usuario tiene solicitudes asociadas y por eso no puede eliminarse.
 * Si no tiene solicitudes, se permite la baja y se eliminan sus relaciones
 * en talleristas/clientes antes del DELETE del usuario.
 */
const obtenerConflictosEliminacionUsuario = async (conn, userId) => {
    const [row] = await conn.query(
        'SELECT COUNT(*) AS count FROM solicitudes WHERE id_usuario_creador = ?',
        [userId]
    );

    const count = Number(row?.count || 0);
    return count > 0 ? [{ table: 'solicitudes', count }] : [];
};

/**
 * Eliminar usuario
 */
const eliminarUsuario = async (req, res) => {
    const { id } = req.params;

    // No permitir que un usuario se elimine a sí mismo
    if (req.user && req.user.id == id) {
        return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Verificar que el usuario existe
        const [usuario] = await conn.query('SELECT id_usuario, email FROM usuarios WHERE id_usuario = ?', [id]);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const conflictos = await obtenerConflictosEliminacionUsuario(conn, id);
        if (conflictos.length > 0) {
            return res.status(409).json({
                message: 'No se puede eliminar el usuario porque tiene solicitudes asociadas.',
                conflictos
            });
        }

        await conn.query('UPDATE talleristas SET id_usuario = NULL WHERE id_usuario = ?', [id]);
        await conn.query('UPDATE clientes SET id_usuario = NULL WHERE id_usuario = ?', [id]);
        await conn.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);

        res.json({ message: `Usuario ${usuario.email} eliminado exitosamente` });
    } catch (err) {
        logError('Error eliminando usuario:', err);
        res.status(500).json({ message: 'Error al eliminar usuario', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtener roles disponibles (hardcoded - sistema simplificado)
 */
const getRoles = async (req, res) => {
    const roles = [
        { id: 1, codigo: 'admin', nombre: 'Administrador', descripcion: 'Acceso completo al sistema', nivel: 100 },
        { id: 2, codigo: 'staff', nombre: 'Staff', descripcion: 'Gestión de solicitudes y reportes', nivel: 50 },
        { id: 3, codigo: 'cliente', nombre: 'Cliente', descripcion: 'Ver y crear solicitudes propias', nivel: 10 }
    ];
    logVerbose('Roles disponibles:', roles);
    res.json(roles);
};

/**
 * Obtener permisos disponibles (hardcoded - sistema simplificado)
 */
const getPermisos = async (req, res) => {
    const permisos = [
        { codigo: 'usuarios.ver', modulo: 'usuarios', accion: 'ver', descripcion: 'Ver usuarios' },
        { codigo: 'usuarios.crear', modulo: 'usuarios', accion: 'crear', descripcion: 'Crear usuarios' },
        { codigo: 'usuarios.editar', modulo: 'usuarios', accion: 'editar', descripcion: 'Editar usuarios' },
        { codigo: 'usuarios.eliminar', modulo: 'usuarios', accion: 'eliminar', descripcion: 'Eliminar usuarios' },
        { codigo: 'solicitudes.ver', modulo: 'solicitudes', accion: 'ver', descripcion: 'Ver solicitudes' },
        { codigo: 'solicitudes.crear', modulo: 'solicitudes', accion: 'crear', descripcion: 'Crear solicitudes' },
        { codigo: 'solicitudes.editar', modulo: 'solicitudes', accion: 'editar', descripcion: 'Editar solicitudes' },
        { codigo: 'solicitudes.eliminar', modulo: 'solicitudes', accion: 'eliminar', descripcion: 'Eliminar solicitudes' },
        { codigo: 'configuracion.ver', modulo: 'configuracion', accion: 'ver', descripcion: 'Ver configuración' },
        { codigo: 'configuracion.editar', modulo: 'configuracion', accion: 'editar', descripcion: 'Editar configuración' },
        { codigo: 'reportes.ver', modulo: 'reportes', accion: 'ver', descripcion: 'Ver reportes' }
    ];

    const permisosPorModulo = permisos.reduce((acc, p) => {
        if (!acc[p.modulo]) acc[p.modulo] = [];
        acc[p.modulo].push(p);
        return acc;
    }, {});

    logVerbose('Permisos disponibles:', permisos);
    logVerbose('Permisos por módulo:', permisosPorModulo);
    res.json({ lista: permisos, porModulo: permisosPorModulo });
};

/**
 * Asignar rol a un usuario
 */
const asignarRoles = async (req, res) => {
    const { id } = req.params;
    const { rol } = req.body;

    const rolesValidos = ['admin', 'staff', 'staff_readonly', 'cliente'];
    if (!rol || !rolesValidos.includes(rol)) {
        return res.status(400).json({ message: 'Rol inválido. Use: admin, staff, staff_readonly o cliente' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const [usuario] = await conn.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await conn.query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id]);
        logVerbose('Rol asignado exitosamente para el usuario:', id);

        res.json({ message: 'Rol asignado exitosamente' });
    } catch (err) {
        logError('Error asignando rol:', err);
        res.status(500).json({ message: 'Error al asignar rol', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Cambiar contraseña del usuario actual
 */
const cambiarPassword = async (req, res) => {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
        return res.status(400).json({ message: 'Se requiere contraseña actual y nueva' });
    }

    if (passwordNueva.length < 6) {
        return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const [usuario] = await conn.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.user.id]);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const isMatch = await bcrypt.compare(passwordActual, usuario.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordNueva, salt);

        await conn.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

        logVerbose('Contraseña actualizada exitosamente para el usuario:', req.user.id);
        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (err) {
        logError('Error cambiando contraseña:', err);
        res.status(500).json({ message: 'Error al cambiar contraseña', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    getUsuarios,
    getUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    getRoles,
    getPermisos,
    asignarRoles,
    cambiarPassword
};
