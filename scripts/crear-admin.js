// scripts/crear-admin.js
// Puede ejecutarse desde fuera del contenedor conectándose a localhost:3307
require('dotenv').config({ path: '.env' }); // Lee el .env de la raíz
const mariadb = require('mariadb');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Detectar si estamos dentro del contenedor o en el host
// Usa LOCAL_DB=1 para forzar conexión local, o detecta automáticamente
const forceLocal = process.env.LOCAL_DB === '1';
const isDocker = !forceLocal && process.env.DB_HOST === 'mariadb' && process.env.HOSTNAME; // HOSTNAME existe en containers
const dbHost = (forceLocal || !isDocker) ? 'localhost' : 'mariadb';
const dbPort = 3306; // Puerto 3306 tanto dentro como fuera (está mapeado 3306:3306)

console.log('📋 Configuración de BD:');
console.log(`Modo: ${forceLocal ? 'LOCAL (forzado)' : isDocker ? 'DOCKER' : 'LOCAL (auto)'}`);
console.log(`Host: ${dbHost}:${dbPort}`);
console.log(`BD: ${process.env.DB_NAME}`);
console.log(`Usuario: ${process.env.DB_USER}`);
console.log(`Password: ${process.env.DB_PASSWORD ? '***' : 'NO CARGADA'}\n`);

// Interfaz para leer desde la terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const pool = mariadb.createPool({
    host: dbHost,
    port: dbPort,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function crearAdmin() {
    rl.question('Introduce el email del administrador: ', async (email) => {
        rl.question('Introduce la contraseña del administrador: ', async (password) => {
            if (!email || !password) {
                console.error('❌ El email y la contraseña no pueden estar vacíos.');
                rl.close();
                pool.end();
                return;
            }

            let conn;
            try {
                conn = await pool.getConnection();
                await conn.beginTransaction();

                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(password, salt);

                // Crear usuario admin
                const sql = 'INSERT INTO usuarios (email, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)';
                const result = await conn.query(sql, [email, passwordHash, 'Administrador', 'admin']);

                if (result.affectedRows > 0) {
                    await conn.commit();
                    console.log(`✅ Usuario administrador '${email}' creado correctamente.`);
                } else {
                    await conn.rollback();
                    console.error('❌ No se pudo crear el usuario.');
                }
            } catch (err) {
                if (conn) await conn.rollback();
                if (err.code === 'ER_DUP_ENTRY') {
                    console.error(`❌ Error: El email '${email}' ya existe en la base de datos.`);
                } else {
                    console.error('❌ Error al crear el usuario:', err.message);
                }
            } finally {
                if (conn) conn.release();
                pool.end();
                rl.close();
            }
        });
    });
}

crearAdmin();