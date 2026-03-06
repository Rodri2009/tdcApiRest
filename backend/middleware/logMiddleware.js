/**
 * Middleware de logging automático que etiqueta por servicio
 * 
 * Identifica el servicio basado en la ruta:
 * - /api/mercadopago/* → [MP]
 * - /api/whatsapp/* → [WA]
 * - /api/* → [TDC]
 */

function getServiceTag(pathname) {
    if (pathname.startsWith('/api/mercadopago')) return '[MP]';
    if (pathname.startsWith('/api/whatsapp')) return '[WA]';
    if (pathname.startsWith('/api/')) return '[TDC]';
    return '[API]';
}

/**
 * Middleware que etiqueta automáticamente los logs
 */
function logMiddleware(req, res, next) {
    const service = getServiceTag(req.path);
    const timestamp = new Date().toISOString();

    // Guardar el servicio en req para que los controladores puedan usarlo
    req.logService = service;

    // Log de request al inicio
    const method = req.method.padEnd(6);
    const endpoint = req.path;
    const userInfo = req.user ? ` [user:${req.user.id}]` : '';

    console.log(`[${timestamp}] ${service} → ${method} ${endpoint}${userInfo}`);

    // Interceptar el método res.json para loguear la respuesta
    const originalJson = res.json.bind(res);
    res.json = function (data) {
        const statusCode = res.statusCode;
        const statusEmoji = statusCode < 400 ? '✓' : '✗';
        console.log(`[${new Date().toISOString()}] ${service} ← ${statusEmoji} ${statusCode} ${endpoint}`);
        return originalJson(data);
    };

    // Interceptar el método res.send para loguear respuestas no-JSON
    const originalSend = res.send.bind(res);
    res.send = function (data) {
        const statusCode = res.statusCode;
        const statusEmoji = statusCode < 400 ? '✓' : '✗';
        console.log(`[${new Date().toISOString()}] ${service} ← ${statusEmoji} ${statusCode} ${endpoint}`);
        return originalSend(data);
    };

    next();
}

module.exports = {
    logMiddleware,
    getServiceTag
};
