// scripts/create_admin_ci.js
// Crea o actualiza un usuario admin en la BD con contraseña dada (no para producción)
const bcrypt = require('bcryptjs');
let pool;
try { pool = require('../backend/db'); } catch (e) {
    try { pool = require('./db'); } catch (e2) {
        try { pool = require('../db'); } catch (e3) { throw new Error('No se pudo localizar el módulo de DB: ' + [e.message, e2 && e2.message, e3 && e3.message].join(' | ')); }
    }
}

const email = process.env.ADMIN_EMAIL || 'testadmin@example.com';
const password = process.env.ADMIN_PASS || 'test-pass-123';

(async () => {
    let conn;
    try {
        conn = await pool.getConnection();
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const [existing] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing && existing.id) {
            await conn.query('UPDATE usuarios SET password_hash = ?, rol = ?, activo = 1 WHERE id = ?', [hash, 'admin', existing.id]);
            console.log(`Updated admin ${email}, id=${existing.id}`);
        } else {
            const res = await conn.query('INSERT INTO usuarios (email, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)', [email, hash, 'CI Admin', 'admin']);
            console.log(`Created admin ${email}, id=${res.insertId}`);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(2);
    } finally {
        if (conn) conn.release();
    }
})();