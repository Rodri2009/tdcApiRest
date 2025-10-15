const express = require('express');
const pool = require('./db');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- LOG DE DEPURACIÓN GLOBAL (NUEVO) ---
// Este middleware se ejecutará para CADA petición que llegue al backend.
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Petición recibida: ${req.method} ${req.originalUrl}`);
    next(); // Pasa la petición al siguiente middleware o ruta
});

// --- RUTAS DE LA API ---
console.log("Cargando rutas de la API...");
const opcionesRoutes = require('./routes/opcionesRoutes');
app.use('/api/opciones', opcionesRoutes);
console.log("Rutas de opciones (/api/opciones) configuradas.");

// Ruta de prueba
app.get('/api/status', (req, res) => {
    res.json({ message: 'El backend está funcionando correctamente!' });
});

// ... (resto del archivo sin cambios)

// Función para probar la conexión a la base de datos al iniciar
async function testDbConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log("Conectado exitosamente a MariaDB!");
    } catch (err) {
        console.error("Error al conectar a MariaDB:", err);
    } finally {
        if (conn) conn.release();
    }
}

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Backend de TDC escuchando en el puerto ${port}`);
    testDbConnection();
});