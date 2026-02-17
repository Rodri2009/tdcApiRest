const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Obtiene el rol y permisos de un usuario basado en el campo 'rol' de usuarios
 * Sistema simplificado sin tablas adicionales de roles/permisos
 */
const obtenerRolYPermisos = (rol) => {
    // Definir permisos por rol (formato: recurso.accion)
    const permisosPorRol = {
        admin: [
            // Usuarios
            'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar', 'usuarios.asignar_roles',
            // Solicitudes
            'solicitudes.ver', 'solicitudes.crear', 'solicitudes.editar', 'solicitudes.eliminar',
            // Configuración general
            'configuracion.ver', 'configuracion.editar',
            // Configuración específica por módulo
            'config.alquiler', 'config.talleres', 'config.servicios', 'config.bandas',
            // Personal
            'personal.ver', 'personal.gestionar',
            // Reportes
            'reportes.ver'
        ],
        staff: [
            'solicitudes.ver', 'solicitudes.editar',
            'configuracion.ver',
            'personal.ver',
            'reportes.ver'
        ],
        cliente: [
            'solicitudes.ver_propias', 'solicitudes.crear'
        ]
    };

    const nivelesPorRol = {
        admin: 100,
        staff: 50,
        cliente: 10
    };

    return {
        roles: [rol],
        permisos: permisosPorRol[rol] || [],
        nivel: nivelesPorRol[rol] || 0
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
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Verificar si el usuario está activo
        if (user.activo === 0) {
            return res.status(401).json({ message: 'Usuario desactivado. Contacte al administrador.' });
        }

        // Depuración: Verificar contraseña proporcionada y hash almacenado
        console.log('Contraseña proporcionada:', password);
        console.log('Hash almacenado:', user.password_hash);

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Obtener rol y permisos basado en el campo 'rol'
        const { roles, permisos, nivel } = obtenerRolYPermisos(user.rol);

        // --- Creación del Token JWT ---
        const payload = {
            id: user.id,
            email: user.email,
            role: user.rol,
            roles: roles,
            permisos: permisos,
            nivel: nivel
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        // --- Envío del Token en una Cookie HttpOnly ---
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas
        });

        res.status(200).json({
            message: 'Login exitoso.',
            token: token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
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
            "SELECT id, email, nombre, rol, activo FROM usuarios WHERE id = ?",
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Obtener rol y permisos
        const { roles, permisos, nivel } = obtenerRolYPermisos(user.rol);

        res.json({
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            activo: user.activo,
            roles: roles,
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