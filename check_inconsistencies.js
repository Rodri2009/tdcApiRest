#!/usr/bin/env node
/**
 * check_inconsistencies.js
 * Script para verificar inconsistencias en el schema sin afectar datos
 * Ejecutar: node check_inconsistencies.js
 */

const mariadb = require('mariadb');

async function main() {
    let conn;
    try {
        // Conectar a BD
        const pool = mariadb.createPool({
            host: '127.0.0.1',
            user: 'tdc_user',
            password: 'tdc_password',
            database: 'tdc_db',
            connectionLimit: 5
        });

        conn = await pool.getConnection();
        console.log('\n✅ Conectado a MariaDB\n');

        // ============================================================================
        // VERIFICACIÓN 1: solicitudes_bandas.id_solicitud
        // ============================================================================
        console.log('═'.repeat(80));
        console.log('VERIFICACIÓN 1: Estructura de solicitudes_bandas.id_solicitud');
        console.log('═'.repeat(80));
        
        const cols = await conn.query(`
            SELECT COLUMN_NAME, COLUMN_KEY, EXTRA, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'solicitudes_bandas' AND COLUMN_NAME = 'id_solicitud'
        `);
        
        console.log('\nResultado:');
        console.log(cols[0]);
        
        const hasAutoIncrement = cols[0].EXTRA && cols[0].EXTRA.includes('auto_increment');
        console.log(`\n⚠️  AUTO_INCREMENT en id_solicitud: ${hasAutoIncrement ? 'SÍ (PROBLEMA)' : 'NO (OK)'}`);

        // ============================================================================
        // VERIFICACIÓN 2: Huérfanos en solicitudes_bandas
        // ============================================================================
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN 2: Huérfanos en solicitudes_bandas');
        console.log('═'.repeat(80));
        
        const huerfanosBandas = await conn.query(`
            SELECT COUNT(*) as count, GROUP_CONCAT(id_solicitud) as ids
            FROM solicitudes_bandas sb
            WHERE NOT EXISTS (SELECT 1 FROM solicitudes s WHERE s.id = sb.id_solicitud)
        `);
        
        console.log(`\nHuérfanos encontrados: ${huerfanosBandas[0].count}`);
        if (huerfanosBandas[0].count > 0) {
            console.log(`IDs huérfanos: ${huerfanosBandas[0].ids}`);
        }

        // ============================================================================
        // VERIFICACIÓN 3: Huérfanos en solicitudes_alquiler
        // ============================================================================
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN 3: Huérfanos en solicitudes_alquiler');
        console.log('═'.repeat(80));
        
        const huerfanosAlquiler = await conn.query(`
            SELECT COUNT(*) as count, GROUP_CONCAT(id_solicitud) as ids
            FROM solicitudes_alquiler sa
            WHERE NOT EXISTS (SELECT 1 FROM solicitudes s WHERE s.id = sa.id_solicitud)
        `);
        
        console.log(`\nHuérfanos encontrados: ${huerfanosAlquiler[0].count}`);
        if (huerfanosAlquiler[0].count > 0) {
            console.log(`IDs huérfanos: ${huerfanosAlquiler[0].ids}`);
        }

        // ============================================================================
        // VERIFICACIÓN 4: Inconsistencia entre categoría y tabla específica
        // ============================================================================
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN 4: Sincronización categoría ↔ tabla específica');
        console.log('═'.repeat(80));
        
        const bandaInconsistencias = await conn.query(`
            SELECT 
                s.id,
                s.categoria,
                sb.id_solicitud as en_bandas,
                CASE 
                    WHEN s.categoria IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NOT NULL THEN 'OK'
                    WHEN s.categoria IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NULL THEN '❌ BANDA sin solicitudes_bandas'
                    WHEN s.categoria NOT IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NOT NULL THEN '❌ No BANDA pero tiene solicitudes_bandas'
                    ELSE 'OK'
                END AS validacion
            FROM solicitudes s
            LEFT JOIN solicitudes_bandas sb ON sb.id_solicitud = s.id
            WHERE s.categoria IN ('BANDA', 'BANDAS')
            ORDER BY s.id
        `);
        
        console.log('\nBandas (categoría=BANDA o BANDAS):');
        bandaInconsistencias.forEach(row => {
            console.log(`  ID ${row.id}: categoria=${row.categoria}, tabla_bandas=${row.en_bandas ? 'SÍ' : 'NO'} → ${row.validacion}`);
        });

        const alquilerInconsistencias = await conn.query(`
            SELECT 
                s.id,
                s.categoria,
                sa.id_solicitud as en_alquiler,
                CASE 
                    WHEN s.categoria = 'ALQUILER' AND sa.id_solicitud IS NOT NULL THEN 'OK'
                    WHEN s.categoria = 'ALQUILER' AND sa.id_solicitud IS NULL THEN '❌ ALQUILER sin solicitudes_alquiler'
                    WHEN s.categoria != 'ALQUILER' AND sa.id_solicitud IS NOT NULL THEN '❌ No ALQUILER pero tiene solicitudes_alquiler'
                    ELSE 'OK'
                END AS validacion
            FROM solicitudes s
            LEFT JOIN solicitudes_alquiler sa ON sa.id_solicitud = s.id
            WHERE s.categoria = 'ALQUILER'
            ORDER BY s.id
        `);
        
        console.log('\nAlquileres (categoría=ALQUILER):');
        alquilerInconsistencias.forEach(row => {
            console.log(`  ID ${row.id}: categoria=${row.categoria}, tabla_alquiler=${row.en_alquiler ? 'SÍ' : 'NO'} → ${row.validacion}`);
        });

        // ============================================================================
        // VERIFICACIÓN 5: eventos_confirmados integridad
        // ============================================================================
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN 5: Eventos confirmados - integridad de referencias');
        console.log('═'.repeat(80));
        
        const eventosProblema = await conn.query(`
            SELECT 
                ec.id,
                ec.id_solicitud,
                ec.tipo_evento,
                ec.tabla_origen,
                s.id as solicitud_existe,
                s.categoria,
                ec.nombre_evento
            FROM eventos_confirmados ec
            LEFT JOIN solicitudes s ON s.id = ec.id_solicitud
            ORDER BY ec.id
        `);
        
        console.log('\nEventos confirmados:');
        eventosProblema.forEach(row => {
            const status = row.solicitud_existe ? '✓' : '❌';
            console.log(`  ${status} evento_id=${row.id}, solicitud_id=${row.id_solicitud} (${row.solicitud_existe ? 'EXISTE' : 'NO EXISTE'}), tipo=${row.tipo_evento}, nombre="${row.nombre_evento}"`);
        });

        // ============================================================================
        // RESUMEN DE PROBLEMAS
        // ============================================================================
        console.log('\n' + '═'.repeat(80));
        console.log('📋 RESUMEN DE INCONSISTENCIAS');
        console.log('═'.repeat(80));
        
        const problemas = [
            { nombre: 'id_solicitud con AUTO_INCREMENT', existe: hasAutoIncrement },
            { nombre: 'Huérfanos en solicitudes_bandas', existe: huerfanosBandas[0].count > 0 },
            { nombre: 'Huérfanos en solicitudes_alquiler', existe: huerfanosAlquiler[0].count > 0 },
            { nombre: 'Inconsistencias de categoría', existe: bandaInconsistencias.some(r => r.validacion.includes('❌')) || alquilerInconsistencias.some(r => r.validacion.includes('❌')) },
            { nombre: 'Eventos sin solicitud parent', existe: eventosProblema.some(r => !r.solicitud_existe) }
        ];
        
        const problemasEncontrados = problemas.filter(p => p.existe);
        
        if (problemasEncontrados.length === 0) {
            console.log('\n✅ No se encontraron inconsistencias críticas');
        } else {
            console.log(`\n⚠️  Se encontraron ${problemasEncontrados.length} inconsistencias:\n`);
            problemasEncontrados.forEach((p, i) => {
                console.log(`  ${i+1}. ${p.nombre}`);
            });
        }
        
        console.log('\n' + '═'.repeat(80) + '\n');
        
        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

main();
