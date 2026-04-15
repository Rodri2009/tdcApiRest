#!/usr/bin/env node

const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'sys81902root',
    database: 'tdc_db',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

async function checkAllPublic() {
    let conn;
    try {
        conn = await pool.getConnection();
        
        console.log('📋 Todas las Solicitudes Públicas (sin filtro de fecha):\n');
        const result = await conn.query(`
            SELECT 
                s.id_solicitud,
                s.categoria,
                s.descripcion_corta as nombre,
                s.fecha_evento,
                s.estado,
                s.es_publico
            FROM solicitudes s
            WHERE s.es_publico = 1 
              AND s.estado = 'Confirmado'
            ORDER BY s.fecha_evento DESC
        `);
        
        if (result.length === 0) {
            console.log('❌ No hay solicitudes públicas confirmadas\n');
        } else {
            result.forEach(row => {
                const icon = row.categoria === 'BANDAS' ? '🎸' : (row.categoria === 'TALLERES' ? '🎨' : '🎪');
                const fecha = row.fecha_evento ? new Date(row.fecha_evento).toISOString().split('T')[0] : 'SIN FECHA';
                const futuro = row.fecha_evento && new Date(row.fecha_evento) > new Date() ? '✓' : '⚠️';
                console.log(`${futuro} ${icon} [${row.id_solicitud}] ${row.nombre}`);
                console.log(`   Fecha: ${fecha} | Estado: ${row.estado}\n`);
            });
        }
        
        // Verificar tabla solicitudes_fechas_bandas
        console.log('\n🎸 Solicitudes de Bandas (solicitudes_fechas_bandas):\n');
        const bandas = await conn.query(`
            SELECT 
                sfb.id_solicitud,
                sfb.fecha_evento,
                sfb.hora_evento,
                s.descripcion_corta,
                s.es_publico
            FROM solicitudes_fechas_bandas sfb
            JOIN solicitudes s ON s.id_solicitud = sfb.id_solicitud
            ORDER BY sfb.fecha_evento
        `);
        
        bandas.forEach(row => {
            const futuro = row.fecha_evento && new Date(row.fecha_evento + ' 00:00:00') > new Date() ? '✓' : '✗';
            console.log(`${futuro} [${row.id_solicitud}] ${row.descripcion_corta}`);
            console.log(`   Fecha: ${row.fecha_evento} ${row.hora_evento} | Público: ${row.es_publico ? 'SÍ' : 'NO'}\n`);
        });
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (conn) conn.end();
        await pool.end();
        process.exit(0);
    }
}

checkAllPublic();
