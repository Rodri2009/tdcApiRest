// scripts/crear-admin.js
require('dotenv').config({ path: './.env' }); // Asegúrate de que lea el .env de la raíz
const mariadb = require('mariadb');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Interfaz para leer desde la terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const pool = mariadb.createPool({
    host: '127.0.0.1', // Conectamos al puerto expuesto de Docker
    port: 3306,
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
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(password, salt);

                const sql = 'INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES (?, ?, ?, ?)';
                const result = await conn.query(sql, [email, passwordHash, 'Administrador', 'admin']);

                if (result.affectedRows > 0) {
                    console.log(`✅ Usuario administrador '${email}' creado con éxito.`);
                } else {
                    console.error('❌ No se pudo crear el usuario.');
                }
            } catch (err) {
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