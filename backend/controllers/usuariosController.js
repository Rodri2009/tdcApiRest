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
                id,
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
            SELECT id, email, nombre, rol, activo, creado_en
            FROM usuarios WHERE id = ?
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

        // Verificar si el email ya existe
        const [existente] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existente) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insertar usuario
        const result = await conn.query(`
            INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
            VALUES (?, ?, ?, ?, 1)
        `, [email, passwordHash, nombre || '', rolFinal]);

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        logError('Error creando usuario:', err);
        res.status(500).json({ message: 'Error al crear usuario', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Actualizar usuario existente
 */
const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { email, password, nombre, rol, activo } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        // Verificar que el usuario existe
        const [usuario] = await conn.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Si cambia el email, verificar que no exista otro usuario con ese email
        if (email) {
            const [existente] = await conn.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]);
            if (existente) {
                return res.status(400).json({ message: 'El email ya está en uso por otro usuario' });
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
            await conn.query(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (err) {
        logError('Error actualizando usuario:', err);
        res.status(500).json({ message: 'Error al actualizar usuario', error: err.message });
    } finally {
        if (conn) conn.release();
    }
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
        const [usuario] = await conn.query('SELECT id, email FROM usuarios WHERE id = ?', [id]);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Eliminar usuario
        await conn.query('DELETE FROM usuarios WHERE id = ?', [id]);

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

    res.json({ lista: permisos, porModulo: permisosPorModulo });
};

/**
 * Asignar rol a un usuario
 */
const asignarRoles = async (req, res) => {
    const { id } = req.params;
    const { rol } = req.body;

    const rolesValidos = ['admin', 'staff', 'cliente'];
    if (!rol || !rolesValidos.includes(rol)) {
        return res.status(400).json({ message: 'Rol inválido. Use: admin, staff o cliente' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const [usuario] = await conn.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await conn.query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id]);

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
