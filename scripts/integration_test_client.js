// Simple integration test: POST /api/solicitudes and verify clientes + solicitudes
const http = require('http');
const pool = require('../backend/db');

function postJson(path, data) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json)
      }
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null }));
    });
    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

(async () => {
  console.log('Running integration test: create alquiler solicitud');
  const payload = {
    tipoEvento: 'ALQUILER_SALON',
    fechaEvento: '2026-06-01',
    horaInicio: '18:00',
    precioBase: 12345,
    nombreCompleto: 'Test Cliente XYZ',
    telefono: '1555123456',
    email: 'test.client.xyz@example.com',
    descripcion: 'Prueba automatizada'
  };

  try {
    const res = await postJson('/api/solicitudes', payload);
    console.log('POST response status:', res.status);
    console.log('POST body:', res.body);
    if (res.status !== 201) {
      throw new Error('Expected 201 Created');
    }

    // Check DB: find client by email
    const conn = await pool.getConnection();
    const [cliente] = await conn.query('SELECT * FROM clientes WHERE email = ? LIMIT 1', [payload.email]);
    if (!cliente || !cliente.id) {
      throw new Error('Cliente no creado o no encontrado');
    }
    console.log('Cliente creado OK:', { id: cliente.id, nombre: cliente.nombre, email: cliente.email });

    const [sol] = await conn.query('SELECT * FROM solicitudes WHERE cliente_id = ? LIMIT 1', [cliente.id]);
    if (!sol || !sol.id) {
      throw new Error('Solicitud no asociada al cliente');
    }
    console.log('Solicitud creada y asociada OK:', { solicitudId: sol.id, cliente_id: sol.cliente_id });

    // Clean up
    await conn.query('DELETE FROM solicitudes_alquiler WHERE id_solicitud = ?', [sol.id]);
    await conn.query('DELETE FROM solicitudes WHERE id = ?', [sol.id]);
    await conn.query('DELETE FROM clientes WHERE id = ?', [cliente.id]);
    conn.release();

    console.log('Integration test passed ✅');
    process.exit(0);
  } catch (err) {
    console.error('Integration test failed ❌', err);
    process.exit(1);
  }
})();