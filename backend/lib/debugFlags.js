/**
 * Sistema de logging centralizado con niveles de verbosidad
 * Similar a tdcApiRest para consistencia
 */

function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Log de petición recibida
 */
function logRequest(method, endpoint, extra = '') {
    const timestamp = getTimestamp();
    const extraText = extra ? ` - ${extra}` : '';
    console.log(`[${timestamp}] → ${method.padEnd(6)} ${endpoint}${extraText}`);
}

/**
 * Log verbose (solo con DEBUG_VERBOSE=true)
 */
function logVerbose(message, data = null) {
    if (process.env.DEBUG_VERBOSE !== 'true') return;
    const timestamp = getTimestamp();
    const prefix = `[${timestamp}] ℹ`;
    if (data !== null && typeof data === 'object') {
        console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
    } else {
        console.log(`${prefix} ${message}`);
    }
}

/**
 * Log de error (siempre se muestra)
 */
function logError(message, error = null) {
    const timestamp = getTimestamp();
    const prefix = `[${timestamp}] ✗`;
    if (error instanceof Error) {
        console.error(`${prefix} ${message}`, error.message);
    } else if (error && typeof error === 'object') {
        console.error(`${prefix} ${message}`, JSON.stringify(error, null, 2));
    } else {
        console.error(`${prefix} ${message}`);
    }
}

/**
 * Log de éxito
 */
function logSuccess(message, data = null) {
    if (process.env.DEBUG_VERBOSE !== 'true') return;
    const timestamp = getTimestamp();
    const prefix = `[${timestamp}] ✓`;
    if (data !== null && typeof data === 'object') {
        console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
    } else {
        console.log(`${prefix} ${message}`);
    }
}

/**
 * Log de advertencia
 */
function logWarning(message, data = null) {
    if (process.env.DEBUG_VERBOSE !== 'true') return;
    const timestamp = getTimestamp();
    const prefix = `[${timestamp}] ⚠`;
    if (data !== null && typeof data === 'object') {
        console.warn(`${prefix} ${message}`, JSON.stringify(data, null, 2));
    } else {
        console.warn(`${prefix} ${message}`);
    }
}

// Objeto de flags para middleware
const flags = {
    verbose: process.env.DEBUG_VERBOSE === 'true',
    debug: process.env.DEBUG_MODE === 'true'
};

module.exports = {
    flags,
    logRequest,
    logVerbose,
    logError,
    logSuccess,
    logWarning
};
