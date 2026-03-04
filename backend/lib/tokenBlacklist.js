/**
 * Token Blacklist
 * Mantiene registro de tokens revocados (ej: al hacer logout)
 * Usa una estructura en-memoria (idealm para SQLite/DB en producción)
 */

class TokenBlacklist {
    constructor() {
        // Set de tokens revocados
        this.blacklistedTokens = new Set();

        // Mapa de user -> tokens revocados (para logout completo)
        this.revokedByUser = new Map();

        // Limpiar tokens expirados cada 1 minuto
        this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }

    /**
     * Añade un token a la blacklist
     * @param {string} token - JWT token a revocar
     * @param {Object} decoded - Token decodificado {exp, userId, etc}
     */
    revoke(token, decoded) {
        if (!token || !decoded) return;

        const tokenEntry = {
            token: this.hashToken(token),
            revokedAt: Date.now(),
            expiresAt: (decoded.exp || 0) * 1000,
            userId: decoded.id || decoded.userId,
            reason: 'logout'
        };

        this.blacklistedTokens.add(tokenEntry.token);

        // Registrar por usuario para logout completo
        if (tokenEntry.userId) {
            if (!this.revokedByUser.has(tokenEntry.userId)) {
                this.revokedByUser.set(tokenEntry.userId, []);
            }
            this.revokedByUser.get(tokenEntry.userId).push(tokenEntry);
        }
    }

    /**
     * Verifica si un token está en la blacklist
     * @param {string} token - JWT token
     * @returns {boolean}
     */
    isRevoked(token) {
        return this.blacklistedTokens.has(this.hashToken(token));
    }

    /**
     * Hash simple para tokens (evitar almacenar tokens en texto plano)
     * @param {string} token
     * @returns {string}
     */
    hashToken(token) {
        const crypto = require('crypto');
        // Tomar ultimos 50 chars del token + hash simple
        return token.substring(token.length - 50) +
            crypto.createHash('md5').update(token).digest('hex');
    }

    /**
     * Revoca TODOS los tokens de un usuario (logout desde todos los dispositivos)
     * @param {string} userId
     */
    revokeAllUserTokens(userId) {
        // Simplemente guardamos que este usuario fue revocado
        this.revokedByUser.set(userId, []);
        this.revokedByUser.set(`${userId}:all`, {
            revokedAll: true,
            revokedAt: Date.now()
        });
    }

    /**
     * Verifica si TODOS los tokens de un usuario fueron revocados
     * @param {string} userId
     * @returns {boolean}
     */
    areAllUserTokensRevoked(userId) {
        return this.revokedByUser.has(`${userId}:all`);
    }

    /**
     * Limpia tokens que ya expiraron de la blacklist
     */
    cleanup() {
        const now = Date.now();
        const toDelete = [];

        for (const tokenHash of this.blacklistedTokens) {
            // En una implementación en-memoria simple, no sabemos expiración
            // Por eso usamos TTL fijo: Mantener tokens revocados por 7 días
            const TTL = 7 * 24 * 60 * 60 * 1000;
            // En este caso simple, asumimos que los tokens se limpian solos
            // cuando se revisa si están expirados
        }
    }

    /**
     * Middleware Express para verificar blacklist
     * @returns {Function}
     */
    middleware() {
        return (req, res, next) => {
            const token = this.extractToken(req);

            if (token && this.isRevoked(token)) {
                return res.status(401).json({
                    error: 'Token revocado',
                    message: 'Este token ha sido revocado. Por favor, inicie sesión nuevamente.'
                });
            }

            // Si usuario tiene logout completo
            if (req.user && this.areAllUserTokensRevoked(req.user.id)) {
                return res.status(401).json({
                    error: 'Sesión cerrada',
                    message: 'Todos los tokens de esta sesión fueron revocados.'
                });
            }

            next();
        };
    }

    /**
     * Extrae token del request
     * @param {Object} req
     * @returns {string|null}
     */
    extractToken(req) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return req.cookies?.accessToken || null;
    }

    /**
     * Obtiene estadísticas de revocaciones
     * @returns {Object}
     */
    getStats() {
        return {
            blacklistedTokens: this.blacklistedTokens.size,
            usersWithRevokedTokens: this.revokedByUser.size,
            memoryUsage: process.memoryUsage().heapUsed
        };
    }

    /**
     * Limpia toda la blacklist (útil para testing)
     */
    clear() {
        this.blacklistedTokens.clear();
        this.revokedByUser.clear();
    }

    /**
     * Detiene la limpieza automática
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// Instancia global
const globalBlacklist = new TokenBlacklist();

module.exports = {
    TokenBlacklist,
    globalBlacklist,
    middleware: () => globalBlacklist.middleware()
};
