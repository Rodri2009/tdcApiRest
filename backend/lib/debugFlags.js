/**
 * Sistema centralizado de logging con flags
 * Uso: node server.js [--verbose|-v] [--error|-e] [--debug|-d] [--help|-h]
 */

/**
 * Generar timestamp en formato ISO
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Log básico: siempre se muestra (peticiones recibidas)
 * @param {string} method - Método HTTP (GET, POST, etc.)
 * @param {string} endpoint - Ruta del endpoint
 * @param {string} [extra] - Información adicional opcional
 */
function logRequest(method, endpoint, extra = '') {
  const timestamp = getTimestamp();
  const extraText = extra ? ` - ${extra}` : '';
  console.log(`[${timestamp}] Petición recibida: ${method} ${endpoint}${extraText}`);
}

/**
 * Log verbose: detalles de procesamiento (solo con -v o -d)
 * @param {string} message - Mensaje a mostrar
 * @param {*} [data] - Datos opcionales para inspeccionar
 */
function logVerbose(message, data = null) {
  if (!flags.verbose && !flags.debug) return;
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] ℹ [VERBOSE]`;
  if (data !== null && typeof data === 'object') {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Log error: errores y excepciones (solo con -e o -d)
 * @param {string} message - Mensaje de error
 * @param {*} [error] - Error object o datos relacionados
 */
function logError(message, error = null) {
  if (!flags.error && !flags.debug) return;
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] ✗ [ERROR]`;
  if (error instanceof Error) {
    console.error(`${prefix} ${message}`);
    console.error(`  Stack: ${error.stack}`);
  } else if (error && typeof error === 'object') {
    console.error(`${prefix} ${message}`, JSON.stringify(error, null, 2));
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Log de operación exitosa (solo con -v o -d)
 * @param {string} message - Mensaje de éxito
 * @param {*} [data] - Datos opcionales
 */
function logSuccess(message, data = null) {
  if (!flags.verbose && !flags.debug) return;
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] ✓ [EXITO]`;
  if (data !== null && typeof data === 'object') {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Log de advertencia (solo con -v o -d)
 * @param {string} message - Mensaje de advertencia
 * @param {*} [data] - Datos opcionales
 */
function logWarning(message, data = null) {
  if (!flags.verbose && !flags.debug) return;
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] ⚠ [ADVERTENCIA]`;
  if (data !== null && typeof data === 'object') {
    console.warn(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.warn(`${prefix} ${message}`);
  }
}

/**
 * Log de consulta a base de datos (solo con -v o -d)
 * @param {string} sql - Consulta SQL
 * @param {*} [params] - Parámetros de la consulta
 */
function logQuery(sql, params = null) {
  if (!flags.verbose && !flags.debug) return;
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] 🔍 [QUERY]`;
  if (params && Array.isArray(params)) {
    console.log(`${prefix} ${sql}`);
    console.log(`  Parámetros:`, params);
  } else {
    console.log(`${prefix} ${sql}`);
  }
}

/**
 * Mostrar mensaje de ayuda
 */
function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║        SISTEMA DE DEPURACIÓN - FLAGS DISPONIBLES              ║
╚════════════════════════════════════════════════════════════════╝

USO:
  node server.js [FLAGS]

FLAGS DISPONIBLES:

  -v, --verbose
    Muestra todos los console.log detallados con timestamps.
    Útil para seguir el flujo de ejecución y procesamiento de datos.
    Ejemplo: [2026-02-20T14:20:27.687Z] ℹ [VERBOSE] Procesando solicitud...

  -e, --error
    Muestra todos los console.error capturados en bloques catch.
    Útil para identificar y registrar errores sin detener la ejecución.
    Ejemplo: [2026-02-20T14:20:27.687Z] ✗ [ERROR] Fallo en conexión a BD

  -d, --debug
    Activa --verbose y --error simultáneamente.
    Modo completo de depuración con todo detallado.
    Recomendado durante desarrollo intenso.

  -h, --help
    Muestra este mensaje de ayuda.

SIN FLAGS (Modo por defecto):
  Solo se muestran las peticiones recibidas con timestamp.
  Ejemplo: [2026-02-20T14:20:27.687Z] Petición recibida: GET /api/solicitudes-bandas

EJEMPLOS DE USO:

  Modo normal (sin depuración):
    $ node server.js

  Solo mostrar errores:
    $ node server.js -e

  Modo verbose (flujo completo):
    $ node server.js -v

  Modo debug completo:
    $ node server.js -d

  Ver esta ayuda:
    $ node server.js --help

COMBINACIONES:
  Puedes combinar -v y -e juntos:
    $ node server.js -v -e

╔════════════════════════════════════════════════════════════════╗
║  Para más información, consulta la documentación del backend.  ║
╚════════════════════════════════════════════════════════════════╝
  `);
}

// ===== AQUÍ SE PARSEAN LOS ARGUMENTOS (DESPUÉS DE DEFINIR LAS FUNCIONES) =====

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);
const flags = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  error: args.includes('--error') || args.includes('-e'),
  debug: args.includes('--debug') || args.includes('-d'),
  help: args.includes('--help') || args.includes('-h')
};

// Si debug está activo, activar verbose y error también
if (flags.debug) {
  flags.verbose = true;
  flags.error = true;
}

// Mostrar ayuda si se solicita
if (flags.help) {
  showHelp();
  process.exit(0);
}

module.exports = {
  // Flags activos
  flags,
  
  // Funciones de logging
  logRequest,
  logVerbose,
  logError,
  logSuccess,
  logWarning,
  logQuery,
  
  // Utilidades
  getTimestamp,
  showHelp
};
