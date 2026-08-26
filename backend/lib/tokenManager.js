const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutos
const REFRESH_TOKEN_EXPIRY = '7d';  // 7 días

/**
 * Genera un JWT access token
 * @param {Object} payload - Datos del usuario (id, email, role, etc)
 * @returns {string} Token JWT
 */
function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        algorithm: 'HS256'
    });
}

/**
 * Genera un JWT refresh token (de larga duración)
 * @param {Object} payload - Datos del usuario
 * @returns {string} Refresh token JWT
 */
function generateRefreshToken(payload) {
    const refreshPayload = {
        ...payload,
        type: 'refresh'
    };

    return jwt.sign(refreshPayload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        algorithm: 'HS256'
    });
}

/**
 * Genera ambos tokens (acceso y refresco)
 * @param {Object} userData - Datos del usuario {id, email, role, permisos}
 * @returns {Object} {accessToken, refreshToken, expiresIn}
 */
function generateTokenPair(userData) {
    const accessToken = generateAccessToken(userData);
    const refreshToken = generateRefreshToken(userData);

    return {
        accessToken,
        refreshToken,
        expiresIn: convertExpiryToSeconds(ACCESS_TOKEN_EXPIRY),
        tokenType: 'Bearer'
    };
}

/**
 * Verifica un JWT token
 * @param {string} token - Token a verificar
 * @param {string} type - 'access' o 'refresh'
 * @returns {Object|null} Payload del token o null si es inválido
 */
function verifyToken(token, type = 'access') {
    try {
        const secret = type === 'refresh'
            ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
            : process.env.JWT_SECRET;

        const decoded = jwt.verify(token, secret);

        // Validar que sea del tipo correcto
        if (type === 'refresh' && decoded.type !== 'refresh') {
            return null;
        }
        if (type === 'access' && decoded.type === 'refresh') {
            return null;
        }

        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Decodifica un token sin verificar firma (para debugging)
 * @param {string} token
 * @returns {Object|null}
 */
function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
}

/**
 * Convierte formato de expiración (ej: "15m") a segundos
 * @param {string} expiry - Formato: "15m", "7d", "1h", etc
 * @returns {number} Segundos
 */
function convertExpiryToSeconds(expiry) {
    const units = {
        's': 1,
        'm': 60,
        'h': 3600,
        'd': 86400
    };

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15m

    return parseInt(match[1]) * units[match[2]];
}

/**
 * Obtiene información del token desde header o cookie
 * @param {Object} req - Request object
 * @returns {string|null} Token o null
 */
function extractToken(req) {
    // Bearer token en Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Token en cookie
    if (req.cookies?.accessToken) {
        return req.cookies.accessToken;
    }

    return null;
}

/**
 * Extrae refresh token de cookies o body
 * @param {Object} req
 * @returns {string|null}
 */
function extractRefreshToken(req) {
    // Cookie de refresh token
    if (req.cookies?.refreshToken) {
        return req.cookies.refreshToken;
    }

    // Body (POST)
    if (req.body?.refreshToken) {
        return req.body.refreshToken;
    }

    return null;
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyToken,
    decodeToken,
    convertExpiryToSeconds,
    extractToken,
    extractRefreshToken,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY
};
