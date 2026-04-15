#!/usr/bin/env node

/**
 * Análisis detallado de inconsistencias SQL
 */

const fs = require('fs');
const mariadb = require('mariadb');

const SEED_FILE = 'database/02_seed.sql';
const DUMP_FILE = 'database/mysqldump_latest.sql';

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: 'sys81902root',
    database: 'tdc_db'
});

function extractInsertValues(sqlContent, tableName) {
    const regex = new RegExp('INSERT INTO `' + tableName + '`[^(]*\\(([^)]*)\\)[\\s\\S]*?VALUES\\s*([\\s\\S]*?);');
    const match = sqlContent.match(regex);
    if (!match) return null;
    
    const columns = match[1].split(',').map(c => c.trim().replace('`', ''));
    const valuesStr = match[2];
    
    return { columns, valuesStr };
}

async function compareWithDB() {
    let conn;
    try {
        conn = await pool.getConnection();
        
        console.log('🔍 ANÁLISIS DETALLADO DE INCONSISTENCIAS SQL');
        console.log('='.repeat(70) + '\n');

        const seedContent = fs.readFileSync(SEED_FILE, 'utf8');
        const dumpContent = fs.readFileSync(DUMP_FILE, 'utf8');

        // 1. Verificar eventos_confirmados
        console.log('1️⃣  TABLA: eventos_confirmados');
        console.log('-'.repeat(70));
        
        const eventsInSeed = extractInsertValues(seedContent, 'eventos_confirmados');
        const eventsInDump = extractInsertValues(dumpContent, 'eventos_confirmados');
        const eventsInDB = await conn.query('SELECT COUNT(*) as cnt FROM eventos_confirmados');
        
        console.log(`   SEED.SQL:              ${eventsInSeed ? '✓ HAS DATA' : '❌ NO DATA'}`);
        console.log(`   MYSQLDUMP_LATEST:      ${eventsInDump ? '✓ HAS DATA' : '❌ NO DATA'}`);
        console.log(`   Database (actual):     ${eventsInDB[0].cnt} registros`);
        
        if (eventsInDB[0].cnt > 0) {
            const events = await conn.query('SELECT id, id_solicitud, nombre_evento, tipo_evento FROM eventos_confirmados');
            console.log(`   🔴 PROBLEMA: BD tiene ${events.length} eventos pero SEED no los tiene`);
            events.slice(0, 3).forEach(e => {
                console.log(`      - [${e.id}] ${e.nombre_evento} (solicitud ${e.id_solicitud})`);
            });
        }

        // 2. Verificar fechas en solicitudes
        console.log('\n2️⃣  FECHAS DE SOLICITUDES - Sincronización');
        console.log('-'.repeat(70));
        
        const solicitudes = await conn.query(`
            SELECT id_solicitud, descripcion_corta, fecha_evento, estado, es_publico
            FROM solicitudes 
            WHERE es_publico = 1 AND estado = 'Confirmado'
            ORDER BY id_solicitud
        `);
        
        console.log('\n   BD ACTUAL (después de correcciones):');
        solicitudes.forEach(s => {
            const fecha = s.fecha_evento ? s.fecha_evento.toISOString().split('T')[0] : 'NULL';
            console.log(`   [${s.id_solicitud}] ${s.descripcion_corta}: ${fecha}`);
        });

        // Verificar qué está en seed vs dump vs BD
        console.log('\n   COMPARACIÓN SEED vs DUMP vs DB:');
        console.log('   ' + '-'.repeat(65));
        console.log('   | ID | SEED | DUMP | DB |  STATUS  |');
        console.log('   ' + '-'.repeat(65));
        
        const solicitudIds = [4, 5, 6, 8];
        for (const id of solicitudIds) {
            let seedHas = seedContent.includes(`${id},'BANDAS'`) || seedContent.includes(`${id},'TALLERES'`);
            let dumpHas = dumpContent.includes(`${id},'BANDAS'`) || dumpContent.includes(`${id},'TALLERES'`);
            let dbRecord = solicitudes.find(s => s.id_solicitud === id);
            let dbHas = dbRecord ? '✓' : '✗';
            
            const status = (seedHas && dumpHas && dbHas === '✓') ? '✓ OK' : '❌ DESYNC';
            console.log(`   | ${id}  | ${seedHas ? '✓' : '✗'}    | ${dumpHas ? '✓' : '✗'}   | ${dbHas} | ${status} |`);
        }

        // 3. Resumen de problemas
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN DE PROBLEMAS ENCONTRADOS:');
        console.log('='.repeat(70));

        const problems = [];

        if (!eventsInSeed && eventsInDB[0].cnt > 0) {
            problems.push({
                level: '🔴 CRÍTICO',
                desc: 'eventos_confirmados en BD pero NO en SEED',
                impact: 'Si se ejecuta seed, se perderían los eventos',
                solution: 'Actualizar seed.sql con: mysqldump'
            });
        }

        const bdFechas = solicitudes.map(s => s.fecha_evento).filter(Boolean);
        const seedFechasMatch = bdFechas.every(f => {
            const fStr = f.toISOString().split('T')[0];
            return seedContent.includes(fStr);
        });

        if (!seedFechasMatch) {
            problems.push({
                level: '⚠️  ALTO',
                desc: 'Fechas en BD NO coinciden completamente con SEED',
                impact: 'Si se hace reset, se pierden correcciones de fechas',
                solution: 'Ejecutar mysqldump para actualizar seed.sql'
            });
        }

        if (!dumpContent.includes('2026-04-25') || !dumpContent.includes('2026-04-22')) {
            problems.push({
                level: '⚠️  ALTO',
                desc: 'mysqldump_latest.sql está desactualizado',
                impact: 'Cambios recientes no están capturados en backup',
                solution: 'Ejecutar: mysqldump -u root -psys81902root tdc_db > database/mysqldump_latest.sql'
            });
        }

        problems.forEach((p, idx) => {
            console.log(`\n${idx + 1}. ${p.level}`);
            console.log(`   Descripción: ${p.desc}`);
            console.log(`   Impacto:     ${p.impact}`);
            console.log(`   Solución:    ${p.solution}`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('🎯 RECOMENDACIÓN FINAL:');
        console.log('='.repeat(70));
        console.log(`
   Ejecuta este comando para sincronizar el dump con la BD actual:
   
   $ mysqldump -u root -psys81902root tdc_db > database/mysqldump_latest.sql
   
   Luego actualiza seed.sql si es necesario:
   
   $ mysqldump -u root -psys81902root --no-data tdc_db > database/02_schema.sql
   $ mysqldump -u root -psys81902root --skip-extended-insert \\
       --insert-ignore tdc_db > database/02_seed.sql
        `);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (conn) conn.end();
        await pool.end();
    }
}

compareWithDB();
