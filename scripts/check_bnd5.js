const request = require('supertest');
const app = require('../server');
const pool = require('../db');
const bcrypt = require('bcryptjs');
(async () => {
    try {
        const adminEmail = 'admin_check@local';
        const pwd = 'pass1234';
        const hash = bcrypt.hashSync(pwd, 8);
        try {
            await pool.query('INSERT INTO usuarios (email, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)', [adminEmail, hash, 'Check Admin', 'admin']);
        } catch (e) { /* ignore */ }

        const login = await request(app).post('/api/auth/login').send({ email: adminEmail, password: pwd });
        const token = login.body && login.body.token;
        if (!token) {
            console.error('No se obtuvo token de login:', login.body);
            process.exit(1);
        }

        const res = await request(app).get('/api/admin/solicitudes').set('Authorization', 'Bearer ' + token);
        const found = Array.isArray(res.body) ? res.body.find(r => r.id === 'bnd_5') : null;
        console.log('bnd_5 =>', JSON.stringify(found, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();