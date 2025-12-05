/**
 * controllers/usuariosController.js
 * CRUD completo de usuarios con gestión de roles
 */

const pool = require('../db');
const bcrypt = require('bcryptjs');

/**
 * Obtener todos los usuarios con sus roles
 */
const getUsuarios = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const usuarios = await conn.query(`
            SELECT 
                u.id,
                u.email,
                u.nombre,
                u.rol as rol_legacy,
                u.activo,
                u.creado_en,
                u.ultimo_acceso,
                GROUP_CONCAT(DISTINCT r.codigo) as roles,
                GROUP_CONCAT(DISTINCT r.nombre SEPARATOR ', ') as roles_nombres
            FROM usuarios u
            LEFT JOIN usuarios_roles ur ON u.id = ur.id_usuario
            LEFT JOIN roles r ON ur.id_rol = r.id
            GROUP BY u.id
            ORDER BY u.creado_en DESC
        `);

        res.json(usuarios);
    } catch (err) {
        console.error('Error obteniendo usuarios:', err);
        res.status(500).json({ message: 'Error al obtener usuarios', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtener un usuario por ID con sus roles y permisos
 */
const getUsuarioPorId = async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();

        // Obtener usuario básico
        const [usuario] = await conn.query(`
            SELECT id, email, nombre, rol as rol_legacy, activo, creado_en, ultimo_acceso
            FROM usuarios WHERE id = ?
        `, [id]);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Obtener roles del usuario
        const roles = await conn.query(`
            SELECT r.id, r.codigo, r.nombre, r.descripcion, r.nivel
            FROM roles r
            INNER JOIN usuarios_roles ur ON r.id = ur.id_rol
            WHERE ur.id_usuario = ?
        `, [id]);

        // Obtener permisos del usuario (a través de sus roles)
        const permisos = await conn.query(`
            SELECT DISTINCT p.codigo, p.modulo, p.accion, p.descripcion
            FROM permisos p
            INNER JOIN roles_permisos rp ON p.id = rp.id_permiso
            INNER JOIN usuarios_roles ur ON rp.id_rol = ur.id_rol
            WHERE ur.id_usuario = ?
            ORDER BY p.modulo, p.accion
        `, [id]);

        res.json({
            ...usuario,
            roles: roles,
            permisos: permisos
        });
    } catch (err) {
        console.error('Error obteniendo usuario:', err);
        res.status(500).json({ message: 'Error al obtener usuario', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Crear nuevo usuario
 */
const crearUsuario = async (req, res) => {
    const { email, password, nombre, roles: rolesIds } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar si el email ya existe
        const [existente] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existente) {
            await conn.rollback();
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insertar usuario
        const result = await conn.query(`
            INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
            VALUES (?, ?, ?, 'staff', 1)
        `, [email, passwordHash, nombre || '']);

        const usuarioId = Number(result.insertId);

        // Asignar roles si se especificaron
        if (rolesIds && rolesIds.length > 0) {
            for (const rolId of rolesIds) {
                await conn.query(`
                    INSERT INTO usuarios_roles (id_usuario, id_rol) VALUES (?, ?)
                `, [usuarioId, rolId]);
            }
        } else {
            // Si no se especifican roles, asignar VIEWER por defecto
            const [rolViewer] = await conn.query("SELECT id FROM roles WHERE codigo = 'VIEWER'");
            if (rolViewer) {
                await conn.query(`
                    INSERT INTO usuarios_roles (id_usuario, id_rol) VALUES (?, ?)
                `, [usuarioId, rolViewer.id]);
            }
        }

        await conn.commit();

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            id: usuarioId
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error creando usuario:', err);
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
    const { email, password, nombre, activo, roles: rolesIds } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar que el usuario existe
        const [usuario] = await conn.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (!usuario) {
            await conn.rollback();
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Si cambia el email, verificar que no exista otro usuario con ese email
        if (email) {
            const [existente] = await conn.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]);
            if (existente) {
                await conn.rollback();
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

        // Actualizar roles si se especificaron
        if (rolesIds !== undefined) {
            // Eliminar roles actuales
            await conn.query('DELETE FROM usuarios_roles WHERE id_usuario = ?', [id]);

            // Asignar nuevos roles
            if (rolesIds.length > 0) {
                for (const rolId of rolesIds) {
                    await conn.query(`
                        INSERT INTO usuarios_roles (id_usuario, id_rol) VALUES (?, ?)
                    `, [id, rolId]);
                }
            }
        }

        await conn.commit();

        res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error actualizando usuario:', err);
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

        // Eliminar usuario (los roles se eliminan en cascada)
        await conn.query('DELETE FROM usuarios WHERE id = ?', [id]);

        res.json({ message: `Usuario ${usuario.email} eliminado exitosamente` });
    } catch (err) {
        console.error('Error eliminando usuario:', err);
        res.status(500).json({ message: 'Error al eliminar usuario', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtener todos los roles disponibles
 */
const getRoles = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const roles = await conn.query(`
            SELECT id, codigo, nombre, descripcion, nivel, activo
            FROM roles
            WHERE activo = 1
            ORDER BY nivel DESC
        `);

        res.json(roles);
    } catch (err) {
        console.error('Error obteniendo roles:', err);
        res.status(500).json({ message: 'Error al obtener roles', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtener todos los permisos disponibles
 */
const getPermisos = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const permisos = await conn.query(`
            SELECT id, codigo, modulo, accion, descripcion
            FROM permisos
            WHERE activo = 1
            ORDER BY modulo, accion
        `);

        // Agrupar por módulo para facilitar la visualización
        const permisosPorModulo = permisos.reduce((acc, p) => {
            if (!acc[p.modulo]) {
                acc[p.modulo] = [];
            }
            acc[p.modulo].push(p);
            return acc;
        }, {});

        res.json({
            lista: permisos,
            porModulo: permisosPorModulo
        });
    } catch (err) {
        console.error('Error obteniendo permisos:', err);
        res.status(500).json({ message: 'Error al obtener permisos', error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Asignar roles a un usuario
 */
const asignarRoles = async (req, res) => {
    const { id } = req.params;
    const { roles: rolesIds } = req.body;

    if (!rolesIds || !Array.isArray(rolesIds)) {
        return res.status(400).json({ message: 'Se requiere un array de IDs de roles' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar que el usuario existe
        const [usuario] = await conn.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (!usuario) {
            await conn.rollback();
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Eliminar roles actuales
        await conn.query('DELETE FROM usuarios_roles WHERE id_usuario = ?', [id]);

        // Asignar nuevos roles
        for (const rolId of rolesIds) {
            await conn.query(`
                INSERT INTO usuarios_roles (id_usuario, id_rol) VALUES (?, ?)
            `, [id, rolId]);
        }

        await conn.commit();

        res.json({ message: 'Roles asignados exitosamente' });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error asignando roles:', err);
        res.status(500).json({ message: 'Error al asignar roles', error: err.message });
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

        // Obtener usuario actual
        const [usuario] = await conn.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.user.id]);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar contraseña actual
        const isMatch = await bcrypt.compare(passwordActual, usuario.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
        }

        // Hash de la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordNueva, salt);

        // Actualizar contraseña
        await conn.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (err) {
        console.error('Error cambiando contraseña:', err);
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
