const express = require('express');
const cookieParser = require('cookie-parser');
// NOTA: Asegúrate de haber eliminado la línea: require('dotenv').config();
// como hablamos antes, para evitar conflictos con las variables de Docker.
const pool = require('./db');
const app = express();
const port = process.env.PORT || 3000;

// --- Middlewares ---
app.use(express.json());
app.use(cookieParser()); // <-- USAR
app.use(express.urlencoded({ extended: true }));

// --- TEMP (top): bloquear cualquier petición que contenga 'fechas_bandas_confirmadas' ---
app.all('*fechas_bandas_confirmadas*', (req, res, next) => {
    console.warn('[LEGACY ACCESS - TOP] Request contains fechas_bandas_confirmadas:', req.method, req.originalUrl);
    console.warn(new Error('Trace origen legacy (top)').stack);
    return res.status(410).json({ error: 'Endpoint retirado. Usa /api/eventos_confirmados' });
});

// Servir archivos estáticos del frontend
app.use(express.static('frontend'));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Petición recibida: ${req.method} ${req.originalUrl}`);
    next();
});

// --- TEMP: Bloquear rutas legacy y trazar su origen ---
// Handler general (subcadena) para capturar cualquier intento de usar endpoints legacy
app.all('*fechas_bandas_confirmadas*', (req, res, next) => {
    console.warn('[LEGACY ACCESS - CATCHALL] Path contains fechas_bandas_confirmadas', req.method, req.originalUrl);
    console.warn(new Error('Trace origen legacy (catchall)').stack);
    return res.status(410).json({ error: 'Endpoint retirado. Usa /api/eventos_confirmados' });
});

// Rutas específicas (por compatibilidad en logs detallados)
app.use('/api/admin/fechas_bandas_confirmadas', (req, res, next) => {
    console.warn('[LEGACY ACCESS] /api/admin/fechas_bandas_confirmadas', req.method, req.originalUrl);
    console.warn(new Error('Trace origen legacy admin').stack);
    return res.status(410).json({ error: 'Endpoint retirado. Usa /api/admin/eventos_confirmados' });
});
app.use('/api/tickets/fechas_bandas_confirmadas', (req, res, next) => {
    console.warn('[LEGACY ACCESS] /api/tickets/fechas_bandas_confirmadas', req.method, req.originalUrl);
    console.warn(new Error('Trace origen legacy tickets').stack);
    return res.status(410).json({ error: 'Endpoint retirado. Usa /api/tickets/eventos_confirmados' });
});


// --- Rutas de la API ---
console.log("\n------------INICIANDO BACKEND------------.");
console.log("Cargando rutas de la API...");
try {
    const opcionesRoutes = require('./routes/opcionesRoutes');
    const solicitudesRoutes = require('./routes/solicitudRoutes');
    const testRoutes = require('./routes/testRoutes');
    const authRoutes = require('./routes/authRoutes');
    const adminRoutes = require('./routes/adminRoutes');
    const bandasRoutes = require('./routes/bandasRoutes'); // Bandas antes de tickets
    const ticketsRoutes = require('./routes/ticketsRoutes');
    const talleresRoutes = require('./routes/talleresRoutes');
    const serviciosRoutes = require('./routes/serviciosRoutes');
    const usuariosRoutes = require('./routes/usuariosRoutes');

    app.use('/api/opciones', opcionesRoutes);
    app.use('/api/solicitudes', solicitudesRoutes);
    app.use('/api/test', testRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/bandas', bandasRoutes);
    app.use('/api/tickets', ticketsRoutes);
    app.use('/api/talleres', talleresRoutes);
    app.use('/api/servicios', serviciosRoutes);
    app.use('/api/usuarios', usuariosRoutes);

    console.log("Rutas configuradas correctamente.");

    // DEBUG: exponer rutas registradas en JSON (para inspección remota; temporal)
    app.get('/api/debug/routes', (req, res) => {
        const routes = [];
        app._router.stack.forEach(mw => {
            if (mw.route && mw.route.path) {
                const methods = Object.keys(mw.route.methods).join(',').toUpperCase();
                routes.push({ path: mw.route.path, methods });
            } else if (mw.name === 'router' && mw.handle && mw.handle.stack) {
                mw.handle.stack.forEach(r => {
                    if (r.route && r.route.path) {
                        const methods = Object.keys(r.route.methods).join(',').toUpperCase();
                        routes.push({ path: r.route.path, methods });
                    }
                });
            }
        });
        res.json(routes.sort((a,b)=> a.path.localeCompare(b.path)));
    });

    // --- DEBUG: listar rutas en logs tambien (temporal) ---
    try {
        const routes = [];
        app._router.stack.forEach(mw => {
            if (mw.route && mw.route.path) {
                const methods = Object.keys(mw.route.methods).join(',').toUpperCase();
                routes.push(`${methods} ${mw.route.path}`);
            } else if (mw.name === 'router' && mw.handle && mw.handle.stack) {
                mw.handle.stack.forEach(r => {
                    if (r.route && r.route.path) {
                        const methods = Object.keys(r.route.methods).join(',').toUpperCase();
                        routes.push(`${methods} ${r.route.path}`);
                    }
                });
            }
        });
        console.log('--- Registered routes (debug) ---');
        routes.sort().forEach(r => console.log(r));
        console.log('--- End registered routes ---');
    } catch (e) {
        console.warn('No se pudo listar rutas:', e.message);
    }
} catch (error) {
    console.error("¡ERROR CRÍTICO AL CARGAR RUTAS!", error);
    // Aquí sí podríamos querer salir si el código está roto, 
    // pero para seguir tu petición, solo lo logueamos.
}


// --- Manejador de Errores Global ---
app.use((err, req, res, next) => {
    console.error("🔥 ERROR NO CAPTURADO:", err.stack);
    res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
});

// --- FUNCIÓN DE AYUDA PARA ESPERAR ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- FUNCIÓN DE INICIO RESILIENTE ---
async function startServer() {
    console.log("Levantando servicio");

    // 1. Validar variables críticas (Si esto falla, no tiene sentido seguir)
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        console.error(`❌ ERROR FATAL: Faltan variables de entorno: ${missingVars.join(', ')}`);
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
            console.log(`Attempt #${attempts}: Conectando a la base de datos (${process.env.DB_HOST})...`);
            const conn = await pool.getConnection();
            conn.release(); // Liberamos inmediatamente si tuvo éxito
            console.log("✅ ¡Conexión exitosa a MariaDB!");
            connected = true;
        } catch (err) {
            console.error(`❌ Falló el intento #${attempts}.`);

            // Diagnóstico básico del error para el log
            if (err.code === 'ECONNREFUSED') console.error("   -> Causa: Conexión rechazada. La base de datos podría no estar lista aún.");
            else if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error("   -> Causa: Credenciales incorrectas.");
            else if (err.code === 'ENOTFOUND') console.error(`   -> Causa: No se encuentra el host '${process.env.DB_HOST}'.`);
            else console.error(`   -> Causa: ${err.message}`);

            console.log("⏳ Reintentando en 5 segundos...");
            await wait(5000); // Espera 5 segundos antes del siguiente intento
        }
    }

    // 3. Iniciar Express solo después de conectar a la DB
    app.listen(port, () => {
        console.log(`🚀 SERVIDOR LISTO: Backend escuchando en el puerto ${port}`);
    });
}

startServer();