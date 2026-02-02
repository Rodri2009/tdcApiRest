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

// Servir archivos estáticos del frontend
app.use(express.static('frontend'));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Petición recibida: ${req.method} ${req.originalUrl}`);
    next();
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

// Exportar app para pruebas y permitir arranque condicional
if (require.main === module) {
    startServer();
} else {
    module.exports = app;
}