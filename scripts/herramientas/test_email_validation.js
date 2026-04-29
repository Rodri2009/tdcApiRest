/**
 * Test: Validaci\u00f3n de email duplicado en actualizaci\u00f3n de cliente
 * - Intenta actualizar un cliente con un email que ya existe
 * - Debe retornar 400 (Bad Request) en lugar de 500
 */

const http = require('http');
const fs = require('fs');

// Leer token desde archivo de test (si existe) o usar uno dummy
const tokenPath = '../test_token.txt'; // Ruta actualizada
let testToken = 'test-token-placeholder';

if (fs.existsSync(tokenPath)) {
    testToken = fs.readFileSync(tokenPath, 'utf8').trim();
}

console.log('[TEST] \ud83d\udd10 Token:', testToken.substring(0, 20) + '...');

// Test 1: Intentar actualizar cliente con email duplicado
const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/clientes/11', // ID del cliente maria.garcia
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('[TEST] \ud83d\udcca Status:', res.statusCode);
        console.log('[TEST] \ud83d\udce5 Response:', body);
        console.log('[TEST] \u2713 Test completado');
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error('[TEST] \u274c Error:', e.message);
    process.exit(1);
});

// Intenta actualizar con email que ya existe en otro cliente
const payload = {
    nombre: 'Maria Garcia',
    email: 'test@example.com', // Email que podr\u00eda existir
    telefono: '555-1234'
};

console.log('[TEST] \ud83d\udce4 Payload:', JSON.stringify(payload, null, 2));
req.write(JSON.stringify(payload));
req.end();