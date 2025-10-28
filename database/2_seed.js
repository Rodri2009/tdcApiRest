// database/seed.js
const fs = require('fs');
const csv = require('csv-parser');
const mariadb = require('mariadb');

// --- CONFIGURACIÓN ---
// Nota: Leemos las credenciales de las variables de entorno, que Docker Compose provee.
const pool = mariadb.createPool({
    host: process.env.MARIADB_HOST || 'localhost',
    user: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    database: process.env.MARIADB_DATABASE,
    connectionLimit: 5
});

// --- FUNCIONES Y LÓGICA (adaptadas del script anterior) ---
// (Incluye aquí las funciones normalizeHeader y transformValue de tu script import_all_csv.js)

async function importCsv(filePath, tableName) {
    // ... (lógica para leer el CSV y hacer los INSERTs)
}

async function runSeeding() {
    console.log('Iniciando el semillado de la base de datos...');
    // await importCsv('/seeds/Configuracion.csv', 'configuracion');
    // await importCsv('/seeds/Opciones_Adicionales.csv', 'opciones_adicionales');
    // ... y así para cada archivo
    console.log('Semillado completado.');
    pool.end();
}

runSeeding();