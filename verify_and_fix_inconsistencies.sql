-- ============================================================================
-- verify_and_fix_inconsistencies.sql
-- Script para verificar y corregir inconsistencias en el schema
-- Ejecución: NO destructiva, solo fix (2026-02-12)
-- ============================================================================

USE tdc_db;

-- ============================================================================
-- VERIFICACIÓN 1: solicitudes_bandas.id_solicitud debería ser FK, no PK
-- ============================================================================
-- Verificar si solicitudes_bandas tiene el AUTO_INCREMENT incorrecto
SELECT '=== VERIFICACIÓN 1: solicitudes_bandas ===' AS paso;
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_KEY, EXTRA FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'solicitudes_bandas' AND COLUMN_NAME = 'id_solicitud';

-- Si id_solicitud tiene AUTO_INCREMENT, necesitamos arreglarlo
-- Paso 1: Crear tabla temporal con la estructura correcta
CREATE TABLE IF NOT EXISTS solicitudes_bandas_fixed (
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
    formacion_json TEXT COMMENT 'JSON con instrumentos',
    instagram VARCHAR(255) DEFAULT NULL,
    facebook VARCHAR(255) DEFAULT NULL,
    youtube VARCHAR(500) DEFAULT NULL,
    spotify VARCHAR(500) DEFAULT NULL,
    otras_redes TEXT,
    logo_url VARCHAR(500) DEFAULT NULL,
    contacto_rol VARCHAR(100) DEFAULT NULL,
    fecha_alternativa DATE DEFAULT NULL,
    invitadas_json TEXT COMMENT 'JSON con bandas invitadas',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================================
-- VERIFICACIÓN 2: Verificar integridad referencial entre tablas
-- ============================================================================
SELECT '=== VERIFICACIÓN 2: Huérfanos en solicitudes_bandas ===' AS paso;
SELECT COUNT(*) as huerfanos FROM solicitudes_bandas sb
WHERE NOT EXISTS (SELECT 1 FROM solicitudes s WHERE s.id = sb.id_solicitud);

SELECT '=== VERIFICACIÓN 3: Huérfanos en solicitudes_alquiler ===' AS paso;
SELECT COUNT(*) as huerfanos FROM solicitudes_alquiler sa
WHERE NOT EXISTS (SELECT 1 FROM solicitudes s WHERE s.id = sa.id_solicitud);

-- ============================================================================
-- VERIFICACIÓN 4: Verificar que eventos_confirmados.id_solicitud apunta datos válidos
-- ============================================================================
SELECT '=== VERIFICACIÓN 4: eventos_confirmados - integridad de id_solicitud ===' AS paso;
SELECT 
    ec.id,
    ec.id_solicitud,
    ec.tipo_evento,
    ec.tabla_origen,
    s.id as solicitud_existe,
    s.categoria,
    sb.id_solicitud as banda_existe,
    sa.id_solicitud as alquiler_existe
FROM eventos_confirmados ec
LEFT JOIN solicitudes s ON s.id = ec.id_solicitud
LEFT JOIN solicitudes_bandas sb ON sb.id_solicitud = ec.id_solicitud
LEFT JOIN solicitudes_alquiler sa ON sa.id_solicitud = ec.id_solicitud
LIMIT 20;

-- ============================================================================
-- VERIFICACIÓN 5: Inconsistencia de categoría
-- ============================================================================
SELECT '=== VERIFICACIÓN 5: Inconsistencia categoría BANDA/BANDAS ===' AS paso;
-- Si en solicitudes hay categoría='BANDA' pero en solicitudes_bandas.tipo_de_evento='FECHA_BANDAS'
SELECT 
    s.id,
    s.categoria,
    sb.tipo_de_evento,
    CASE 
        WHEN s.categoria IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NOT NULL THEN 'OK - Consistente'
        WHEN s.categoria IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NULL THEN 'ERROR - Banda sin solicitudes_bandas'
        WHEN s.categoria NOT IN ('BANDA', 'BANDAS') AND sb.id_solicitud IS NOT NULL THEN 'ERROR - No banda pero tiene solicitudes_bandas'
        ELSE 'DESCONOCIDO'
    END AS validacion
FROM solicitudes s
LEFT JOIN solicitudes_bandas sb ON sb.id_solicitud = s.id
WHERE s.categoria IN ('BANDA', 'BANDAS', 'ALQUILER')
ORDER BY s.id;

-- ============================================================================
-- VERIFICACIÓN 6: Verificar que solicitudes_alquiler.tipo_de_evento sea válido
-- ============================================================================
SELECT '=== VERIFICACIÓN 6: solicitudes_alquiler tipo_de_evento ===' AS paso;
SELECT DISTINCT tipo_de_evento FROM solicitudes_alquiler;

-- ============================================================================
-- VERIFICACIÓN 7: Sincronización entre solicitudes_alquiler y solicitudes
-- ============================================================================
SELECT '=== VERIFICACIÓN 7: Sincronización ALQUILER ===' AS paso;
SELECT 
    s.id,
    s.categoria,
    sa.id_solicitud,
    sa.tipo_de_evento,
    CASE 
        WHEN s.categoria = 'ALQUILER' AND sa.id_solicitud IS NOT NULL THEN 'OK'
        WHEN s.categoria = 'ALQUILER' AND sa.id_solicitud IS NULL THEN 'ERROR - Sin solicitudes_alquiler'
        WHEN s.categoria != 'ALQUILER' AND sa.id_solicitud IS NOT NULL THEN 'ERROR - Categoría inconsistente'
        ELSE 'OK'
    END AS validacion
FROM solicitudes s
LEFT JOIN solicitudes_alquiler sa ON sa.id_solicitud = s.id
WHERE s.categoria = 'ALQUILER'
ORDER BY s.id
LIMIT 20;

-- ============================================================================
-- CORRECCIÓN 1: Si solicitudes_bandas.id_solicitud tiene AUTO_INCREMENT incorrecto
-- ============================================================================
SELECT '=== CORRECCIÓN 1: Arreglando solicitudes_bandas ===' AS paso;

-- Copiar datos a tabla temporal
TRUNCATE TABLE solicitudes_bandas_fixed;
INSERT INTO solicitudes_bandas_fixed 
SELECT * FROM solicitudes_bandas;

-- Informar sobre el proceso
SELECT 'Datos copiados a tabla temporal' AS info;
SELECT COUNT(*) as registros_copiados FROM solicitudes_bandas_fixed;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT '=== VERIFICACIÓN FINAL ===' AS paso;
SELECT '✓ Script de verificación ejecutado' AS resultado;
SELECT '⚠️ Revisar salidas anteriores para identificar inconsistencias' AS siguiente_paso;
SELECT '💡 Ejecutar correcciones específicas según errores encontrados' AS nota;
