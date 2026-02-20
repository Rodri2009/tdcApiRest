const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
// NOTA: Asegúrate de haber eliminado la línea: require('dotenv').config();
// como hablamos antes, para evitar conflictos con las variables de Docker.

const pool = require('./db');
const { logRequest, logVerbose, logError, logWarning, logSuccess } = require('./lib/debugFlags');
const logResponseMiddleware = require('./middleware/logResponseMiddleware');

const app = express();
const port = process.env.PORT || 3000;

// --- Middlewares ---
// Aumento límite para aceptar payloads con imágenes en base64 (ej. url_flyer)
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser()); // <-- USAR
// También limitar urlencoded para paridad
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Capturar errores de body-parser (PayloadTooLarge) y devolver 413 legible
app.use((err, req, res, next) => {
    if (err && (err.type === 'entity.too.large' || /request entity too large/i.test(err.message || ''))) {
        logWarning(`Payload demasiado grande en ${req.method} ${req.originalUrl}`, err.message);
        return res.status(413).json({ error: 'Payload demasiado grande. Suba imágenes mediante /api/uploads o reduzca el tamaño del archivo.' });
    }
    next(err);
});

// App-level normalization for legacy payload keys targeting admin eventos_confirmados
// This guarantees legacy keys (fecha, nombre_banda, aforo_maximo, nombre_contacto, precio_puerta)
// are normalized BEFORE any route handler can read req.body (defensive fix for intermittent legacy paths).
app.use((req, res, next) => {
    try {
        // Only apply to admin eventos_confirmados endpoints (any method)
        if (req.path && req.path.match(/^\/api\/admin\/eventos_confirmados\/\d+/)) {
            const b = req.body || {};
            let changed = false;
            if (typeof b.fecha !== 'undefined' && typeof b.fecha_evento === 'undefined') { b.fecha_evento = b.fecha; changed = true; delete b.fecha; }
            if (typeof b.nombre_banda !== 'undefined' && typeof b.nombre_evento === 'undefined') { b.nombre_evento = b.nombre_banda; changed = true; delete b.nombre_banda; }
            if (typeof b.aforo_maximo !== 'undefined' && typeof b.cantidad_personas === 'undefined') { b.cantidad_personas = b.aforo_maximo; changed = true; delete b.aforo_maximo; }
            if (typeof b.nombre_contacto !== 'undefined' && typeof b.nombre_cliente === 'undefined') { b.nombre_cliente = b.nombre_contacto; changed = true; delete b.nombre_contacto; }
            if (typeof b.precio_puerta !== 'undefined' && typeof b.precio_final === 'undefined') { b.precio_final = b.precio_puerta; changed = true; delete b.precio_puerta; }
            if (changed) logVerbose('Normalized legacy payload keys', { method: req.method, path: req.path, keys: Object.keys(b) });
            req.body = b;
        }
    } catch (err) {
        logError('Fallo al normalizar legacy payload keys', err.message);
    }
    next();
});

// NOTE: Legacy endpoints are intentionally blocked at the nginx layer.
// No runtime catch-all handlers nor tracing should remain here. Remove temporary debugging middleware when confirmed.

// Servir archivos estáticos del frontend
app.use(express.static('frontend'));
// Servir uploads (logos, fotos) desde /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de logging con flags de depuración
app.use((req, res, next) => {
    logRequest(req.method, req.originalUrl);
    logVerbose(`Query params: ${JSON.stringify(req.query)}`);
    logVerbose(`Body recibido: ${JSON.stringify(req.body)}`);
    next();
});

