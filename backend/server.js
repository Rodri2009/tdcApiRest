const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
// NOTA: Asegúrate de haber eliminado la línea: require('dotenv').config();
// como hablamos antes, para evitar conflictos con las variables de Docker.

// ============================================================================
// PARSE DEBUG FLAGS FROM COMMAND LINE ARGUMENTS
// ============================================================================
// Detecta argumentos como -d o --debug y activa DEBUG_VERBOSE
if (process.argv.includes('-d') || process.argv.includes('--debug')) {
    process.env.DEBUG_VERBOSE = 'true';
    process.env.DEBUG_MODE = 'true';
}

const pool = require('./db');
const { logRequest, logVerbose, logError, logWarning, logSuccess } = require('./lib/debugFlags');
const logResponseMiddleware = require('./middleware/logResponseMiddleware');
const { performSyncLogos, performSyncFlyers } = require('./controllers/bandaController');

// ============================================================================
// IMPORTS DE PUPPETEER (Mercado Pago & WhatsApp) - CONDICIONAL
// ============================================================================
let browserManager = null;
let SessionMonitor = null;
let warmupBalance = null;
let warmupActivity = null;
let initializeWatch = null;

// Variables de ENV para determinar si cargar Puppeteer
const ENABLE_PUPPETEER_MP = process.env.ENABLE_PUPPETEER_MP === 'true';
const ENABLE_PUPPETEER_WA = process.env.ENABLE_PUPPETEER_WA === 'true';

// Loguear valores para diagnóstico temprano
logVerbose(`[INIT] ENABLE_PUPPETEER_MP=${ENABLE_PUPPETEER_MP}`);
logVerbose(`[INIT] ENABLE_PUPPETEER_WA=${ENABLE_PUPPETEER_WA}`);

// Cargar módulos de Puppeteer solo si alguno está habilitado
if (ENABLE_PUPPETEER_MP || ENABLE_PUPPETEER_WA) {
    try {
        browserManager = require('./core/browserManager');
        SessionMonitor = require('./lib/sessionMonitor');
        warmupBalance = require('./services/balanceService').warmupCache;
        warmupActivity = require('./services/activityService').warmupCache;
        initializeWatch = require('./controllers/watchController').initializeWatch;
        logVerbose('[INIT] ✓ Módulos Puppeteer cargados correctamente');
    } catch (err) {
        logWarning('[INIT] ⚠️  No se pudieron cargar módulos Puppeteer:', err.message);
        logWarning('[INIT] ⚠️  Asegúrate de instalar: npm install puppeteer');
        logWarning('[INIT] ⚠️  Los servicios de Puppeteer estarán deshabilitados');
    }
}

const { protect: authProtect } = require('./middleware/authMiddleware');
const tokenManager = require('./lib/tokenManager');

const app = express();
const port = process.env.PORT || 3000;

// Estado global para servicios Puppeteer
let mpBrowser = null;
let mpPage = null;
let waBrowser = null;
let waPage = null;
let isShuttingDown = false;

// --- Middlewares ---
// Aumento límite para aceptar payloads con imágenes en base64 (ej. url_flyer)
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser()); // <-- USAR
// También limitar urlencoded para paridad
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Middleware para pasar mpPage a los handlers de Mercado Pago
app.use((req, res, next) => {
    req.mpPage = mpPage;
    req.waPage = waPage;
    next();
});

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

// ============================================================================
// ENDPOINTS DE AUTENTICACIÓN Y HEALTH (SIN PROTECCIÓN)
// ============================================================================

// Health check de tdcApiRest
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'ok',
        service: 'tdcApiRest',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        puppeteer: {
            mp: ENABLE_PUPPETEER_MP && mpPage ? 'ready' : 'disabled',
            wa: ENABLE_PUPPETEER_WA && waPage ? 'ready' : 'disabled'
        }
    };
    res.status(200).json(healthStatus);
});

