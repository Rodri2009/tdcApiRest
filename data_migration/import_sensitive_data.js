const fs = require('fs');
const csv = require('csv-parser');
const mariadb = require('mariadb');

// --- CONFIGURACIÓN ---
const pool = mariadb.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'rodrigo',
    password: 'desa8102test',
    database: 'tdc_db',
    connectionLimit: 5,
    multipleStatements: true
});

// --- FUNCIONES DE AYUDA ---

function normalizeHeader(header) {
    return header
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
        .replace(/\s*\(PK\)|\s*\(FK\)/gi, '') // Quita (PK) y (FK)
        .trim();
}

function transformValue(key, value) {
    const lowerKey = key.toLowerCase();
    
    // Si el valor es nulo o indefinido, devolver NULL para la base de datos
    if (value === null || value === undefined) return null;

    if (['precio', 'monto', 'deposito', 'costo', 'viaticos'].some(k => lowerKey.includes(k))) {
        return value === '' ? 0 : value;
    }

    if (['espublico', 'activo'].some(k => lowerKey.includes(k))) {
        return value.toUpperCase() === 'TRUE' ? 1 : 0;
    }
    
    // Versión mejorada para manejar fechas y fechas con hora
    if ((lowerKey.includes('fecha') || lowerKey.includes('timestamp')) && value !== '') {
        const dateTimeParts = value.split(' ');
        const datePart = dateTimeParts[0];

        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(datePart)) {
            const dateParts = datePart.split('/');
            const year = dateParts[2];
            const month = dateParts[1].padStart(2, '0');
            const day = dateParts[0].padStart(2, '0');
            
            let formattedDate = `${year}-${month}-${day}`;

            // Si también hay una parte de hora, la añadimos
            if (dateTimeParts.length > 1) {
                formattedDate += ' ' + dateTimeParts[1];
            }

            return formattedDate;
        }
    }

    return value;
}

// --- CONFIGURACIÓN DE ARCHIVOS A IMPORTAR ---
const filesToImport = [
    { file: 'Solicitudes_Adicionales.csv', table: 'solicitudes_adicionales' },
    { file: 'Solicitudes_Personal.csv', table: 'solicitudes_personal' },
    { file: 'Solicitudes.csv', table: 'solicitudes' }, // Movida al final por si hay dependencias futuras
];

// --- LÓGICA DE IMPORTACIÓN ---
async function importCsvData(fileConfig) {
    const { file, table } = fileConfig;
    let conn;

    console.log(`\n--- Importando: ${file} -> ${table} ---`);

    try {
        conn = await pool.getConnection();
        await conn.query(`TRUNCATE TABLE \`${table}\`;`);
        console.log(`Tabla \`${table}\` vaciada.`);

        const dataToInsert = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(file)
                .pipe(csv({ mapHeaders: ({ header }) => normalizeHeader(header) }))
                .on('data', (row) => dataToInsert.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        if (dataToInsert.length === 0) {
            console.log('No hay datos para importar.');
            return;
        }

        // ¡ESTA ES LA CORRECCIÓN CLAVE!
        // Obtenemos las claves del *primer objeto* del array, no del array en sí.
        const columns = Object.keys(dataToInsert[0]).map(key => `\`${key}\``).join(', ');
        const placeholders = Object.keys(dataToInsert[0]).map(() => '?').join(', ');
        const sql = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`;

        console.log(`Preparando para insertar ${dataToInsert.length} filas...`);

        await conn.beginTransaction();
        for (const row of dataToInsert) {
            const values = Object.keys(row).map(key => transformValue(key, row[key]));
            await conn.query(sql, values);
        }
        await conn.commit();

        console.log(`✅ Éxito: Se importaron ${dataToInsert.length} filas a la tabla \`${table}\`.`);

    } catch (err) {
        if (conn) await conn.rollback();
        console.error(`❌ Error en tabla \`${table}\`:`, err.message);
        // Opcional: Imprimir más detalles para depuración
        // console.error(err); 
    } finally {
        if (conn) conn.end();
    }
}

async function runAllImports() {
    console.log('*** INICIO DEL PROCESO DE IMPORTACIÓN DE DATOS ***');
    for (const fileConfig of filesToImport) {
        await importCsvData(fileConfig);
    }
    console.log('\n*** PROCESO DE IMPORTACIÓN FINALIZADO ***');
    pool.end();
}

runAllImports();