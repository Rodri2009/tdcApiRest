#!/usr/bin/env node
/**
 * check_inconsistencies_via_backend.js
 * Script para verificar inconsistencias usando mariadb
 */

const mariadb = require('mariadb');

async function main() {
    let conn;
    try {
        // Intentar conexión con diferentes usuarios
        const configs = [
            { user: 'root', password: '', host: 'mariadb' },
            { user: 'root', password: 'root', host: 'mariadb' },
            { user: 'tdc_user', password: 'tdc_password', host: 'mariadb' },
            { user: 'root', password: '', host: 'localhost' }
        ];

        console.log('Intentando conectar a MariaDB...\n');
        
        let connected = false;
        for (const config of configs) {
            try {
                conn = await mysql.createConnection({
                    host: config.host,
                    user: config.user,
                    password: config.password,
                    database: 'tdc_db'
                });
                console.log(`✅ Conectado como ${config.user}@${config.host}\n`);
                connected = true;
                break;
            } catch (e) {
                continue;
            }
        }

        if (!connected) {
            throw new Error('No se pudo conectar con ninguna configuración');
        }

        // ============================================
        // VERIFICACIÓN 1
        // ============================================
        console.log('═'.repeat(80));
        console.log('VERIFICACIÓN 1: id_solicitud en solicitudes_bandas');
        console.log('═'.repeat(80));
        
        const [cols] = await conn.execute(`
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
        
        const [huerfanos] = await conn.execute(`
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
        
        const [bandas] = await conn.execute(`
            SELECT 
                s.id,
                s.categoria,
                CASE WHEN sb.id_solicitud IS NOT NULL THEN 'SÍ' ELSE 'NO' END as en_tabla_banda,
                CASE 
                    WHEN s.categoria IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NOT NULL THEN '✓'
                    WHEN s.categoria NOT IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NULL THEN '✓'
                    ELSE '❌'
                END AS validacion
            FROM solicitudes s
            LEFT JOIN solicitudes_bandas sb ON sb.id_solicitud = s.id
            WHERE s.categoria IN ('BANDA', 'BANDAS', 'ALQUILER')
            ORDER BY s.id
        `);
        
        console.log('\nSolicitudes y consistencia:');
        bandas.forEach(row => {
            console.log(`  ${row.validacion} ID ${row.id}: categoria=${row.categoria.padEnd(10)}, en_tabla_banda=${row.en_tabla_banda}`);
        });

        // ============================================
        // VERIFICACIÓN 4
        // ============================================
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN 4: Integridad solicitudes_alquiler vs solicitudes');
        console.log('═'.repeat(80));
        
        const [alquileres] = await conn.execute(`
            SELECT 
                s.id,
                s.categoria,
                CASE WHEN sa.id_solicitud IS NOT NULL THEN 'SÍ' ELSE 'NO' END as en_tabla_alquiler,
                CASE 
                    WHEN s.categoria = 'ALQUILER' AND sa.id_solicitud IS NOT NULL THEN '✓'
                    WHEN s.categoria != 'ALQUILER' AND sa.id_solicitud IS NULL THEN '✓'
                    ELSE '❌'
                END AS validacion
            FROM solicitudes s
            LEFT JOIN solicitudes_alquiler sa ON sa.id_solicitud = s.id
            WHERE s.id <= 10
            ORDER BY s.id
        `);
        
        console.log('\nSolicitudes de alquiler y consistencia:');
        alquileres.forEach(row => {
            console.log(`  ${row.validacion} ID ${row.id}: categoria=${row.categoria.padEnd(10)}, en_tabla_alquiler=${row.en_tabla_alquiler}`);
        });

        // ============================================
        // VERIFICACIÓN 5
        // ============================================
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN 5: Integridad eventos_confirmados');
        console.log('═'.repeat(80));
        
        const [eventos] = await conn.execute(`
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
        eventos.forEach(row => {
            const status = row.solicitud_existe === 'SÍ' ? '✓' : '❌';
            console.log(`  ${status} evento_id=${row.id}, solicitud_id=${row.id_solicitud} (${row.solicitud_existe}), tipo=${row.tipo_evento}, nombre="${row.nombre_evento}"`);
        });

        // ============================================
        // RESUMEN
        // ============================================
        console.log('\n' + '═'.repeat(80));
        console.log('📋 RESUMEN');
        console.log('═'.repeat(80));
        console.log('\n✅ Verificación completada\n');

        await conn.end();
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

main();
