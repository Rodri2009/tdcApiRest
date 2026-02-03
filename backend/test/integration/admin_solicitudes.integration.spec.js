const request = require('supertest');
const assert = require('assert');
const bcrypt = require('bcryptjs');
const app = require('../../server');
const pool = require('../../db');

describe('Integración: Admin solicitudes list incluye idEventoGenerado', function () {
    this.timeout(15000);

    it('Crea solicitud FECHA_BANDAS, aprueba y verifica idEventoGenerado en /api/admin/solicitudes', async () => {
        // 1) Crear la solicitud (pública)
        const payload = {
            tipoEvento: 'FECHA_BANDAS',
            fechaEvento: '2026-05-05',
            horaInicio: '21:00',
            precioBase: 2000,
            nombre_banda: 'Test Band For Admin List',
            contacto_email: 'testband@example.local',
            mensaje: 'Solicitud de prueba para admin list'
        };

        const postRes = await request(app).post('/api/solicitudes').send(payload).expect(201);
        assert.ok(postRes.body && postRes.body.id, 'Expected id in create response');
        const solicitudId = postRes.body.id;

        // 2) Crear usuario admin directamente en la BD y obtener token
        const adminEmail = `admin_test_${Date.now()}@example.local`;
        const plainPwd = 'password1234';
        const pwdHash = bcrypt.hashSync(plainPwd, 8);

        const conn = await pool.getConnection();
        try {
            await conn.query(`INSERT INTO usuarios (email, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)`, [adminEmail, pwdHash, 'Test Admin', 'admin']);
        } finally {
            conn.release();
        }

        const loginRes = await request(app).post('/api/auth/login').send({ email: adminEmail, password: plainPwd }).expect(200);
        const token = loginRes.body.token;
        assert.ok(token, 'Expected token in login response');

        // 3) Encontrar la fila en solicitudes_bandas para obtener su PK (tabla solicitudes_bandas tiene PK `id`)
        const cn2 = await pool.getConnection();
        let bandRow;
        try {
            const rows = await cn2.query('SELECT id FROM solicitudes_bandas WHERE id_solicitud = ?', [solicitudId]);
            assert.ok(rows && rows.length > 0, 'Expected a solicitudes_bandas row linked to the solicitud');
            bandRow = rows[0];
        } finally {
            cn2.release();
        }

        // 4) Aprobar la solicitud usando el ID de la tabla solicitudes_bandas (como hace el backend)
        const approveRes = await request(app)
            .post(`/api/bandas/solicitudes/${bandRow.id}/aprobar`)
            .set('Authorization', `Bearer ${token}`)
            .send({ fecha_evento: '2026-05-05', hora_inicio: '21:00', precio_anticipada: 1500, precio_puerta: 2000, aforo_maximo: 150, descripcion: 'Aprobada desde test' })
            .expect(200);

        assert.ok(approveRes.body && typeof approveRes.body.evento_id === 'number', 'Expected evento_id in aprobar response');
        const eventoId = approveRes.body.evento_id;

        // 5) Consultar admin list y verificar que la entrada bnd_<solicitudId> tiene idEventoGenerado === eventoId
        const listRes = await request(app)
            .get('/api/admin/solicitudes')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        assert.ok(Array.isArray(listRes.body), 'Expected admin solicitudes to be an array');

        const found = listRes.body.find(r => r.id === `bnd_${solicitudId}`);
        assert.ok(found, `Expected to find bnd_${solicitudId} in admin list`);
        assert.strictEqual(found.idEventoGenerado, eventoId, 'Expected idEventoGenerado to match created evento id');
    });
});
