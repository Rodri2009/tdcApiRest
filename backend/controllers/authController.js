const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/emailService');

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
            'config.talleres',
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
    logVerbose('[GENERAR_TOKEN] Generando JWT para usuario id_usuario:', usuario.id_usuario, 'id_cliente:', usuario.id_cliente);
    
    const { roles, permisos, nivel } = obtenerRolYPermisos(usuario.rol);

    const payload = {
        id_usuario: usuario.id_usuario,
        id_cliente: usuario.id_cliente || null,
        nombre: usuario.nombre || '',
        email: usuario.email,
        role: usuario.rol,
        roles: roles,
        permisos: permisos,
        nivel: nivel
    };
    
    logVerbose('[GENERAR_TOKEN] Payload JWT:', JSON.stringify(payload));

    return {
        token: jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' }),
        user: {
            id_usuario: usuario.id_usuario,
            id_cliente: usuario.id_cliente || null,
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
 * Registro manual con email/contraseña - SIN AUTO-LOGIN
 * POST /api/auth/register
 * Body: { nombre, apellido, email, telefono, password }
 * Respuesta: { message, email } - Usuario debe verificar email
 */
const register = async (req, res) => {
    const { nombre, apellido, email, telefono, password, returnTo } = req.body;

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

        // Generar token de verificación (64 caracteres hexadecimales)
        const verification_token = crypto.randomBytes(32).toString('hex');
        // Expiración: 24 horas desde ahora
        const verification_token_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Iniciar transacción
        await conn.beginTransaction();

        try {
            // 1. Crear usuario - email_verified=0, activo=0 hasta verificación
            const insertUsuarioResult = await conn.query(
                "INSERT INTO usuarios (email, password_hash, nombre, rol, activo, email_verified, verification_token, verification_token_expires_at, creado_en) " +
                "VALUES (?, ?, ?, 'cliente', 0, 0, ?, ?, NOW())",
                [email, password_hash, nombre, verification_token, verification_token_expires_at]
            );

            const id_usuario = insertUsuarioResult.insertId;

            // 2. Crear cliente
            await conn.query(
                "INSERT INTO clientes (id_usuario, nombre, telefono, email, creado_por_id_usuario, activo) " +
                "VALUES (?, ?, ?, ?, ?, 0)",
                [id_usuario, nombre, telefono, email, id_usuario]
            );

            await conn.commit();
            logSuccess(`Usuario registrado (pendiente verificación): ${email} (id_usuario: ${id_usuario})`);

            // 3. Enviar email de verificación (con returnTo si existe)
            try {
                await sendVerificationEmail(email, nombre, verification_token, returnTo);
                logSuccess(`Email de verificación enviado a: ${email}`);
            } catch (emailErr) {
                logError(`Error al enviar email a ${email}, pero usuario fue creado:`, emailErr);
                // No retornar error - usuario fue creado, puede verificar después
            }

            // Response: NO DEVOLVEMOS JWT, solo confirmación
            res.status(201).json({
                message: `Te enviamos un email de verificación a ${email}. Por favor revisa tu bandeja de entrada.`,
                email: email,
                requiresVerification: true
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
 * Verifica el email del usuario usando el token de verificación
 * POST /api/auth/verify-email
 * Body: { token }
 * Response: { token, user } - JWT + datos del usuario verificado
 */
const verifyEmail = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Token de verificación requerido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // 1. Buscar usuario con el token
        const [usuario] = await conn.query(
            "SELECT id_usuario, email, nombre, rol, verification_token, verification_token_expires_at FROM usuarios WHERE verification_token = ?",
            [token]
        );

        if (!usuario) {
            return res.status(401).json({ message: 'Token de verificación inválido o expirado.' });
        }

        // 2. Validar que el token no esté expirado
        if (new Date() > new Date(usuario.verification_token_expires_at)) {
            return res.status(401).json({ 
                message: 'Token de verificación expirado. Por favor, solicita uno nuevo.' 
            });
        }

        // 3. Actualizar usuario: email_verified=1, activo=1, consumir token
        await conn.query(
            "UPDATE usuarios SET email_verified = 1, activo = 1, verification_token = NULL, verification_token_expires_at = NULL WHERE id_usuario = ?",
            [usuario.id_usuario]
        );

        // 4. Activar cliente también
        await conn.query(
            "UPDATE clientes SET activo = 1 WHERE id_usuario = ?",
            [usuario.id_usuario]
        );

        logSuccess(`Email verificado: ${usuario.email} (id_usuario: ${usuario.id_usuario})`);

        // 5. Obtener datos completos del usuario verificado
        const [usuarioActualizado] = await conn.query(
            "SELECT u.id_usuario, u.email, u.nombre, u.rol, c.id_cliente FROM usuarios u LEFT JOIN clientes c ON u.id_usuario = c.id_usuario WHERE u.id_usuario = ?",
            [usuario.id_usuario]
        );

        // 6. Generar JWT
        const { token: jwtToken, user: userResponse } = generarToken(usuarioActualizado);

        // Setear cookie
        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas
        });

        res.status(200).json({
            message: '✅ Email verificado exitosamente. ¡Bienvenido!',
            token: jwtToken,
            user: userResponse
        });

    } catch (err) {
        logError('Error en verificación de email:', err);
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
            "SELECT u.id_usuario, u.email, u.password_hash, u.nombre, u.rol, u.activo, u.email_verified, c.id_cliente FROM usuarios u LEFT JOIN clientes c ON u.id_usuario = c.id_usuario WHERE u.email = ?",
            [email]
        );

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Verificar si el email está verificado
        if (user.email_verified === 0) {
            return res.status(401).json({ 
                message: 'Por favor verifica tu email antes de continuar. Revisa tu bandeja de entrada.' 
            });
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
            "SELECT u.id_usuario, u.email, u.nombre, u.rol, c.id_cliente FROM usuarios u " +
            "LEFT JOIN clientes c ON u.id_usuario = c.id_usuario " +
            "WHERE u.proveedor_oauth = ? AND u.id_oauth = ?",
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
            "SELECT u.id_usuario, u.email, u.nombre, u.rol, c.id_cliente FROM usuarios u " +
            "LEFT JOIN clientes c ON u.id_usuario = c.id_usuario WHERE u.email = ?",
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
                "SELECT u.id_usuario, u.email, u.nombre, u.rol, c.id_cliente FROM usuarios u " +
                "LEFT JOIN clientes c ON u.id_usuario = c.id_usuario WHERE u.id_usuario = ?",
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
    verifyEmail,
    oauthCallback,
    obtenerRolYPermisos
};