// Health check de Mercado Pago (si está habilitado)
app.get('/api/mercadopago/health', (req, res) => {
    if (!ENABLE_PUPPETEER_MP) {
        return res.status(503).json({
            status: 'disabled',
            service: 'mercadopago',
            message: 'Servicio de Puppeteer para Mercado Pago está deshabilitado'
        });
    }

    const mpStatus = {
        status: mpPage ? 'ok' : 'not_ready',
        service: 'mercadopago',
        browser: mpBrowser ? 'initialized' : 'not_initialized',
        page: mpPage ? 'initialized' : 'not_initialized',
        timestamp: new Date().toISOString()
    };

    res.status(mpPage ? 200 : 503).json(mpStatus);
});

// Endpoint de login automático para MP (SIN PROTECCIÓN)
app.post('/api/mercadopago/auth/login', (req, res) => {
    try {
        logSuccess('[mercadopago-auth] Generando token de autenticación automática');

        const userData = {
            id: 'admin-mp',
            role: 'admin',
            email: 'admin-mp@localhost',
            permissions: ['read:balance', 'read:activity', 'write:refresh']
        };

        const { accessToken, refreshToken, expiresIn } = tokenManager.generateTokenPair(userData);

        res.status(200).json({
            success: true,
            accessToken,
            refreshToken,
            expiresIn,
            user: userData,
            message: 'Autenticación exitosa'
        });
    } catch (error) {
        logError('[mercadopago-auth] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error al generar token'
        });
    }
});

// Health check de WhatsApp (si está habilitado)
app.get('/api/whatsapp/health', (req, res) => {
    if (!ENABLE_PUPPETEER_WA) {
        return res.status(503).json({
            status: 'disabled',
            service: 'whatsapp',
            message: 'Servicio de Puppeteer para WhatsApp está deshabilitado'
        });
    }

    const waStatus = {
        status: waPage ? 'ok' : 'not_ready',
        service: 'whatsapp',
        browser: waBrowser ? 'initialized' : 'not_initialized',
        page: waPage ? 'initialized' : 'not_initialized',
        timestamp: new Date().toISOString()
    };

    res.status(waPage ? 200 : 503).json(waStatus);
});

