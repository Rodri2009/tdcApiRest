#!/usr/bin/env node

/**
 * Script para ejecutar correcciones en la base de datos
 * Uso: node fix_db.js
 */

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

async function fixPublicSolicitudes() {
    let conn;
    try {
        conn = await pool.getConnection();

        console.log('🔧 Iniciando correcciones de base de datos...\n');

        // Fix 1: Actualizar solicitud 5 a fecha futura
        console.log('📅 Actualizando solicitud 5 (Bandas tributo): 2026-04-11 → 2026-04-25');
        await conn.query('UPDATE solicitudes SET fecha_evento = ?, duracion_minutos = 360 WHERE id_solicitud = 5', ['2026-04-25']);
        // REMOVED: fecha_evento ya no existe en solicitudes_fechas_bandas; usa solicitudes.fecha_evento

        // Fix 2: Actualizar solicitud 8 (taller) a fecha futura
        console.log('📅 Actualizando solicitud 8 (Taller de Masaje): SIN FECHA → 2026-04-22');
        await conn.query('UPDATE solicitudes SET fecha_evento = ?, hora_inicio = ? WHERE id_solicitud = 8', ['2026-04-22', '10:00:00']);
        await conn.query('UPDATE solicitudes_talleres SET fecha_evento = ?, hora_evento = ? WHERE id_solicitud = 8', ['2026-04-22', '10:00:00']);

        console.log('\n✅ Correcciones aplicadas exitosamente!\n');

        // Verificar resultados
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
              AND s.fecha_evento IS NOT NULL
            ORDER BY s.fecha_evento
        `);

        console.log('📋 Solicitudes Públicas Confirmadas (Futuras):\n');
        result.forEach(row => {
            const icon = row.categoria === 'BANDAS' ? '🎸' : (row.categoria === 'TALLERES' ? '🎨' : '🎪');
            console.log(`${icon} [${row.id_solicitud}] ${row.nombre}`);
            console.log(`   Fecha: ${row.fecha_evento} | Estado: ${row.estado} | Público: ${row.es_publico ? 'SÍ' : 'NO'}\n`);
        });

        if (result.length === 0) {
            console.log('⚠️  No hay solicitudes públicas futuras registradas.\n');
        } else {
            console.log(`✅ Total de eventos públicos futuros: ${result.length}`);
        }

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    } finally {
        if (conn) conn.end();
        await pool.end();
        process.exit(0);
    }
}

fixPublicSolicitudes();
