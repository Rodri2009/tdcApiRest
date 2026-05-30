const pool = require('./backend/db');

async function testScanner() {
    try {
        console.log('\n📋 [TEST FASE 2 - SCANNER PUERTA]\n');
        console.log('==========================================\n');

        // 1. Obtener un ticket de prueba
        console.log('1️⃣  Obteniendo ticket de prueba...');
        let tickets = await pool.query(
            `SELECT * FROM tickets WHERE estado = 'pagado' LIMIT 1`
        );

        if (!tickets || tickets.length === 0) {
            console.log('❌ No hay tickets con estado pagado para probar\n');
            console.log('Creando ticket de prueba...');
            
            const result = await pool.query(
                `INSERT INTO tickets (id_evento, email, nombre_comprador, cantidad, tipo_precio, total, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [10, 'test@example.com', 'Cliente Test Puerta', 1, 'ANTICIPADA', 5000, 'pagado']
            );
            
            tickets = [{
                id: result.insertId,
                id_evento: 10,
                nombre_comprador: 'Cliente Test Puerta',
                email: 'test@example.com',
                cantidad: 1,
                estado: 'pagado'
            }];
            console.log(`✓ Ticket creado: ID=${tickets[0].id}\n`);
        }

        const ticket = tickets[0];
        console.log(`✓ Ticket encontrado:`);
        console.log(`  - ID: ${ticket.id}`);
        console.log(`  - Evento: ${ticket.id_evento}`);
        console.log(`  - Cliente: ${ticket.nombre_comprador}`);
        console.log(`  - Email: ${ticket.email}`);
        console.log(`  - Estado: ${ticket.estado}`);
        console.log(`  - Cantidad: ${ticket.cantidad}\n`);

        // 2. Generar QR data
        const timestamp = Date.now();
        const qrData = JSON.stringify({
            ticketId: ticket.id,
            eventoId: ticket.id_evento,
            codigo: `TKT${ticket.id}${timestamp}`
        });

        console.log('2️⃣  Datos del QR a escanear:\n');
        console.log(JSON.stringify(JSON.parse(qrData), null, 2));
        console.log();

        // 3. Verificar estado actual
        console.log('3️⃣  Estado ACTUAL del ticket:');
        const current = await pool.query(
            `SELECT id, estado, cantidad_utilizada, fecha_escaneo FROM tickets WHERE id = ?`,
            [ticket.id]
        );
        console.log(current[0]);
        console.log();

        // 4. Instrucción para obtener JWT
        console.log('4️⃣  Obtener token JWT:\n');
        console.log('Debes logearte como admin y copiar el token de localStorage:');
        console.log('  - Abre: http://localhost/login.html');
        console.log('  - Ingresa: email admin y contraseña');
        console.log('  - Abre DevTools (F12) → Console');
        console.log('  - Ejecuta: localStorage.getItem("authToken")\n');

        // 5. CURL para testear
        console.log('5️⃣  CURL para testear:\n');
        const curlCmd = `curl -X PUT http://localhost:3000/api/tickets/${ticket.id}/validar \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <PEGA_JWT_AQUI>" \\
  -d '{"evento_id": ${ticket.id_evento}, "codigo": "TKT${ticket.id}${timestamp}"}'`;
        
        console.log(curlCmd);
        console.log('\n📋 Reemplaza <PEGA_JWT_AQUI> con el token copiado.\n');

        // 6. Instrucción para verificar resultado
        console.log('6️⃣  Después de ejecutar curl, verifica:\n');
        console.log(`SELECT id, estado, cantidad_utilizada, fecha_escaneo FROM tickets WHERE id = ${ticket.id};`);
        console.log('\nDebe cambiar estado a "utilizado" y cantidad_utilizada a 1\n');

        console.log('✅ Test setup completado\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

testScanner().catch(console.error);
