const tokenManager = require('../lib/tokenManager');
const { logWarning, logSuccess } = require('../lib/debugFlags');

/**
 * Middleware de autenticación JWT mejorado
 * - Valida token access
 * - Verifica contra blacklist
 * - Expone req.user con permisos
 * - Soporta token desde Authorization header, cookies, o query strings (para EventSource/SSE)
 */
const protect = (req, res, next) => {
    try {
        // Extraer token (primero desde extractToken estándar)
        let token = tokenManager.extractToken(req);

        // Si no hay token en header/cookie, intentar desde query string (para EventSource)
        if (!token && req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                error: 'No autorizado',
                message: 'No se encontró token de autenticación',
                required: 'Authorization header, cookie accessToken, o parámetro ?token='
            });
        }

        // Verificar token
        const decoded = tokenManager.verifyToken(token, 'access');
        if (!decoded) {
            return res.status(401).json({
                error: 'Token inválido o expirado',
                message: 'El token no es válido o ha expirado'
            });
        }

        // Exponer información del usuario
        req.user = decoded;
        req.token = token;

        logSuccess(`[authMiddleware] ✅ User autenticado: ${decoded.id} (${decoded.role})`);
        next();
    } catch (error) {
        logWarning('[authMiddleware] Error en middleware:', error.message);
        return res.status(500).json({
            error: 'Error en autenticación'
        });
    }
};

/**
 * Valida que el usuario sea un rol específico
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'No autenticado'
            });
        }

        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Acceso denegado',
                message: `Se requiere uno de estos roles: ${roles.join(', ')}`,
                userRole: req.user.role
            });
        }

        next();
    };
};

module.exports = {
    protect,
    requireRole
};
