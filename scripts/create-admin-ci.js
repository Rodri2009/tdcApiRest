// scripts/create-admin-ci.js
// Non-interactive admin creation for CI. Usage:
// ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret DB_HOST=127.0.0.1 DB_USER=root DB_PASSWORD=pass DB_NAME=tdc node ./scripts/create-admin-ci.js

const mariadb = require('mariadb');
const bcrypt = require('bcryptjs');

(async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbUser = process.env.DB_USER || 'root';
    const dbPass = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'tdc';

    if (!adminEmail || !adminPassword) {
        console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be provided');
        process.exit(1);
    }

    const pool = mariadb.createPool({ host: dbHost, user: dbUser, password: dbPass, database: dbName, connectionLimit: 2 });
    let conn;
    try {
        conn = await pool.getConnection();
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(adminPassword, salt);

        // Upsert admin user by email
        const [existing] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [adminEmail]);
        if (existing && existing.id) {
            await conn.query('UPDATE usuarios SET password_hash = ?, rol = ?, activo = 1 WHERE id = ?', [hash, 'admin', existing.id]);
            console.log(`Updated existing admin user ${adminEmail}`);
        } else {
            await conn.query('INSERT INTO usuarios (email, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)', [adminEmail, hash, 'CI Admin', 'admin']);
            console.log(`Created admin user ${adminEmail}`);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(2);
    } finally {
        if (conn) conn.release();
        pool.end();
    }
})();
