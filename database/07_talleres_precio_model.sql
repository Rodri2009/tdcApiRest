-- =============================================================================
-- 07_talleres_precio_model.sql
-- Descripción: separar la fuente de precios de talleres de precios_vigencia.
-- Objetivo:
--   - precios_talleres pasa a ser la fuente oficial para talleres/actividades
--   - precios_vigencia queda reservada para otros eventos
--   - solicitudes_talleres guarda el género y el precio asociado al taller
-- =============================================================================

USE tdc_db;

-- 1) Agregar columnas nuevas a solicitudes_talleres
ALTER TABLE solicitudes_talleres
  ADD COLUMN IF NOT EXISTS id_tipo_evento VARCHAR(255) NULL COMMENT 'FK a opciones_tipos.id_tipo_evento (género/semilla del taller)',
  ADD COLUMN IF NOT EXISTS id_precio_taller INT NULL COMMENT 'FK a precios_talleres.id. Fuente oficial del precio del taller',
  ADD COLUMN IF NOT EXISTS comentarios_observaciones TEXT NULL COMMENT 'Comentarios u observaciones del taller';

-- 2) Agregar índices y FK a solicitudes_talleres
ALTER TABLE solicitudes_talleres
  ADD INDEX IF NOT EXISTS idx_solicitudes_talleres_tipo (id_tipo_evento),
  ADD INDEX IF NOT EXISTS idx_solicitudes_talleres_precio (id_precio_taller);

ALTER TABLE solicitudes_talleres
  ADD CONSTRAINT fk_solicitudes_talleres_tipo_evento
    FOREIGN KEY (id_tipo_evento) REFERENCES opciones_tipos(id_tipo_evento) ON DELETE RESTRICT;

-- Si la FK ya existe, esta sentencia puede fallar según el entorno; la siguiente condición evita caos en ejecuciones repetidas.
-- MariaDB/MySQL no tiene una cláusula IF NOT EXISTS para ADD CONSTRAINT, por eso se hace un chequeo previo.
SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'solicitudes_talleres'
    AND CONSTRAINT_NAME = 'fk_solicitudes_talleres_tipo_evento'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE solicitudes_talleres ADD CONSTRAINT fk_solicitudes_talleres_tipo_evento FOREIGN KEY (id_tipo_evento) REFERENCES opciones_tipos(id_tipo_evento) ON DELETE RESTRICT',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_precio_exists := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'solicitudes_talleres'
    AND CONSTRAINT_NAME = 'fk_solicitudes_talleres_precio'
);
SET @sql2 := IF(@fk_precio_exists = 0,
  'ALTER TABLE solicitudes_talleres ADD CONSTRAINT fk_solicitudes_talleres_precio FOREIGN KEY (id_precio_taller) REFERENCES precios_talleres(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3) Agregar columnas nuevas a precios_talleres
ALTER TABLE precios_talleres
  ADD COLUMN IF NOT EXISTS id_solicitud INT NULL COMMENT 'FK a solicitudes.id_solicitud. Precio asociado a una solicitud concreta',
  ADD COLUMN IF NOT EXISTS id_solicitud_taller INT NULL COMMENT 'FK a solicitudes_talleres.id_solicitud_taller. Precio asociado al taller de la solicitud',
  ADD COLUMN IF NOT EXISTS id_tipo_evento VARCHAR(255) NULL COMMENT 'FK a opciones_tipos.id_tipo_evento. Género/semilla del taller',
  ADD COLUMN IF NOT EXISTS nombre_precio VARCHAR(255) NULL COMMENT 'Nombre del precio: Clase suelta, Pack 4 clases, etc.',
  ADD COLUMN IF NOT EXISTS descripcion TEXT NULL COMMENT 'Detalle del precio o paquete',
  ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Indica si el precio sigue vigente para operar';

-- 4) Indexes de precios_talleres
ALTER TABLE precios_talleres
  ADD INDEX IF NOT EXISTS idx_precios_talleres_solicitud (id_solicitud),
  ADD INDEX IF NOT EXISTS idx_precios_talleres_solicitud_taller (id_solicitud_taller),
  ADD INDEX IF NOT EXISTS idx_precios_talleres_tipo (id_tipo_evento),
  ADD INDEX IF NOT EXISTS idx_precios_talleres_activo (activo);

-- 5) Crear FKs a la tabla de precios_talleres
SET @fk_preq_sol_exists := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'precios_talleres'
    AND CONSTRAINT_NAME = 'fk_precios_talleres_solicitud'
);
SET @sql3 := IF(@fk_preq_sol_exists = 0,
  'ALTER TABLE precios_talleres ADD CONSTRAINT fk_precios_talleres_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

SET @fk_preq_st_exists := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'precios_talleres'
    AND CONSTRAINT_NAME = 'fk_precios_talleres_solicitud_taller'
);
SET @sql4 := IF(@fk_preq_st_exists = 0,
  'ALTER TABLE precios_talleres ADD CONSTRAINT fk_precios_talleres_solicitud_taller FOREIGN KEY (id_solicitud_taller) REFERENCES solicitudes_talleres(id_solicitud_taller) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

SET @fk_preq_tipo_exists := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'precios_talleres'
    AND CONSTRAINT_NAME = 'fk_precios_talleres_tipo_evento'
);
SET @sql5 := IF(@fk_preq_tipo_exists = 0,
  'ALTER TABLE precios_talleres ADD CONSTRAINT fk_precios_talleres_tipo_evento FOREIGN KEY (id_tipo_evento) REFERENCES opciones_tipos(id_tipo_evento) ON DELETE RESTRICT',
  'SELECT 1');
PREPARE stmt5 FROM @sql5;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

-- 6) Backfill simple para utilizar el género y la referencia de precio donde exista ya información
UPDATE precios_talleres
SET id_tipo_evento = tipo_taller_id,
    activo = COALESCE(activo, vigente)
WHERE id_tipo_evento IS NULL AND tipo_taller_id IS NOT NULL;

UPDATE solicitudes_talleres st
LEFT JOIN precios_talleres pt ON pt.id_solicitud_taller IS NULL AND pt.tipo_taller_id = st.id_tipo_evento
SET st.id_precio_taller = pt.id,
    st.id_tipo_evento = COALESCE(st.id_tipo_evento, pt.tipo_taller_id)
WHERE st.id_precio_taller IS NULL AND pt.id IS NOT NULL;

-- 7) Mantener compatibilidad legacy: no eliminar columnas aún
-- La lógica de negocio queda centrada en precios_talleres para talleres, y precios_vigencia para otros tipo de eventos.

SELECT 'MIGRACION_07_TALLERES_PRECIO_MODEL_OK' AS status;
