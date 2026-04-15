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

async function fixSolicitudesCompletely() {
    let conn;
    try {
        conn = await pool.getConnection();
        
        console.log('🔧 Aplicando correcciones completas de sincronización...\n');
        
        // Fix solicitud 4: actualizar fecha de 2026-03-30 (PASADA) a 2026-05-09 (FUTURA)
        console.log('📅 Corrigiendo solicitud 4 (Reite Fecha Propia):');
        console.log('   - Actualizando fecha_evento en solicitudes');
        await conn.query('UPDATE solicitudes SET fecha_evento = ?, hora_inicio = ?, duracion_minutos = 390 WHERE id_solicitud = 4', ['2026-05-09', '22:00:00']);
        console.log('   - Actualizando fecha_evento en solicitudes_fechas_bandas');
        await conn.query('UPDATE solicitudes_fechas_bandas SET fecha_evento = ? WHERE id_solicitud = 4', ['2026-05-09']);
        
        // Verificar que solicitud 6 esté en la tabla solicitudes
        console.log('\n📅 Verificando solicitud 6 (Termidor Fest)...');
        const sol6 = await conn.query('SELECT * FROM solicitudes WHERE id_solicitud = 6');
        
        if (sol6.length === 0) {
            console.log('   ⚠️  Solicitud 6 NO EXISTE en tabla solicitudes, insertando...');
            await conn.query(`
                INSERT INTO solicitudes 
                (id_solicitud, categoria, id_cliente, estado, es_publico, descripcion_corta, descripcion_larga, url_flyer, fecha_evento, hora_inicio, duracion_minutos)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [6, 'BANDAS', 4, 'Confirmado', 1, 'Termidor Fest', 'Rock nacional solicita fecha compartida con banda telonera. Esperan 200 personas.', '/uploads/flyers/solicitud_6.jpeg', '2026-04-18', '21:00:00', 450]);
            console.log('   ✅ Solicitud 6 insertada correctamente');
        } else {
            console.log('   ✅ Solicitud 6 existe, verificando que sea pública...');
            if (!sol6[0].es_publico) {
                await conn.query('UPDATE solicitudes SET es_publico = 1 WHERE id_solicitud = 6');
                console.log('   ✅ Solicitud 6 marcada como pública');
            }
        }
        
        console.log('\n✅ Correcciones completadas exitosamente!\n');
        
        // Mostrar resumen final
        console.log('📊 RESUMEN FINAL DE SOLICITUDES PÚBLICAS FUTURAS:\n');
        const result = await conn.query(`
            SELECT 
                s.id_solicitud,
                s.categoria,
                s.descripcion_corta as nombre,
                s.fecha_evento,
                s.hora_inicio,
                s.estado,
                s.es_publico
            FROM solicitudes s
            WHERE s.es_publico = 1 
              AND s.estado = 'Confirmado'
              AND (s.fecha_evento IS NULL OR s.fecha_evento >= CURDATE())
            ORDER BY s.fecha_evento IS NULL, s.fecha_evento
        `);
        
        result.forEach((row, idx) => {
            const icon = row.categoria === 'BANDAS' ? '🎸' : (row.categoria === 'TALLERES' ? '🎨' : '🎪');
            const fecha = row.fecha_evento ? new Date(row.fecha_evento).toISOString().split('T')[0] : 'SIN FECHA';
           console.log(`${idx+1}. ${icon} [${row.id_solicitud}] ${row.nombre}`);
            console.log(`   Fecha: ${fecha} ${row.hora_inicio || ''} | Estado: ${row.estado}`);
        });
        
        console.log(`\n✨ Total de eventos públicos disponibles: ${result.length}`);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        if (conn) conn.end();
        await pool.end();
        process.exit(0);
    }
}

fixSolicitudesCompletely();
