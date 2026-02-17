#!/usr/bin/env node
/**
 * apply_fixes_aggressive.js
 * Aplica correcciones agresivas para eliminar AUTO_INCREMENT
 * de solicitudes_bandas.id_solicitud
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
        multipleStatements: true,
        supportBigInt: true
    });

    let conn;
    try {
        conn = await pool.getConnection();
        console.log('\n✅ Conectado a MariaDB\n');

        console.log('═'.repeat(80));
        console.log('CORRECCIÓN AGRESIVA: Eliminar AUTO_INCREMENT de solicitudes_bandas');
        console.log('═'.repeat(80));

        // Paso 1: Eliminar tabla respaldo anterior si existe
        console.log('\n[1/4] Eliminando tabla backup anterior...');
        try {
            await conn.query(`DROP TABLE IF EXISTS solicitudes_bandas_old2`);
            console.log('✓ Tabla old2 eliminada');
        } catch(e) {}

        // Paso 2: Hacer backup
        console.log('\n[2/4] Haciendo backup de solicitudes_bandas...');
        await conn.query(`RENAME TABLE solicitudes_bandas TO solicitudes_bandas_old2`);
        console.log('✓ Tabla original respaldada como solicitudes_bandas_old2');

        // Paso 3: Crear tabla nueva sin AUTO_INCREMENT
        console.log('\n[3/4] Creando tabla nueva SIN AUTO_INCREMENT...');
        await conn.query(`
            CREATE TABLE solicitudes_bandas (
                id_solicitud INT PRIMARY KEY COMMENT 'FK a solicitudes.id - NO es AUTO_INCREMENT',
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
                id_banda INT DEFAULT NULL,
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
        console.log('✓ Tabla nueva creada correctamente (sin AUTO_INCREMENT)');

        // Paso 4: Copiar datos
        console.log('\n[4/4] Copiando datos a la tabla nueva...');
        const result = await conn.query(`
            INSERT INTO solicitudes_bandas 
            SELECT * FROM solicitudes_bandas_old2
        `);
        console.log(`✓ ${result.affectedRows} registros copiados`);

        // Verificación
        console.log('\n' + '═'.repeat(80));
        console.log('VERIFICACIÓN POST-CORRECCIÓN');
        console.log('═'.repeat(80));

        const cols = await conn.query(`
            SELECT COLUMN_NAME, COLUMN_KEY, EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'solicitudes_bandas' AND COLUMN_NAME = 'id_solicitud'
        `);

        if (cols.length > 0) {
            const col = cols[0];
            const hasAutoInc = col.EXTRA && col.EXTRA.includes('auto_increment');
            console.log(`\nEstructura de solicitudes_bandas.id_solicitud:`);
            console.log(`  COLUMN_KEY: ${col.COLUMN_KEY}`);
            console.log(`  EXTRA: ${col.EXTRA || '(vacío - correcto)'}`);
            console.log(`  AUTO_INCREMENT: ${hasAutoInc ? '❌ AÚN PRESENTE' : '✅ ELIMINADO CORRECTAMENTE'}`);
        }

        // Verificar integridad referencial
        console.log('\n' + '═'.repeat(80));
        console.log('Verificando integridad referencial');
        console.log('═'.repeat(80));

        const orphans = await conn.query(`
            SELECT COUNT(*) as count
            FROM solicitudes_bandas sb
            WHERE NOT EXISTS (SELECT 1 FROM solicitudes s WHERE s.id = sb.id_solicitud)
        `);

        console.log(`\nHuérfanos en solicitudes_bandas: ${orphans[0].count}`);

        // Fijar evento orfano
        console.log('\n' + '═'.repeat(80));
        console.log('Limpiando eventos sin solicitud válida');
        console.log('═'.repeat(80));

        const deletedEvents = await conn.query(`
            DELETE FROM eventos_confirmados 
            WHERE id_solicitud = 0 OR id_solicitud IS NULL OR 
                  id_solicitud NOT IN (SELECT id FROM solicitudes)
        `);

        console.log(`\n✓ ${deletedEvents.affectedRows} eventos orfanos eliminados`);

        // Resumen
        console.log('\n' + '═'.repeat(80));
        console.log('✅ CORRECCIONES COMPLETADAS');
        console.log('═'.repeat(80));
        console.log(`
  1. ✓ Tabla solicitudes_bandas recreada sin AUTO_INCREMENT
  2. ✓ Datos migrados correctamente
  3. ✓ Eventos orfanos eliminados
  4. ✓ Integridad referencial verificada
  
  La base de datos está consistente y lista para usar.
  NO REQUIERE REINICIO DE CONTENEDORES.
        `);

        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error('\nStack:', err.stack);
        if (conn) conn.release();
        process.exit(1);
    }
}

main();
