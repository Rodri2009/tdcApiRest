const db = require('./db.js');
require('dotenv').config();

(async () => {
    try {
        console.log('\n=== Verificando solicitud tll_8 ===\n');
        
        const result1 = await db.query('SELECT * FROM solicitudes_talleres WHERE id_solicitud = 8');
        if (!result1 || result1.length === 0) {
            console.log('❌ NO existe registro en solicitudes_talleres');
        } else {
            console.log('✅ Encontrado en solicitudes_talleres:');
            console.log(JSON.stringify(result1[0], null, 2));
        }
        
        const result2 = await db.query('SELECT * FROM solicitudes WHERE id_solicitud = 8');
        if (!result2 || result2.length === 0) {
            console.log('\n❌ NO existe registro en solicitudes');
        } else {
            console.log('\n✅ Encontrado en solicitudes:');
            console.log('  - ID cliente:', result2[0].id_cliente);
            console.log('  - Estado:', result2[0].estado);
            console.log('  - Tipo solicitud:', result2[0].tipo_solicitud);
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
