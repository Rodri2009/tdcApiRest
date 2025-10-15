// Cargar variables de entorno del archivo .env
require('dotenv').config();

const express = require('express');
const mariadb = require('mariadb');
const app = express();
const port = process.env.PORT || 3000; // Usa el puerto de las variables de entorno o 3000 por defecto

// Middleware para parsear JSON en las solicitudes
app.use(express.json());
// Middleware para parsear datos de formularios (URL-encoded)
app.use(express.urlencoded({ extended: true }));

// Conexión a la base de datos MariaDB
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

// Función para probar la conexión a la base de datos
async function testDbConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log("Conectado exitosamente a MariaDB!");
        const rows = await conn.query("SELECT 1 + 1 AS solution");
        console.log("Resultado de la consulta de prueba:", rows[0].solution);
    } catch (err) {
        console.error("Error al conectar o consultar MariaDB:", err);
    } finally {
        if (conn) conn.end(); // Cerrar la conexión
    }
}

// Ruta de ejemplo para probar el backend
app.get('/api/saludos', (req, res) => {
    res.json({ message: 'Hola desde el backend de Express.js!' });
});

// Ruta de ejemplo para probar la conexión a la DB
app.get('/api/db-test', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT 'Conexión exitosa' as status");
        res.json({ status: rows[0].status });
    } catch (err) {
        console.error("Error al probar la DB:", err);
        res.status(500).json({ error: 'Error al conectar a la base de datos' });
    } finally {
        if (conn) conn.end();
    }
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Backend de TDC escuchando en el puerto ${port}`);
    testDbConnection(); // Probar la conexión a la DB al iniciar
});