// --- Rutas de la API ---
logSuccess("INICIANDO BACKEND");
logVerbose("Cargando rutas de la API...");
try {
    const opcionesRoutes = require('./routes/opcionesRoutes');
    const solicitudesRoutes = require('./routes/solicitudRoutes');
    const testRoutes = require('./routes/testRoutes');
    const authRoutes = require('./routes/authRoutes');
    const oauthRoutes = require('./routes/oauthRoutes'); // NUEVO: OAuth routes
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

    // NUEVO: Rutas de Integración con Puppeteer (cargar condicionalmente con try/catch)
    let mercadopagoRoutes = null;
    let whatsappRoutes = null;
    try {
        mercadopagoRoutes = require('./routes/mercadopagoRoutes');
        whatsappRoutes = require('./routes/whatsappRoutes');
        logVerbose('[ROUTES] Routes MP y WA cargadas correctamente');
    } catch (err) {
        logWarning('[ROUTES] No se pudieron cargar rutas MP/WA:', err.message);
        logWarning('[ROUTES] MP y WA estarán deshabilitados');
    }

    app.use('/api/opciones', opcionesRoutes);

    // ⚠️ IMPORTANTE: Registrar solicitudes-fechas-bandas ANTES de solicitudes
    // porque /api/solicitudes-fechas-bandas/:id puede ser capturada por /api/solicitudes/:id
    app.use('/api/solicitudes-fechas-bandas', solicitudFechaBandaRoutes); // GET, POST, PUT, DELETE para solicitudes_fechas_bandas

    app.use('/api/solicitudes', solicitudesRoutes);
    app.use('/api/test', testRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/auth/oauth', oauthRoutes); // NUEVO: OAuth endpoint
    app.use('/api/admin', adminRoutes);

    // NUEVAS RUTAS (refactored 3NF)
    app.use('/api/bandas', bandaRoutes); // GET, POST, PUT, DELETE para bandas_artistas

    // Legacy (mantener por compatibilidad)
    // app.use('/api/bandas', bandasRoutes); // COMENTADO: usar nueva estructura

    app.use('/api/tickets', ticketsRoutes);
    app.use('/api/talleres', talleresRoutes);
    app.use('/api/servicios', serviciosRoutes);
    app.use('/api/usuarios', usuariosRoutes);
    app.use('/api/eventos', eventosRoutes);
    app.use('/api/uploads', uploadsRoutes);

    // NUEVAS INTEGRACIONES - Servicios Puppeteer (solo si se cargaron correctamente)
    if (mercadopagoRoutes) {
        app.use('/api/mercadopago', mercadopagoRoutes);
        logVerbose('[ROUTES] ✓ Rutas MP disponibles');
    }
    if (whatsappRoutes) {
        app.use('/api/whatsapp', whatsappRoutes);
        logVerbose('[ROUTES] ✓ Rutas WA disponibles');
    }

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

            // Ejecutar sincronizaciones al inicizar el servidor (esperare a que terminen)
            try {
                const logoResult = await performSyncLogos();
                logSuccess(`[INIT-SYNC] ✓ Logos: ${logoResult.actualizadas}/${logoResult.total} bandas actualizadas`);
            } catch (err) {
                logWarning('[INIT-SYNC] ⚠ Fallo al sincronizar logos:', err.message);
            }

            try {
                const flyerResult = await performSyncFlyers();
                logSuccess(`[INIT-SYNC] ✓ Flyers: ${flyerResult.actualizadas}/${flyerResult.total} registros actualizados`);
            } catch (err) {
                logWarning('[INIT-SYNC] ⚠ Fallo al sincronizar flyers:', err.message);
            }

            // ================================================================
            // 4. Inicializar servicios de Puppeteer (si están habilitados)
            // ================================================================

            if (ENABLE_PUPPETEER_MP) {
                logVerbose('[PUPPETEER-MP] Iniciando servicio Mercado Pago...');
                try {
                    // Determinamos si debemos correr en modo headless. La variable
                    // HEADLESS permite forzar cualquiera de los dos estados; cuando no
                    // está definida asumimos ``true`` si VNC no está habilitado (es la
                    // configuración por defecto en despliegues)
                    let headlessFlag;
                    if (process.env.HEADLESS === 'true') {
                        headlessFlag = true;
                    } else if (process.env.HEADLESS === 'false') {
                        headlessFlag = false;
                    } else {
                        // sin valor explícito, optamos por headless salvo que se haya
                        // activado VNC (donde el navegador debe ser visible)
                        headlessFlag = process.env.ENABLE_VNC === 'true' ? false : true;
                    }

                    const mpConfig = {
                        userDataDir: process.env.USER_DATA_DIR || '/home/pptruser/profile',
                        headless: headlessFlag,
                        port: 9001  // Para debugging local
                    };

                    // Lanzar browser
                    mpBrowser = await browserManager.launchBrowser(mpConfig);
                    const mpPages = await mpBrowser.pages();
                    mpPage = mpPages.length > 0 ? mpPages[0] : await mpBrowser.newPage();
                    await mpPage.setViewport({ width: 1920, height: 1080 });

                    logSuccess('[PUPPETEER-MP] ✓ Browser y page inicializados');

                    // Warmup de caché
                    Promise.allSettled([
                        warmupBalance(mpPage),
                        warmupActivity(mpPage)
                    ]).catch(() => { /* silent fail */ });

                    // Inicializar watch service
                    const transactionWatch = initializeWatch(mpPage);
                    transactionWatch.start();
                    logSuccess('[PUPPETEER-MP] ✓ Watch service iniciado');

                    // Inicializar session monitor
                    const mpSessionMonitor = new SessionMonitor(mpPage);
                    global.mpSessionMonitor = mpSessionMonitor;
                    mpSessionMonitor.start();
                    logSuccess('[PUPPETEER-MP] ✓ Session monitor iniciado');

                } catch (err) {
                    // logError ignora el segundo parámetro si no es un Error, así que
                    // pasamos el objeto completo para que imprima mensaje + stack
                    logError('[PUPPETEER-MP] Error al inicializar:', err);
                    logWarning('[PUPPETEER-MP] ⚠️  Mercado Pago continuará deshabilitado hasta reinicio');
                    mpBrowser = null;
                    mpPage = null;
                }
            } else {
                logVerbose('[PUPPETEER-MP] ℹ️  Servicio Mercado Pago deshabilitado (ENABLE_PUPPETEER_MP=false)');
            }

            if (ENABLE_PUPPETEER_WA) {
                logVerbose('[PUPPETEER-WA] Iniciando servicio WhatsApp...');
                try {
                    // reutilizamos la misma lógica de HEADLESS/VNC para el servicio WA
                    let headlessFlag;
                    if (process.env.HEADLESS === 'true') {
                        headlessFlag = true;
                    } else if (process.env.HEADLESS === 'false') {
                        headlessFlag = false;
                    } else {
                        headlessFlag = process.env.ENABLE_VNC === 'true' ? false : true;
                    }

                    const waConfig = {
                        userDataDir: process.env.WA_USER_DATA_DIR || '/home/pptruser/wa-profile',
                        headless: headlessFlag,
                        port: 9002  // Para debugging local
                    };

                    // Lanzar browser
                    waBrowser = await browserManager.launchBrowser(waConfig);
                    const waPages = await waBrowser.pages();
                    waPage = waPages.length > 0 ? waPages[0] : await waBrowser.newPage();
                    await waPage.setViewport({ width: 1920, height: 1080 });

                    logSuccess('[PUPPETEER-WA] ✓ Browser y page inicializados');

                } catch (err) {
                    logError('[PUPPETEER-WA] Error al inicializar:', err.message);
                    logWarning('[PUPPETEER-WA] ⚠️  WhatsApp continuará deshabilitado hasta reinicio');
                    waBrowser = null;
                    waPage = null;
                }
            } else {
                logVerbose('[PUPPETEER-WA] ℹ️  Servicio WhatsApp deshabilitado (ENABLE_PUPPETEER_WA=false)');
            }

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
        logSuccess(`📊 Servicios habilitados:`);
        logSuccess(`   ✓ tdcApiRest API (eventos, bandas, usuarios, etc.)`);
        logSuccess(`   ${ENABLE_PUPPETEER_MP ? '✓' : '✗'} Mercado Pago (Puppeteer)`);
        logSuccess(`   ${ENABLE_PUPPETEER_WA ? '✓' : '✗'} WhatsApp (Puppeteer)`);
        logSuccess(`🔌 Variables de entorno:`);
        logSuccess(`   ENABLE_PUPPETEER_MP=${ENABLE_PUPPETEER_MP}`);
        logSuccess(`   ENABLE_PUPPETEER_WA=${ENABLE_PUPPETEER_WA}`);
    });
}

