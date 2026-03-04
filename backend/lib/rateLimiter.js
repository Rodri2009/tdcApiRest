/**
 * Rate Limiter por usuario JWT
 * Limita requests por usuario en ventanas de tiempo específicas
 */

class RateLimiter {
    constructor() {
        // Estructura: { userId: { requests: [], windowStart: timestamp } }
        this.buckets = new Map();

        // Configuración por rol (requests por ventana)
        this.limits = {
            'admin': { requests: 1000, window: 60000 },        // 1000 en 1 minuto
            'user': { requests: 500, window: 60000 },          // 500 en 1 minuto
            'readonly': { requests: 300, window: 60000 },      // 300 en 1 minuto
            'api': { requests: 100, window: 60000 }            // 100 en 1 minuto
        };

        // Limpiar buckets cada 5 minutos
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Registra un request y verifica si está dentro del límite
     * @param {string} userId - ID único del usuario
     * @param {string} role - Rol del usuario
     * @returns {Object} {allowed: boolean, remaining: number, retryAfter: number}
     */
    checkLimit(userId, role = 'user') {
        const limit = this.limits[role] || this.limits['user'];
        const now = Date.now();

        // Obtener o crear bucket del usuario
        if (!this.buckets.has(userId)) {
            this.buckets.set(userId, {
                requests: [],
                windowStart: now,
                role: role
            });
        }

        const bucket = this.buckets.get(userId);

        // Si la ventana expiró, resetear
        if (now - bucket.windowStart >= limit.window) {
            bucket.requests = [];
            bucket.windowStart = now;
        }

        // Usar timestamps en la ventana actual
        const currentWindow = now - bucket.windowStart;
        bucket.requests.push(now);

        // Limpiar requests, mantener solo los dentro de esta ventana
        bucket.requests = bucket.requests.filter(
            ts => (now - ts) < limit.window
        );

        const requestCount = bucket.requests.length;
        const allowed = requestCount <= limit.requests;
        const remaining = Math.max(0, limit.requests - requestCount);

        return {
            allowed,
            remaining,
            limit: limit.requests,
            window: limit.window,
            retryAfter: allowed ? null : Math.ceil((limit.window - currentWindow) / 1000)
        };
    }

    /**
     * Middleware Express para rate limiting
     * @returns {Function}
     */
    middleware() {
        return (req, res, next) => {
            // Si no hay autenticación, usar IP como identificador
            const userId = req.user?.id || req.ip;
            const role = req.user?.role || 'guest';

            const result = this.checkLimit(userId, role);

            // Headers informativos
            res.setHeader('X-RateLimit-Limit', result.limit);
            res.setHeader('X-RateLimit-Remaining', result.remaining);
            res.setHeader('X-RateLimit-Window', result.window);

            if (!result.allowed) {
                res.setHeader('Retry-After', result.retryAfter);
                return res.status(429).json({
                    error: 'Demasiadas solicitudes',
                    message: `Límite de rate: ${result.limit} requests por ${result.window}ms`,
                    retryAfter: result.retryAfter
                });
            }

            next();
        };
    }

    /**
     * Limpia buckets inactivos
     */
    cleanup() {
        const now = Date.now();
        const BUCKET_TTL = 30 * 60 * 1000; // Mantener aunque no haya requests por 30 min

        for (const [userId, bucket] of this.buckets.entries()) {
            if (now - bucket.windowStart > BUCKET_TTL) {
                this.buckets.delete(userId);
            }
        }
    }

    /**
     * Obtiene estadísticas de un usuario
     * @param {string} userId
     * @returns {Object|null}
     */
    getStats(userId) {
        const bucket = this.buckets.get(userId);
        if (!bucket) return null;

        const now = Date.now();
        const currentWindow = now - bucket.windowStart;
        const activeRequests = bucket.requests.filter(ts => (now - ts) < bucket.window).length;

        return {
            userId,
            role: bucket.role,
            requests: activeRequests,
            windowElapsed: currentWindow,
            windowTTL: bucket.window - currentWindow
        };
    }

    /**
     * Resetea el límite de un usuario (e.g., después de logout)
     * @param {string} userId
     */
    reset(userId) {
        this.buckets.delete(userId);
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

// Instancia global del limiter
const globalLimiter = new RateLimiter();

module.exports = {
    RateLimiter,
    globalLimiter,
    middleware: () => globalLimiter.middleware()
};
