-- =============================================================================
-- MIGRATION: Refactorización de solicitudes_bandas a 3NF
-- Fecha: 2026-02-12
-- Descripción: 
--   - Crear solicitudes_fechas_bandas (nueva tabla para FECHAS/SHOWS)
--   - Migrar datos de solicitudes_bandas
--   - Eliminar solicitudes_bandas (después de validación)
-- =============================================================================

-- ============ PASO 1: Verificar que bandas_artistas tiene todos los campos ============

SELECT '=== PASO 1: Verificando bandas_artistas ===' AS paso;

-- Asegurar que bandas_artistas.verificada existe
ALTER TABLE bandas_artistas ADD COLUMN IF NOT EXISTS verificada TINYINT(1) DEFAULT 0;

SELECT COUNT(*) as total_bandas FROM bandas_artistas;

-- ============ PASO 2: Crear tabla solicitudes_fechas_bandas ============

SELECT '=== PASO 2: Creando solicitudes_fechas_bandas ===' AS paso;

DROP TABLE IF EXISTS solicitudes_fechas_bandas_temp;

CREATE TABLE IF NOT EXISTS solicitudes_fechas_bandas (
    id_solicitud INT PRIMARY KEY COMMENT 'FK a solicitudes.id',
    id_banda INT DEFAULT NULL COMMENT 'FK a bandas_artistas.id (la banda solicitante)',
    
    -- Datos de la fecha/show
    fecha_evento DATE DEFAULT NULL,
    hora_evento VARCHAR(20) DEFAULT NULL,
    duracion VARCHAR(100) DEFAULT NULL,
    descripcion TEXT COMMENT 'Descripción del show/evento',
    
    -- Propuesta económica
    precio_basico DECIMAL(10,2) DEFAULT NULL,
    precio_final DECIMAL(10,2) DEFAULT NULL,
    precio_puerta_propuesto DECIMAL(10,2) DEFAULT NULL,
    
    -- Configuración del evento
    cantidad_bandas INT DEFAULT 1,
    expectativa_publico VARCHAR(100) DEFAULT NULL,
    
    -- Bandas invitadas (JSON)
    invitadas_json TEXT COMMENT 'JSON: [{nombre, id_banda?, confirmada}]',
    
    -- Estado
    estado VARCHAR(50) DEFAULT 'Solicitado',
    
    -- Alternativas
    fecha_alternativa DATE DEFAULT NULL,
    
    -- Admin
    notas_admin TEXT,
    id_evento_generado INT DEFAULT NULL,
    
    -- Auditoría
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_fecha (fecha_evento),
    INDEX idx_estado (estado),
    INDEX idx_banda (id_banda),
    
    -- FKs
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Solicitudes de fechas/shows para bandas (3NF)';

SELECT 'Tabla solicitudes_fechas_bandas creada' AS resultado;

-- ============ PASO 3: Migrar datos de solicitudes_bandas ============

SELECT '=== PASO 3: Migrando datos ===' AS paso;

-- Contar registros antes
SELECT COUNT(*) as registros_solicitudes_bandas FROM solicitudes_bandas;

-- Migración: insertar en solicitudes_fechas_bandas
INSERT INTO solicitudes_fechas_bandas (
    id_solicitud,
    id_banda,
    fecha_evento,
    hora_evento,
    duracion,
    descripcion,
    precio_basico,
    precio_final,
    precio_puerta_propuesto,
    cantidad_bandas,
    expectativa_publico,
    invitadas_json,
    estado,
    fecha_alternativa,
    notas_admin,
    id_evento_generado,
    creado_en,
    actualizado_en
)
SELECT
    sb.id_solicitud,
    sb.id_banda,
    sb.fecha_evento,
    sb.hora_evento,
    sb.duracion,
    sb.descripcion,
    sb.precio_basico,
    sb.precio_final,
    sb.precio_puerta_propuesto,
    sb.cantidad_bandas,
    sb.expectativa_publico,
    sb.invitadas_json,
    sb.estado,
    sb.fecha_alternativa,
    sb.notas_admin,
    sb.id_evento_generado,
    sb.creado_en,
    sb.actualizado_en
FROM solicitudes_bandas sb
WHERE sb.id_solicitud IS NOT NULL;

SELECT ROW_COUNT() as registros_migrados;

-- ============ PASO 4: Migrar datos de bandas de solicitudes_bandas → bandas_artistas ============

SELECT '=== PASO 4: Complementando bandas_artistas ===' AS paso;

-- Para cada banda única en solicitudes_bandas que no tenga id_banda vinculado,
-- crear una entrada en bandas_artistas si no existe
INSERT IGNORE INTO bandas_artistas (
    nombre,
    genero_musical,
    bio,
    instagram,
    facebook,
    youtube,
    spotify,
    otras_redes,
    logo_url,
    contacto_nombre,
    contacto_email,
    contacto_telefono,
    contacto_rol,
    verificada,
    activa
)
SELECT DISTINCT
    COALESCE(NULLIF(sb.nombre_completo, ''), 'Sin nombre banda') as nombre,
    sb.genero_musical,
    NULL as bio,
    sb.instagram,
    sb.facebook,
    sb.youtube,
    sb.spotify,
    sb.otras_redes,
    sb.logo_url,
    sb.nombre_completo,
    (SELECT c.email FROM clientes c WHERE c.id = s.cliente_id LIMIT 1),
    (SELECT c.telefono FROM clientes c WHERE c.id = s.cliente_id LIMIT 1),
    sb.contacto_rol,
    0 as verificada,
    1 as activa
FROM solicitudes_bandas sb
JOIN solicitudes s ON sb.id_solicitud = s.id
WHERE sb.id_banda IS NULL
  AND COALESCE(NULLIF(sb.nombre_completo, ''), 'Sin nombre banda') NOT IN (
    SELECT nombre FROM bandas_artistas
  );

SELECT ROW_COUNT() as bandas_nuevas_creadas;

-- ============ PASO 5: Actualizar solicitudes_fechas_bandas.id_banda para bandas sin vnculo ============

SELECT '=== PASO 5: Vinculando bandas en solicitudes_fechas_bandas ===' AS paso;

UPDATE solicitudes_fechas_bandas sfb
JOIN solicitudes_bandas sb ON sfb.id_solicitud = sb.id_solicitud
SET sfb.id_banda = (
    SELECT ba.id FROM bandas_artistas ba
    WHERE (ba.nombre = COALESCE(NULLIF(sb.nombre_completo, ''), 'Sin nombre banda')
           OR LOWER(ba.nombre) = LOWER(COALESCE(NULLIF(sb.nombre_completo, ''), 'Sin nombre banda')))
    LIMIT 1
)
WHERE sfb.id_banda IS NULL;

SELECT ROW_COUNT() as registros_vinculados;

-- ============ PASO 6: Verificar integridad ============

SELECT '=== PASO 6: Verificación de integridad ===' AS paso;

SELECT 
    COUNT(*) as total_solicitudes_fechas_bandas,
    COUNT(DISTINCT id_banda) as bandas_vinculadas,
    COUNT(CASE WHEN id_banda IS NULL THEN 1 END) as bandas_sin_vincular,
    COUNT(CASE WHEN estado = 'Solicitado' THEN 1 END) as solicitadas,
    COUNT(CASE WHEN estado = 'Confirmado' THEN 1 END) as confirmadas
FROM solicitudes_fechas_bandas;

-- ============ PASO 7: Crear BACKUP de solicitudes_bandas (antes de eliminar) ============

SELECT '=== PASO 7: Creando backup ===' AS paso;

DROP TABLE IF EXISTS solicitudes_bandas_backup_20260212;

CREATE TABLE solicitudes_bandas_backup_20260212 AS
SELECT * FROM solicitudes_bandas;

SELECT COUNT(*) as backup_registros FROM solicitudes_bandas_backup_20260212;

-- ============ PASO 8: Mantener solicitudes_bandas como vista (opcional) ============
-- NOTA: Por ahora NO eliminamos solicitudes_bandas. Se creará una VIEW que apunte a solicitudes_fechas_bandas
-- para mantener compatibilidad con el código anterior hasta que se refactorice por completo.

SELECT '=== PASO 8: Creando VIEW de compatibilidad ===' AS paso;

DROP VIEW IF EXISTS solicitudes_bandas_view;

CREATE VIEW solicitudes_bandas_view AS
SELECT
    sfb.id_solicitud,
    s.categoria as tipo_de_evento,
    NULL as tipo_servicio,
    NULL as fecha_hora,
    sfb.fecha_evento,
    sfb.hora_evento,
    sfb.duracion,
    ba.nombre as cantidad_de_personas, -- Esto es un mapeo temporal
    sfb.precio_basico,
    sfb.precio_final,
    c.nombre as nombre_completo,
    c.telefono,
    c.email,
    sfb.descripcion,
    sfb.estado,
    NULL as fingerprintid,
    sfb.id_banda,
    ba.genero_musical,
    ba.logo_url,
    ba.instagram,
    ba.facebook,
    ba.youtube,
    ba.spotify,
    ba.otras_redes,
    NULL as contacto_rol,
    sfb.fecha_alternativa,
    sfb.invitadas_json,
    sfb.cantidad_bandas,
    sfb.precio_puerta_propuesto,
    sfb.expectativa_publico,
    sfb.notas_admin,
    sfb.id_evento_generado,
    sfb.creado_en,
    sfb.actualizado_en
FROM solicitudes_fechas_bandas sfb
JOIN solicitudes s ON sfb.id_solicitud = s.id
LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id
LEFT JOIN clientes c ON s.cliente_id = c.id;

SELECT 'VIEW solicitudes_bandas_view creada (compatibilidad temporary)' AS resultado;

-- ============ RESUMEN FINAL ============

SELECT '========================================' AS resultado;
SELECT '✓ MIGRACIÓN COMPLETADA' AS resultado;
SELECT '========================================' AS resultado;
SELECT 'Pasos completados:' AS resultado;
SELECT '1. Tabla solicitudes_fechas_bandas creada' AS resultado;
SELECT '2. Datos migrados desde solicitudes_bandas' AS resultado;
SELECT '3. Bandas vinculadas en bandas_artistas' AS resultado;
SELECT '4. Backup disponible en solicitudes_bandas_backup_20260212' AS resultado;
SELECT '5. VIEW creada para compatibilidad temporal' AS resultado;
SELECT '' AS resultado;
SELECT 'PRÓXIMOS PASOS:' AS resultado;
SELECT '1. Refactorizar backend (nuevos controllers)' AS resultado;
SELECT '2. Actualizar rutas API' AS resultado;
SELECT '3. Actualizar frontend (URLs, endpoints)' AS resultado;
SELECT '4. Pruebas de integración' AS resultado;
SELECT '5. Eliminar solicitudes_bandas (después de validar)' AS resultado;
SELECT '========================================' AS resultado;
