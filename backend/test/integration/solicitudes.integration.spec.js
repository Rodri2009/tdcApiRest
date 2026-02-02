const request = require('supertest');
const assert = require('assert');
const app = require('../../server');

describe('Integración: Solicitudes (endpoints públicos)', function () {
    this.timeout(10000);

    it('Crea y obtiene una solicitud de SERVICIOS', async () => {
        const payload = {
            tipoEvento: 'SERVICIOS',
            cantidadPersonas: 1,
            duracionEvento: '1h',
            fechaEvento: '2026-03-05',
            horaInicio: '09:00',
            precioBase: 1200,
            fingerprintId: 'test_integration_1',
            servicio_id: 'DEPILACION',
            profesional_id: 5,
            duracion_minutos: 60,
            notas_servicio: 'Zona completa'
        };

        const postRes = await request(app).post('/api/solicitudes').send(payload).expect(201);
        assert.ok(postRes.body && postRes.body.id, 'Expected response to include id');
        const id = postRes.body.id;

        const getRes = await request(app).get(`/api/solicitudes/${id}`).expect(200);
        assert.ok(getRes.body && getRes.body.solicitudId, 'Expected solicitudId in response');
        assert.strictEqual(getRes.body.solicitudId, id);
        // El endpoint almacena servicios dentro de 'tipoServicio' (label), los detalles (servicio_id) se guardan en `solicitudes_servicios`
        assert.strictEqual(getRes.body.tipoServicio, 'SERVICIOS');

        // Verificar en la DB que se creó la fila en solicitudes_servicios con servicio_id pasado
        const pool = require('../../db');
        const conn = await pool.getConnection();
        try {
            const rows = await conn.query('SELECT servicio_id, profesional_id FROM solicitudes_servicios WHERE id_solicitud = ?', [id]);
            assert.ok(rows && rows.length > 0, 'Expected a solicitudes_servicios row');
            assert.strictEqual(rows[0].servicio_id, 'DEPILACION');
        } finally {
            conn.release();
        }
    });

    it('Crea y obtiene una solicitud de FECHA_BANDAS con metadata de banda', async () => {
        const payload = {
            tipoEvento: 'FECHA_BANDAS',
            fechaEvento: '2026-03-15',
            horaInicio: '21:00',
            precioBase: 3500,
            fingerprintId: 'test_integration_band_1',
            nombre_banda: 'Integration Test Band',
            contacto_email: 'band@test.local',
            link_musica: 'https://youtube.com/',
            propuesta: 'Gran noche'
        };

        const postRes = await request(app).post('/api/solicitudes').send(payload).expect(201);
        assert.ok(postRes.body && postRes.body.id, 'Expected response to include id');
        const id = postRes.body.id;

        const getRes = await request(app).get(`/api/solicitudes/${id}`).expect(200);
        assert.ok(getRes.body && getRes.body.solicitudId, 'Expected solicitudId in response');
        assert.strictEqual(getRes.body.solicitudId, id);
        assert.ok(getRes.body && getRes.body.tipoEvento, 'Expected tipoEvento in response');
        assert.strictEqual(getRes.body.tipoEvento, 'FECHA_BANDAS');

        // Verificamos que la metadata de banda haya sido migrada/guardada y retornada
        assert.ok(getRes.body.hasOwnProperty('nombreBanda'));
        assert.strictEqual(getRes.body.nombreBanda, 'Integration Test Band');
        assert.ok(getRes.body.hasOwnProperty('bandaContactoEmail'));
        assert.strictEqual(getRes.body.bandaContactoEmail, 'band@test.local');
        assert.ok(getRes.body.hasOwnProperty('bandaLinkMusica'));
    });
});