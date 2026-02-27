const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
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
            'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar', 'usuarios.asignar_roles',
            'solicitudes.ver', 'solicitudes.crear', 'solicitudes.editar', 'solicitudes.eliminar', 'solicitudes.cambiar_estado',
            'configuracion.ver', 'configuracion.editar',
            'config.alquiler', 'config.talleres', 'config.servicios', 'config.bandas',
            'personal.ver', 'personal.gestionar',
            'reportes.ver'
        ],
        staff: [
            'solicitudes.ver', 'solicitudes.editar', 'solicitudes.cambiar_estado',
            'configuracion.ver',
            'personal.ver',
            'reportes.ver'
        ],
        staff_readonly: [
            'solicitudes.ver',
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
        staff_readonly: 50,
        cliente: 10
    };

    return {
        roles: [rol],
        permisos: permisosPorRol[rol] || [],
        nivel: nivelesPorRol[rol] || 0
    };
};

/**
 * Genera un JWT token
 */
const generarToken = (usuario) => {
    const { roles, permisos, nivel } = obtenerRolYPermisos(usuario.rol);

    const payload = {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre || '',
        email: usuario.email,
        role: usuario.rol,
        roles: roles,
        permisos: permisos,
        nivel: nivel
    };

    return {
        token: jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' }),
        user: {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol,
            roles: roles,
            permisos: permisos,
            nivel: nivel
        }
    };
};

/**
 * Registro manual con email/contraseña
 * POST /api/auth/register
 * Body: { nombre, apellido, email, telefono, password }
 */