startServer();

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function gracefulShutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logWarning('[shutdown] Iniciando cierre graceful...');

    try {
        if (mpPage) await mpPage.close();
        if (mpBrowser) await mpBrowser.close();
        logSuccess('[shutdown] ✓ Mercado Pago browser cerrado');
    } catch (err) {
        logError('[shutdown] Error cerrando MP:', err.message);
    }

    try {
        if (waPage) await waPage.close();
        if (waBrowser) await waBrowser.close();
        logSuccess('[shutdown] ✓ WhatsApp browser cerrado');
    } catch (err) {
        logError('[shutdown] Error cerrando WA:', err.message);
    }

    logSuccess('[shutdown] ✅ Servidor cerrado');
    process.exit(0);
}

// Agregar handlers para SIGINT y SIGTERM
process.on('SIGINT', () => {
    console.log('\n[server.js] ✓ SIGINT recibida - terminando...');
    gracefulShutdown();
});

process.on('SIGTERM', () => {
    console.log('[server.js] ✓ SIGTERM recibida - terminando...');
    gracefulShutdown();
});

process.on('SIGHUP', () => {
    console.log('[server.js] ✓ SIGHUP recibida - ignorada');
});

// Excepciones no capturadas
process.on('uncaughtException', (error) => {
    logError('[fatal] Excepción no capturada:', error);
    gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    logError('[fatal] Promise rechazada:', reason);
    gracefulShutdown();
});
