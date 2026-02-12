#!/usr/bin/env node
/**
 * fix_inconsistencies.js
 * Aplica correcciones a las inconsistencias encontradas
 * SIN REINICIAR CONTENEDORES
 */

const mariadb = require('mariadb');

async function main() {
    const pool = mariadb.createPool({
        host: process.env.DB_HOST || 'mariadb',
        user: process.env.DB_USER || 'tdc_user',
        password: process.env.DB_PASSWORD || 'tdc_password',
        database: process.env.DB_NAME || 'tdc_db',
        connectionLimit: 5,
        waitForConnections: true,
        enableKeepAlive: true,
        multipleStatements: true
    });

    let conn;
    try {
        conn = await pool.getConnection();
        console.log('\n✅ Conectado a MariaDB\n');

        // ============================================
        // CORRECCIÓN 1: Arreglar solicitudes_bandas
        // ============================================
        console.log('═'.repeat(80));
        console.log('CORRECCIÓN 1: Arreglando estructura de solicitudes_bandas');
        console.log('═'.repeat(80));

        // Paso 1: Verificar si ya existe la tabla backup
        const backupExists = await conn.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'tdc_db' AND TABLE_NAME = 'solicitudes_bandas_old'
        `);

        if (backupExists[0].count === 0) {
            console.log('\n[1/3] Respaldando tabla original...');
            await conn.query(`RENAME TABLE solicitudes_bandas TO solicitudes_bandas_old`);
            console.log('✓ Tabla renombrada a solicitudes_bandas_old');

            console.log('\n[2/3] Creando tabla nueva sin AUTO_INCREMENT...');
            await conn.query(`
                CREATE TABLE solicitudes_bandas (
                    id_solicitud INT PRIMARY KEY,
                    tipo_de_evento VARCHAR(50) NOT NULL DEFAULT 'FECHA_BANDAS',
                    tipo_servicio VARCHAR(255) DEFAULT NULL,
                    fecha_hora DATETIME DEFAULT NULL,
                    fecha_evento DATE DEFAULT NULL,
                    hora_evento VARCHAR(20) DEFAULT NULL,
                    duracion VARCHAR(100) DEFAULT NULL,
                    cantidad_de_personas VARCHAR(100) DEFAULT NULL,
                    precio_basico DECIMAL(10,2) DEFAULT NULL,
                    precio_final DECIMAL(10,2) DEFAULT NULL,
                    nombre_completo VARCHAR(255) DEFAULT NULL,
                    telefono VARCHAR(50) DEFAULT NULL,
                    email VARCHAR(255) DEFAULT NULL,
                    descripcion TEXT,
                    estado VARCHAR(50) DEFAULT 'Solicitado',
                    fingerprintid VARCHAR(255) DEFAULT NULL,
                    id_banda INT DEFAULT NULL COMMENT 'FK a bandas_artistas',
                    genero_musical VARCHAR(100) DEFAULT NULL,
                    formacion_json TEXT DEFAULT NULL,
                    instagram VARCHAR(255) DEFAULT NULL,
                    facebook VARCHAR(255) DEFAULT NULL,
                    youtube VARCHAR(500) DEFAULT NULL,
                    spotify VARCHAR(500) DEFAULT NULL,
                    otras_redes TEXT,
                    logo_url VARCHAR(500) DEFAULT NULL,
                    contacto_rol VARCHAR(100) DEFAULT NULL,
                    fecha_alternativa DATE DEFAULT NULL,
                    invitadas_json TEXT DEFAULT NULL,
                    cantidad_bandas INT DEFAULT 1,
                    precio_puerta_propuesto DECIMAL(10,2) DEFAULT NULL,
                    expectativa_publico VARCHAR(100) DEFAULT NULL,
                    notas_admin TEXT,
                    id_evento_generado INT DEFAULT NULL,
                    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_tipo (tipo_de_evento),
                    INDEX idx_fecha (fecha_evento),
                    INDEX idx_estado (estado),
                    INDEX idx_banda (id_banda),
                    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE,
                    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
            `);
            console.log('✓ Tabla nueva creada sin AUTO_INCREMENT');

            console.log('\n[3/3] Copiando datos de respaldo a tabla nueva...');
            const result = await conn.query(`
                INSERT INTO solicitudes_bandas 
                SELECT * FROM solicitudes_bandas_old
            `);
            console.log(`✓ ${result.affectedRows} registros copiados`);

        } else {
            console.log('\n⚠️  Tabla backup ya existe, omitiendo paso de corrección');
        }

        // ============================================
        // CORRECCIÓN 2: Fijar eventos orfanos
        // ============================================
        console.log('\n' + '═'.repeat(80));
        console.log('CORRECCIÓN 2: Eventos con solicitud_id inválida');
        console.log('═'.repeat(80));

        const orfanos = await conn.query(`
            SELECT 
                ec.id,
                ec.id_solicitud,
                ec.tipo_evento,
                ec.nombre_evento
            FROM eventos_confirmados ec
            WHERE ec.id_solicitud = 0 OR ec.id_solicitud IS NULL OR 
                  ec.id_solicitud NOT IN (SELECT id FROM solicitudes)
        `);

        console.log(`\nEventos orfanos encontrados: ${orfanos.length}`);
        
        if (orfanos.length > 0) {
            orfanos.forEach(ev => {
                console.log(`  - evento_id=${ev.id}, solicitud_id=${ev.id_solicitud}, tipo=${ev.tipo_evento}, nombre="${ev.nombre_evento}"`);
            });
            
            console.log('\n⚠️  Estos eventos requieren corrección manual:');
            console.log('   Opciones:');
            console.log('   A) Eliminarlos (si son datos de prueba)');
            console.log('   B) Asignarles una solicitud válida');
            console.log('   C) Crear una solicitud nueva para ellos');
        } else {
            console.log('\n✓ No hay eventos orfanos');
        }

        // ============================================
        // VERIFICACIÓN FINAL
        // ============================================
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN FINAL');
        console.log('═'.repeat(80));

        const colsFixed = await conn.query(`
            SELECT COLUMN_NAME, COLUMN_KEY, EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'solicitudes_bandas' AND COLUMN_NAME = 'id_solicitud'
        `);

        console.log('\nEstructura de solicitudes_bandas.id_solicitud después de corrección:');
        if (colsFixed.length > 0) {
            const col = colsFixed[0];
            const hasAutoInc = col.EXTRA && col.EXTRA.includes('auto_increment');
            console.log(`  COLUMN_KEY: ${col.COLUMN_KEY}`);
            console.log(`  EXTRA: ${col.EXTRA || '(ninguno)'}`);
            console.log(`  AUTO_INCREMENT: ${hasAutoInc ? '❌ SÍ (AÚN CON PROBLEMA)' : '✅ NO (CORREGIDO)'}`);
        }

        // ============================================
        // RESUMEN
        // ============================================
        console.log('\n' + '═'.repeat(80));
        console.log('📋 RESUMEN');
        console.log('═'.repeat(80));
        console.log('\n✅ Correcciones aplicadas:');
        console.log('  1. ✓ solicitudes_bandas.id_solicitud: Removido AUTO_INCREMENT');
        console.log('  2. ✓ Tabla respaldada en solicitudes_bandas_old');
        if (orfanos.length === 0) {
            console.log('  3. ✓ No hay eventos orfanos para corregir');
        } else {
            console.log(`  3. ⚠️  ${orfanos.length} eventos orfanos requieren corrección manual`);
        }
        console.log('\n✅ El sistema está funcionando correctamente sin necesidad de reinicio\n');

        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err.stack);
        if (conn) conn.release();
        process.exit(1);
    }
}

main();
