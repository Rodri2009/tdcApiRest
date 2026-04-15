#!/usr/bin/env node

/**
 * Script para verificar consistencia entre seed.sql y mysqldump_latest.sql
 */

const fs = require('fs');
const path = require('path');

const SEED_FILE = 'database/02_seed.sql';
const DUMP_FILE = 'database/mysqldump_latest.sql';

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function countInserts(content, tableName) {
    const regex = new RegExp('INSERT INTO `' + tableName + '`', 'g');
    const matches = content.match(regex);
    return matches ? matches.length : 0;
}

function extractDates(content) {
    const regex = /(\d{4}-\d{2}-\d{2})/g;
    const matches = content.match(regex);
    return matches ? [...new Set(matches)] : [];
}

function extractRecords(content, tableName) {
    const regex = new RegExp('INSERT INTO `' + tableName + '`[^;]*VALUES\\s*([^;]+);', 's');
    const match = content.match(regex);
    if (!match) return null;
    
    // Parse a simple count of tuples
    const tupleRegex = /\([^)]*\)/g;
    const tuples = match[1].match(tupleRegex) || [];
    return tuples.length;
}

async function main() {
    console.log('🔍 VERIFICACIÓN DE CONSISTENCIA: seed.sql vs mysqldump_latest.sql');
    console.log('===================================================================\n');

    try {
        const seedContent = readFile(SEED_FILE);
        const dumpContent = readFile(DUMP_FILE);

        console.log('📊 ESTADÍSTICAS GENERALES:');
        console.log('---------------------------');
        console.log(`seed.sql:             ${seedContent.length} bytes, ${seedContent.split('\n').length} líneas`);
        console.log(`mysqldump_latest.sql: ${dumpContent.length} bytes, ${dumpContent.split('\n').length} líneas\n`);

        // Críticas tablas para verificar
        const tablesToCheck = [
            'bandas_artistas',
            'solicitudes',
            'solicitudes_fechas_bandas',
            'solicitudes_talleres',
            'solicitudes_servicios',
            'eventos_confirmados',
            'clientes'
        ];

        console.log('📋 REGISTROS POR TABLA:');
        console.log('------------------------');
        
        let hasDiscrepancy = false;
        for (const tabla of tablesToCheck) {
            const seedCount = countInserts(seedContent, tabla);
            const dumpCount = countInserts(dumpContent, tabla);
            
            if (seedCount === 0 && dumpCount === 0) continue;
            
            const status = seedCount === dumpCount ? '✓' : '❌';
            console.log(`${status} ${tabla.padEnd(30)} SEED: ${seedCount.toString().padEnd(3)} DUMP: ${dumpCount}`);
            
            if (seedCount !== dumpCount) {
                hasDiscrepancy = true;
            }
        }

        console.log('\n📅 FECHAS ENCONTRADAS EN SOLICITUDES:');
        console.log('-------------------------------------');
        
        const seedDates = extractDates(seedContent);
        const dumpDates = extractDates(dumpContent);
        
        const futureDates = (dates) => dates.filter(d => {
            const [year, month, day] = d.split('-');
            const date = new Date(d);
            const today = new Date(2026, 3, 15); // 15 de abril 2026
            return date >= today;
        }).sort();

        const seedFuture = futureDates(seedDates);
        const dumpFuture = futureDates(dumpDates);

        console.log(`\nSEED.SQL - Fechas futuras: ${seedFuture.join(', ')}`);
        console.log(`MYSQLDUMP - Fechas futuras: ${dumpFuture.join(', ')}`);

        // Encontrar fechas que faltan
        const seedSet = new Set(seedFuture);
        const dumpSet = new Set(dumpFuture);
        
        const missingInSeed = [...dumpSet].filter(d => !seedSet.has(d));
        const missingInDump = [...seedSet].filter(d => !dumpSet.has(d));

        if (missingInSeed.length > 0) {
            console.log(`\n⚠️  Fechas EN DUMP pero NO en SEED: ${missingInSeed.join(', ')}`);
        }
        
        if (missingInDump.length > 0) {
            console.log(`\n⚠️  Fechas EN SEED pero NO en DUMP: ${missingInDump.join(', ')}`);
        }

        console.log('\n' + '='.repeat(70));
        if (hasDiscrepancy) {
            console.log('⚠️  ADVERTENCIA: Se encontraron INCONSISTENCIAS');
            console.log('→ PROBLEMA: El seed.sql y mysqldump_latest.sql tienen diferente cantidad de registros');
            console.log('→ CAUSA: Probablemente el seed.sql está desactualizado');
            console.log('→ SOLUCIÓN: Ejecutar mysqldump para actualizar seed.sql\n');
        } else {
            console.log('✅ Los archivos SQL son CONSISTENTES (misma cantidad de inserts)');
        }

        if (missingInDump.length > 0 || missingInSeed.length > 0) {
            console.log('\n⚠️  ADVERTENCIA: Hay INCONSISTENCIAS EN FECHAS');
            console.log('→ CAUSA: La BD ha sido corregida pero los SQL no están sincronizados');
            console.log('→ IMPACTO: Si se hace reset, se pierden los cambios de fechas');
            console.log('→ SOLUCIÓN: Ejecutar mysqldump para capturar el estado actual\n');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

main();
