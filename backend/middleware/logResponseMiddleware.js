/**
 * Middleware para interceptar y registrar respuestas JSON
 * Automáticamente loguea las respuestas de todos los endpoints
 */

const { logResponse, logSeparator, flags } = require('../lib/debugFlags');

module.exports = (req, res, next) => {
    // Guardar el método original de res.json
    const originalJson = res.json.bind(res);
    
    // Reemplazar res.json para interceptar y loguear
    res.json = function(data) {
        // Loguear respuesta si verbose o debug está activado
        if (flags.verbose || flags.debug) {
            const timestamp = new Date().toISOString();
            const statusCode = res.statusCode || 200;
            console.log(`[${timestamp}] 📤 [RESPUESTA] ${req.originalUrl} (HTTP ${statusCode})`);
            console.log(JSON.stringify(data, null, 2));
            console.log(''); // Separador
        }
        
        // Llamar al método original de json
        return originalJson(data);
    };
    
    // Guardar el método original de res.send
    const originalSend = res.send.bind(res);
    
    // Reemplazar res.send para interceptar y loguear
    res.send = function(data) {
        // Loguear respuesta si es JSON y verbose o debug está activado
        if ((flags.verbose || flags.debug) && typeof data === 'object') {
            const timestamp = new Date().toISOString();
            const statusCode = res.statusCode || 200;
            console.log(`[${timestamp}] 📤 [RESPUESTA] ${req.originalUrl} (HTTP ${statusCode})`);
            console.log(JSON.stringify(data, null, 2));
            console.log(''); // Separador
        }
        
        // Llamar al método original de send
        return originalSend(data);
    };
    
    next();
};
