const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Obtiene los roles y permisos de un usuario
 */
const obtenerRolesYPermisos = async (conn, userId) => {
    // Obtener roles del usuario
    const roles = await conn.query(`
        SELECT r.codigo, r.nombre, r.nivel
        FROM roles r
        INNER JOIN usuarios_roles ur ON r.id = ur.id_rol
        WHERE ur.id_usuario = ?
    `, [userId]);

    // Obtener permisos del usuario (a través de sus roles)
    const permisos = await conn.query(`
        SELECT DISTINCT p.codigo
        FROM permisos p
        INNER JOIN roles_permisos rp ON p.id = rp.id_permiso
        INNER JOIN usuarios_roles ur ON rp.id_rol = ur.id_rol
        WHERE ur.id_usuario = ?
    `, [userId]);

    // Determinar el nivel máximo del usuario
    const nivelMaximo = roles.length > 0
        ? Math.max(...roles.map(r => r.nivel))
        : 0;

    return {
        roles: roles.map(r => r.codigo),
        rolesDetalle: roles,
        permisos: permisos.map(p => p.codigo),
        nivel: nivelMaximo
    };
};

const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [user] = await conn.query("SELECT * FROM usuarios WHERE email = ?", [email]);

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' }); // 401 Unauthorized
        }

        // Verificar si el usuario está activo
        if (user.activo === 0) {
            return res.status(401).json({ message: 'Usuario desactivado. Contacte al administrador.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Obtener roles y permisos
        const { roles, permisos, nivel } = await obtenerRolesYPermisos(conn, user.id);

        // Actualizar último acceso
        await conn.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);

        // --- Creación del Token JWT ---
        // Incluimos roles y permisos en el payload
        const payload = {
            id: user.id,
            email: user.email,
            role: user.rol,  // Mantener compatibilidad con campo legacy
            roles: roles,
            permisos: permisos,
            nivel: nivel
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        // --- Envío del Token en una Cookie HttpOnly ---
        res.cookie('token', token, {
            httpOnly: true, // El token no es accesible por JavaScript en el navegador
            secure: process.env.NODE_ENV === 'production', // En producción, solo enviar por HTTPS
            maxAge: 8 * 60 * 60 * 1000 // 8 horas en milisegundos
        });

        res.status(200).json({
            message: 'Login exitoso.',
            token: token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                roles: roles,
                permisos: permisos,
                nivel: nivel
            }
        });

    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

const logout = (req, res) => {
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
    res.status(200).json({ message: 'Logout exitoso.' });
};

/**
 * Obtener información del usuario actual
 */
const me = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autorizado' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [user] = await conn.query(
            "SELECT id, email, nombre, activo FROM usuarios WHERE id = ?",
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Obtener roles y permisos actualizados
        const { roles, rolesDetalle, permisos, nivel } = await obtenerRolesYPermisos(conn, user.id);

        res.json({
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            activo: user.activo,
            roles: roles,
            rolesDetalle: rolesDetalle,
            permisos: permisos,
            nivel: nivel
        });
    } catch (err) {
        console.error('Error obteniendo usuario actual:', err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { login, logout, me };