// Middleware para interceptar y loguear respuestas JSON
app.use(logResponseMiddleware);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// --- Rutas de la API ---
logSuccess("INICIANDO BACKEND");
logVerbose("Cargando rutas de la API...");
try {
    const opcionesRoutes = require('./routes/opcionesRoutes');
    const solicitudesRoutes = require('./routes/solicitudRoutes');
    const testRoutes = require('./routes/testRoutes');
    const authRoutes = require('./routes/authRoutes');
    const adminRoutes = require('./routes/adminRoutes');
    const bandaRoutes = require('./routes/bandaRoutes'); // NUEVO: Bandas refactorizado (3NF)
    const solicitudFechaBandaRoutes = require('./routes/solicitudFechaBandaRoutes'); // NUEVO: Solicitudes de fechas/shows
    const bandasRoutes = require('./routes/bandasRoutes'); // Legacy
    const ticketsRoutes = require('./routes/ticketsRoutes');
    const talleresRoutes = require('./routes/talleresRoutes');
    const serviciosRoutes = require('./routes/serviciosRoutes');
    const usuariosRoutes = require('./routes/usuariosRoutes');
    const eventosRoutes = require('./routes/eventosRoutes');
    const uploadsRoutes = require('./routes/uploadsRoutes');
    const mercadopagoRoutes = require('./routes/mercadopagoRoutes'); // NUEVO: Integración Mercado Pago
    const whatsappRoutes = require('./routes/whatsappRoutes'); // NUEVO: Integración WhatsApp

    app.use('/api/opciones', opcionesRoutes);
    app.use('/api/solicitudes', solicitudesRoutes);
    app.use('/api/test', testRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);

    // NUEVAS RUTAS (refactored 3NF)
    app.use('/api/bandas', bandaRoutes); // GET, POST, PUT, DELETE para bandas_artistas
    app.use('/api/solicitudes-fechas-bandas', solicitudFechaBandaRoutes); // GET, POST, PUT, DELETE para solicitudes_fechas_bandas

    // Legacy (mantener por compatibilidad)
    // app.use('/api/bandas', bandasRoutes); // COMENTADO: usar nueva estructura

    app.use('/api/tickets', ticketsRoutes);
    app.use('/api/talleres', talleresRoutes);
    app.use('/api/servicios', serviciosRoutes);
    app.use('/api/usuarios', usuariosRoutes);
    app.use('/api/eventos', eventosRoutes);
    app.use('/api/uploads', uploadsRoutes);

    // NUEVAS INTEGRACIONES - Servicios Puppeteer (Fase 1)
    app.use('/api/mercadopago', mercadopagoRoutes); // Integración con serverMP
    app.use('/api/whatsapp', whatsappRoutes); // Integración con serverWhatsApp

    logSuccess("Rutas configuradas correctamente (incluidas nuevas rutas de bandas y solicitudes de fechas, y servicios Puppeteer).");

} catch (error) {
    logError("ERROR CRÍTICO AL CARGAR RUTAS", error);
    // Aquí sí podríamos querer salir si el código está roto, 
    // pero para seguir tu petición, solo lo logueamos.
}


// --- Manejador de Errores Global ---
app.use((err, req, res, next) => {
    logError("ERROR NO CAPTURADO", err);
    res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
});

// --- FUNCIÓN DE AYUDA PARA ESPERAR ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- FUNCIÓN DE INICIO RESILIENTE ---
async function startServer() {
    logVerbose("Levantando servicio");

    // 1. Validar variables críticas (Si esto falla, no tiene sentido seguir)
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        logError(`ERROR FATAL: Faltan variables de entorno: ${missingVars.join(', ')}`);
        // Aquí sí debemos salir, porque nunca funcionará sin credenciales.
        // Pero el contenedor se reiniciará si tienes restart_policy.
        process.exit(1);
    }

    // 2. Bucle de intentos de conexión
    let connected = false;
    let attempts = 0;

    while (!connected) {
        attempts++;
        try {
            logVerbose(`Conectando a la base de datos (intento #${attempts})...`, { host: process.env.DB_HOST });
            const conn = await pool.getConnection();
            conn.release(); // Liberamos inmediatamente si tuvo éxito
            logSuccess("Conexión exitosa a MariaDB");
            connected = true;
        } catch (err) {
            logWarning(`Intento #${attempts} falló`, { error: err.message });

            // Diagnóstico básico del error para el log
            if (err.code === 'ECONNREFUSED') logWarning("Causa: Conexión rechazada. La base de datos podría no estar lista aún.");
            else if (err.code === 'ER_ACCESS_DENIED_ERROR') logWarning("Causa: Credenciales incorrectas.");
            else if (err.code === 'ENOTFOUND') logWarning(`Causa: No se encuentra el host '${process.env.DB_HOST}'.`);
            else logWarning(`Causa: ${err.message}`);

            logVerbose("Reintentando en 5 segundos...");
            await wait(5000); // Espera 5 segundos antes del siguiente intento
        }
    }

    // 3. Iniciar Express solo después de conectar a la DB
    app.listen(port, () => {
        logSuccess(`SERVIDOR LISTO: Backend escuchando en el puerto ${port}`);
    });
}

startServer();

// Agregar handlers para SIGINT y SIGTERM para permitir Ctrl+C
process.on('SIGINT', () => {
    console.log('\n[server.js] ✓ SIGINT recibida - terminando...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('[server.js] ✓ SIGTERM recibida - terminando...');
    process.exit(0);
});

process.on('SIGHUP', () => {
    console.log('[server.js] ✓ SIGHUP recibida - ignorada');
});
