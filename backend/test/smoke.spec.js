const request = require('supertest');
const assert = require('assert');
const app = require('../server');

describe('Smoke: Endpoints públicos básicos', function () {
    this.timeout(20000);

    it('GET endpoints should not return 500', async () => {
        const endpoints = [
            '/api/opciones/tipos-evento',
            '/api/opciones/adicionales',
            '/api/opciones/config',
            '/api/opciones/tarifas',
            '/api/opciones/duraciones',
            '/api/opciones/horarios',
            '/api/opciones/cantidades',
            '/api/opciones/fechas-ocupadas',

            '/api/servicios/tipos',
            '/api/servicios/catalogo',
            '/api/servicios/profesionales/lista',
            '/api/servicios/precios/lista',
            '/api/servicios/turnos/disponibles',

            '/api/bandas/instrumentos',
            '/api/bandas/buscar?q=test',
            '/api/bandas',

            '/api/talleres/tipos',
            '/api/talleres',
            '/api/talleres/talleristas/lista',
            '/api/talleres/precios/lista',

            '/api/tickets/fechas_bandas_confirmadas'
        ];

        for (const ep of endpoints) {
            const res = await request(app).get(ep);
            // Fail if server error
            assert.ok(res.status < 500, `Endpoint ${ep} returned ${res.status}`);
        }
    });

    it('POST endpoints create resources (status 2xx)', async () => {
        const posts = [
            {
                path: '/api/solicitudes',
                payload: {
                    tipoEvento: 'SERVICIOS',
                    cantidadPersonas: 1,
                    duracionEvento: '1h',
                    fechaEvento: '2026-03-05',
                    horaInicio: '09:00',
                    precioBase: 1200,
                    fingerprintId: 'smoke_test_1',
                    servicio_id: 'DEPILACION',
                    profesional_id: 5
                }
            },
            {
                path: '/api/bandas/solicitudes',
                payload: {
                    nombre_banda: 'SmokeTest Band',
                    contacto_nombre: 'Smoke',
                    contacto_email: 'smoke@example.local',
                    contacto_whatsapp: '+549112345000',
                    mensaje: 'Prueba smoke'
                }
            },
            {
                path: '/api/test/email',
                payload: { to: 'admin@example.local', subject: 'Smoke test', body: 'Esto es una prueba' }
            }
        ];

        for (const p of posts) {
            const res = await request(app).post(p.path).send(p.payload);
            assert.ok(res.status >= 200 && res.status < 300, `${p.path} returned ${res.status}`);
        }
    });

    it('Create a solicitud and verify detail + finalizar', async () => {
        const payload = {
            tipoEvento: 'SERVICIOS',
            cantidadPersonas: 1,
            duracionEvento: '1h',
            fechaEvento: '2026-03-05',
            horaInicio: '09:00',
            precioBase: 1200,
            fingerprintId: 'smoke_test_2',
            servicio_id: 'DEPILACION',
            profesional_id: 5
        };

        const postRes = await request(app).post('/api/solicitudes').send(payload).expect(201);
        assert.ok(postRes.body && postRes.body.id, 'Expected id in create response');
        const id = postRes.body.id;

        await request(app).get(`/api/solicitudes/${id}`).expect(200);

        await request(app).put(`/api/solicitudes/${id}/finalizar`).send({
            nombreCompleto: 'Smoke Final',
            celular: '+549112345000',
            email: 'smokefinal@example.local',
            detallesAdicionales: 'OK'
        }).expect(200);
    });
});
