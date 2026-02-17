#!/usr/bin/env node
/** referencia a utilidades de verificación (scripts `check_*` eliminados) */

const mariadb = require('mariadb');

async function main() {
    const pool = mariadb.createPool({
        host: process.env.DB_HOST || 'mariadb',
        user: process.env.DB_USER || 'tdc_user',
        password: process.env.DB_PASSWORD || 'tdc_password',
        database: process.env.DB_NAME || 'tdc_db',
        connectionLimit: 5,
        waitForConnections: true,
        enableKeepAlive: true
    });

    let conn;
    try {
        conn = await pool.getConnection();
        console.log('\n✅ Conectado a MariaDB\n');

        // ============================================
        // VERIFICACIÓN 1
        // ============================================
        console.log('═'.repeat(80));
        console.log('VERIFICACIÓN 1: id_solicitud en solicitudes_bandas');
        console.log('═'.repeat(80));
        
        const cols = await conn.query(`
            SELECT COLUMN_NAME, COLUMN_KEY, EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'solicitudes_bandas' AND COLUMN_NAME = 'id_solicitud'
        `);
        
        if (cols.length > 0) {
            const col = cols[0];
            console.log(`\nid_solicitud: COLUMN_KEY=${col.COLUMN_KEY}, EXTRA=${col.EXTRA || '(ninguno)'}`);
            const autoInc = col.EXTRA && col.EXTRA.includes('auto_increment');
            console.log(`→ AUTO_INCREMENT: ${autoInc ? '❌ SÍ (PROBLEMA)' : '✅ NO (OK)'}\n`);
        }

        // ============================================
        // VERIFICACIÓN 2
        // ============================================
        console.log('═'.repeat(80));
        console.log('VERIFICACIÓN 2: Huérfanos en solicitudes_bandas');
        console.log('═'.repeat(80));
        
        const huerfanos = await conn.query(`
            SELECT COUNT(*) as count
            FROM solicitudes_bandas sb
            WHERE NOT EXISTS (SELECT 1 FROM solicitudes s WHERE s.id = sb.id_solicitud)
        `);
        
        console.log(`\nHuérfanos encontrados: ${huerfanos[0].count}\n`);

        // ============================================
        // VERIFICACIÓN 3
        // ============================================
        console.log('═'.repeat(80));
        console.log('VERIFICACIÓN 3: Integridad solicitudes_bandas vs solicitudes');
        console.log('═'.repeat(80));
        
        const bandas = await conn.query(`
            SELECT 
                s.id,
                s.categoria,
                CASE WHEN sb.id_solicitud IS NOT NULL THEN 'SÍ' ELSE 'NO' END as en_tabla_banda,
                CASE 
                    WHEN s.categoria IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NOT NULL THEN 'OK'
                    WHEN s.categoria NOT IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NULL THEN 'OK'
                    ELSE 'INCONSISTENTE'
                END AS validacion
            FROM solicitudes s
            LEFT JOIN solicitudes_bandas sb ON sb.id_solicitud = s.id
            ORDER BY s.id
            LIMIT 20
        `);
        
        console.log('\nSolicitudes y consistencia:');
        const problemaBandas = bandas.filter(r => r.validacion === 'INCONSISTENTE');
        bandas.forEach(row => {
            const icon = row.validacion === 'OK' ? '✓' : '❌';
            console.log(`  ${icon} ID ${row.id}: categoria=${row.categoria.padEnd(10)}, en_tabla_banda=${row.en_tabla_banda}`);
        });

        // ============================================
        // VERIFICACIÓN 4
        // ============================================
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN 4: Integridad solicitudes_alquiler vs solicitudes');
        console.log('═'.repeat(80));
        
        const alquileres = await conn.query(`
            SELECT 
                s.id,
                s.categoria,
                CASE WHEN sa.id_solicitud IS NOT NULL THEN 'SÍ' ELSE 'NO' END as en_tabla_alquiler,
                CASE 
                    WHEN s.categoria = 'ALQUILER' AND sa.id_solicitud IS NOT NULL THEN 'OK'
                    WHEN s.categoria != 'ALQUILER' AND sa.id_solicitud IS NULL THEN 'OK'
                    ELSE 'INCONSISTENTE'
                END AS validacion
            FROM solicitudes s
            LEFT JOIN solicitudes_alquiler sa ON sa.id_solicitud = s.id
            WHERE s.id <= 10
            ORDER BY s.id
        `);
        
        console.log('\nSolicitudes de alquiler y consistencia:');
        const problemaAlquiler = alquileres.filter(r => r.validacion === 'INCONSISTENTE');
        alquileres.forEach(row => {
            const icon = row.validacion === 'OK' ? '✓' : '❌';
            console.log(`  ${icon} ID ${row.id}: categoria=${row.categoria.padEnd(10)}, en_tabla_alquiler=${row.en_tabla_alquiler}`);
        });

        // ============================================
        // VERIFICACIÓN 5
        // ============================================
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN 5: Integridad eventos_confirmados');
        console.log('═'.repeat(80));
        
        const eventos = await conn.query(`
            SELECT 
                ec.id,
                ec.id_solicitud,
                ec.tipo_evento,
                ec.nombre_evento,
                CASE WHEN s.id IS NOT NULL THEN 'SÍ' ELSE 'NO' END as solicitud_existe
            FROM eventos_confirmados ec
            LEFT JOIN solicitudes s ON s.id = ec.id_solicitud
            ORDER BY ec.id
        `);
        
        console.log('\nEventos confirmados e integridad:');
        const problemaEventos = eventos.filter(r => r.solicitud_existe === 'NO');
        eventos.forEach(row => {
            const status = row.solicitud_existe === 'SÍ' ? '✓' : '❌';
            console.log(`  ${status} evento_id=${row.id}, solicitud_id=${row.id_solicitud} (existe=${row.solicitud_existe}), tipo=${row.tipo_evento}`);
        });

        // ============================================
        // RESUMEN
        // ============================================
        console.log('\n' + '═'.repeat(80));
        console.log('📋 RESUMEN DE INCONSISTENCIAS');
        console.log('═'.repeat(80));
        
        const totalProblemas = problemaBandas.length + problemaAlquiler.length + problemaEventos.length + huerfanos[0].count;
        const autoIncProblema = cols.length > 0 && cols[0].EXTRA && cols[0].EXTRA.includes('auto_increment') ? 1 : 0;
        
        console.log(`\n  - Huérfanos en solicitudes_bandas: ${huerfanos[0].count}`);
        console.log(`  - Inconsistencias en bandas: ${problemaBandas.length}`);
        console.log(`  - Inconsistencias en alquileres: ${problemaAlquiler.length}`);
        console.log(`  - Eventos sin solicitud parent: ${problemaEventos.length}`);
        console.log(`  - id_solicitud con AUTO_INCREMENT: ${autoIncProblema ? 'SÍ ❌' : 'NO ✅'}`);
        
        const total = totalProblemas + autoIncProblema;
        if (total === 0) {
            console.log(`\n✅ NO hay inconsistencias críticas\n`);
        } else {
            console.log(`\n⚠️  Total de problemas encontrados: ${total}\n`);
        }

        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        if (conn) conn.release();
        process.exit(1);
    }
}

main();
