// data_migration/generate_sensitive_dump.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const os = require('os');

// --- CONFIGURACIÓN ---
const filesToProcess = [
    { file: 'Solicitudes.csv', table: 'solicitudes' },
    { file: 'Solicitudes_Adicionales.csv', table: 'solicitudes_adicionales' },
    { file: 'Solicitudes_Personal.csv', table: 'solicitudes_personal' },
];

//const outputFile = path.join(os.homedir(), 'Desktop', 'datos_sensibles_backup.sql'); // Guardará el backup en tu escritorio
const outputFile = 'data_migration/datos_sensibles_backup.sql'; // Guardará el backup en tu escritorio

// --- FUNCIONES DE AYUDA (las mismas de nuestro importador) ---
function normalizeHeader(header) {
    return header
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
        .replace(/\s*\(PK\)|\s*\(FK\)/gi, '') // Quita (PK) y (FK)
        .trim() // Quita espacios al inicio/final
        .toLowerCase() // Convierte a minúsculas
        .replace(/[^a-zA-Z0-9_]+/g, '_') // Reemplaza espacios y caracteres no alfanuméricos con _
        .replace(/__+/g, '_'); // Reemplaza múltiples __ con uno solo
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


// Función para escapar valores para SQL
function escapeSql(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    // Escapa las comillas simples duplicándolas (' -> '')
    return `'${String(value).replace(/'/g, "''")}'`;
}

async function generateInsertsFromFile(fileConfig) {
    const { file, table } = fileConfig;
    const filePath = path.join(__dirname, file);
    let sqlContent = `-- Datos para la tabla: ${table}\n`;
    const dataRows = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({ mapHeaders: ({ header }) => normalizeHeader(header) }))
            .on('data', (row) => dataRows.push(row))
            .on('end', resolve)
            .on('error', reject);
    });

    if (dataRows.length === 0) {
        return ''; // No hay datos, no genera SQL
    }

    //Esto es para nombres de columnas con espacios
    //const columns = Object.keys(dataRows[0]).map(key => `\`${key}\``).join(', ');

    //Esto es para nombres de columnas normalizados
    const columns = Object.keys(dataRows).join(', ');

    for (const row of dataRows) {
        const values = Object.keys(row)
            .map(key => transformValue(key, row[key]))
            .map(value => escapeSql(value)) // Escapa cada valor para la sintaxis SQL
            .join(', ');
        // ¡SIN COMILLAS INVERTIDAS! Los nombres ya son válidos.
        // ...
        sqlContent += `INSERT INTO \`${table}\` (${columns}) VALUES (${values});\n`;
    }

    return sqlContent + '\n';
}

async function runGenerator() {
    console.log(`Iniciando la generación del volcado SQL...`);
    let finalSql = 'USE tdc_db;\n\n';

    for (const fileConfig of filesToProcess) {
        console.log(`Procesando ${fileConfig.file}...`);
        finalSql += await generateInsertsFromFile(fileConfig);
    }

    fs.writeFileSync(outputFile, finalSql);
    console.log(`\n✅ ¡Éxito! El archivo de volcado ha sido guardado en: ${outputFile}`);
}

// Pega aquí las funciones completas de normalizeHeader y transformValue
function normalizeHeader(header) {
    return header
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s*\(PK\)|\s*\(FK\)/gi, '')
        .trim();
}

function transformValue(key, value) {
    const lowerKey = key.toLowerCase();

    if (value === null || value === undefined) return null;

    if (['precio', 'monto', 'deposito', 'costo', 'viaticos'].some(k => lowerKey.includes(k))) {
        return value === '' ? 0 : value;
    }

    if (['espublico', 'activo'].some(k => lowerKey.includes(k))) {
        return value.toUpperCase() === 'TRUE' ? 1 : 0;
    }

    if ((lowerKey.includes('fecha') || lowerKey.includes('timestamp')) && value !== '') {
        const dateTimeParts = value.split(' ');
        const datePart = dateTimeParts[0];

        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(datePart)) {
            const dateParts = datePart.split('/');
            const year = dateParts[2];
            const month = dateParts[1].padStart(2, '0');
            const day = dateParts[0].padStart(2, '0');

            let formattedDate = `${year}-${month}-${day}`;
            if (dateTimeParts.length > 1) {
                formattedDate += ' ' + dateTimeParts[1];
            }
            return formattedDate;
        }
    }
    return value;
}


runGenerator();