const register = async (req, res) => {
    const { nombre, apellido, email, telefono, password } = req.body;

    // Validar campos
    if (!nombre || !email || !telefono || !password) {
        return res.status(400).json({
            message: 'Todos los campos son requeridos (nombre, email, telefono, password).'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: 'La contraseña debe tener al menos 6 caracteres.'
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Verificar que email no exista
        const [existingUser] = await conn.query(
            "SELECT id_usuario FROM usuarios WHERE email = ?",
            [email]
        );

        if (existingUser) {
            return res.status(409).json({ message: 'El email ya está registrado.' });
        }

        // Hash la contraseña
        const password_hash = await bcrypt.hash(password, 10);

        // Iniciar transacción
        await conn.beginTransaction();

        try {
            // 1. Crear usuario
            const insertUsuarioResult = await conn.query(
                "INSERT INTO usuarios (email, password_hash, nombre, rol, activo, creado_en) " +
                "VALUES (?, ?, ?, 'cliente', 1, NOW())",
                [email, password_hash, nombre]
            );

            const id_usuario = insertUsuarioResult.insertId;

            // 2. Crear cliente
            await conn.query(
                "INSERT INTO clientes (id_usuario, nombre, telefono, email, creado_por_id_usuario, activo) " +
                "VALUES (?, ?, ?, ?, ?, 1)",
                [id_usuario, nombre, telefono, email, id_usuario]
            );

            await conn.commit();
            logSuccess(`Usuario registrado: ${email} (id_usuario: ${id_usuario})`);

            // Obtener datos completos del usuario
            const [nuevoUsuario] = await conn.query(
                "SELECT id_usuario, email, nombre, rol FROM usuarios WHERE id_usuario = ?",
                [id_usuario]
            );

            // Generar token
            const { token, user } = generarToken(nuevoUsuario);

            // Setear cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 8 * 60 * 60 * 1000 // 8 horas
            });

            res.status(201).json({
                message: 'Registro exitoso.',
                token: token,
                user: user
            });

        } catch (transactionErr) {
            await conn.rollback();
            throw transactionErr;
        }

    } catch (err) {
        logError('Error en registro:', err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Login con email/contraseña
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [user] = await conn.query(
            "SELECT id_usuario, email, password_hash, nombre, rol, activo FROM usuarios WHERE email = ?",
            [email]
        );

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Verificar si el usuario está activo
        if (user.activo === 0) {
            return res.status(401).json({ message: 'Usuario desactivado. Contacte al administrador.' });
        }

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Generar token
        const { token, user: userResponse } = generarToken(user);

        // Setear cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas
        });

        res.status(200).json({
            message: 'Login exitoso.',
            token: token,
            user: userResponse
        });

    } catch (err) {
        logError('Error en login:', err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Login/Register con OAuth
 * POST /api/auth/oauth-callback
 * Body: { proveedor_oauth ('google'|'facebook'|'instagram'), id_oauth, email, nombre, apellido, foto_url, telefono? }
 */
const oauthCallback = async (req, res) => {
    const { proveedor_oauth, id_oauth, email, nombre, apellido, foto_url, telefono } = req.body;

    console.log('[OAUTH-CALLBACK] Iniciando...');
    console.log('[OAUTH-CALLBACK] Datos recibidos:', { proveedor_oauth, id_oauth, email, nombre });

    // Validar campos
    if (!proveedor_oauth || !id_oauth || !email) {
        console.error('[OAUTH-CALLBACK] ERROR: Campos faltantes');
        return res.status(400).json({
            message: 'Campos requeridos faltantes: proveedor_oauth, id_oauth, email.'
        });
    }

    if (!['google', 'facebook', 'instagram'].includes(proveedor_oauth)) {
        console.error('[OAUTH-CALLBACK] ERROR: Proveedor inválido:', proveedor_oauth);
        return res.status(400).json({
            message: 'Proveedor OAuth inválido. Use: google, facebook, instagram.'
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // 1. Buscar usuario existente por (proveedor_oauth, id_oauth) - LOGIN OAUTH CONOCIDO
        console.log('[OAUTH-CALLBACK] Buscando por proveedor_oauth + id_oauth...');
        const [existingOAuthUser] = await conn.query(
            "SELECT id_usuario, email, nombre, rol FROM usuarios " +
            "WHERE proveedor_oauth = ? AND id_oauth = ?",
            [proveedor_oauth, id_oauth]
        );

        if (existingOAuthUser) {
            console.log('[OAUTH-CALLBACK] ✓ Usuario OAuth encontrado:', existingOAuthUser.email);
            logVerbose(`OAuth login existente: ${proveedor_oauth} / ${id_oauth}`);

            // Generar token para usuario existente
            const { token, user: userResponse } = generarToken(existingOAuthUser);

            // Setear cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 8 * 60 * 60 * 1000 // 8 horas
            });

            console.log('[OAUTH-CALLBACK] ✓ Login exitoso (OAuth conocido)');
            return res.status(200).json({
                message: 'Login exitoso (OAuth).',
                token: token,
                user: userResponse
            });
        }

        console.log('[OAUTH-CALLBACK] No encontrado por OAuth. Buscando por email...');

        // 2. Buscar usuario existente por EMAIL - LINKEAR OAUTH A CUENTA EXISTENTE
        const [existingEmailUser] = await conn.query(
            "SELECT id_usuario, email, nombre, rol FROM usuarios WHERE email = ?",
            [email]
        );

        if (existingEmailUser) {
            console.log('[OAUTH-CALLBACK] ✓ Usuario por email encontrado:', existingEmailUser.email);
            console.log('[OAUTH-CALLBACK] Linkeando OAuth a cuenta existente...');
            logVerbose(`Usuario existente encontrado por email: ${email}. Linkeando OAuth...`);

            // Actualizar el usuario para linkear la credencial OAuth
            await conn.query(
                "UPDATE usuarios SET proveedor_oauth = ?, id_oauth = ?, foto_url = ? WHERE id_usuario = ?",
                [proveedor_oauth, id_oauth, foto_url || null, existingEmailUser.id_usuario]
            );

            console.log('[OAUTH-CALLBACK] ✓ OAuth linkeado exitosamente');
            logSuccess(`OAuth linkeado a usuario existente: ${email}`);

            // Generar token para usuario existente
            const { token, user: userResponse } = generarToken(existingEmailUser);

            // Setear cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 8 * 60 * 60 * 1000 // 8 horas
            });

            console.log('[OAUTH-CALLBACK] ✓ Login exitoso (OAuth linkeado a cuenta)');
            return res.status(200).json({
                message: 'Login exitoso (OAuth linkeado a cuenta existente).',
                token: token,
                user: userResponse
            });
        }

        console.log('[OAUTH-CALLBACK] Usuario no existe. Creando nuevo usuario + cliente...');

        // 3. Crear nuevo usuario + cliente (NO EXISTE POR EMAIL NI OAUTH)
        await conn.beginTransaction();

        try {
            // Crear usuario
            const insertUsuarioResult = await conn.query(
                "INSERT INTO usuarios (email, nombre, proveedor_oauth, id_oauth, foto_url, rol, activo, creado_en) " +
                "VALUES (?, ?, ?, ?, ?, 'cliente', 1, NOW())",
                [email, nombre || '', proveedor_oauth, id_oauth, foto_url || null]
            );

            const id_usuario = insertUsuarioResult.insertId;
            console.log('[OAUTH-CALLBACK] ✓ Usuario creado con ID:', id_usuario);

            // Crear cliente
            await conn.query(
                "INSERT INTO clientes (id_usuario, nombre, telefono, email, creado_por_id_usuario, activo) " +
                "VALUES (?, ?, ?, ?, ?, 1)",
                [id_usuario, nombre || '', telefono || '', email, id_usuario]
            );

            console.log('[OAUTH-CALLBACK] ✓ Cliente creado');
            await conn.commit();
            logSuccess(`Usuario OAuth creado: ${email} (${proveedor_oauth})`);

            // Obtener datos completos del usuario
            const [nuevoUsuario] = await conn.query(
                "SELECT id_usuario, email, nombre, rol FROM usuarios WHERE id_usuario = ?",
                [id_usuario]
            );

            // Generar token
            const { token, user: userResponse } = generarToken(nuevoUsuario);

            // Setear cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 8 * 60 * 60 * 1000 // 8 horas
            });

            console.log('[OAUTH-CALLBACK] ✓ Registro OAuth exitoso');
            res.status(201).json({
                message: 'Registro OAuth exitoso.',
                token: token,
                user: userResponse
            });

        } catch (transactionErr) {
            console.error('[OAUTH-CALLBACK] ERROR en transacción:', transactionErr.message);
            await conn.rollback();
            throw transactionErr;
        }

    } catch (err) {
        console.error('[OAUTH-CALLBACK] ERROR general:', err.code, err.message);
        logError('Error en oauthCallback:', err);

        // Manejo específico de violación de constraint único
        if (err.code === 'ER_DUP_ENTRY') {
            console.error('[OAUTH-CALLBACK] ERROR: Email duplicado o constraint violado');
            return res.status(409).json({ message: 'Email ya registrado con otro proveedor.' });
        }

        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtener información del usuario actual
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token> o cookies
 */
const me = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autorizado' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [user] = await conn.query(
            "SELECT id_usuario, email, nombre, rol, activo FROM usuarios WHERE id_usuario = ?",
            [req.user.id_usuario]
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Obtener rol y permisos
        const { roles, permisos, nivel } = obtenerRolYPermisos(user.rol);

        res.json({
            id_usuario: user.id_usuario,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            activo: user.activo,
            roles: roles,
            permisos: permisos,
            nivel: nivel
        });
    } catch (err) {
        logError('Error obteniendo usuario actual:', err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = (req, res) => {
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
    res.status(200).json({ message: 'Logout exitoso.' });
};

module.exports = {
    login,
    logout,
    me,
    register,
    oauthCallback,
    obtenerRolYPermisos
};