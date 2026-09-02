-- =============================================================================
-- MIGRACIÓN: Actualizar tabla cajas con nuevos campos de saldo
-- =============================================================================
-- Fecha: 30/05/2026
-- Cambios:
--   1. Agregar id_evento_confirmado (FK a eventos_confirmados)
--   2. Asegurar nombres actuales: saldo_inicial_en_cuenta / saldo_final_en_cuenta
--   3. Agregar saldo inicial/final en efectivo y campos auxiliares si faltan
-- =============================================================================

USE tdc_db;

-- Paso 1: asegurar campos actuales y compatibilidad con nombres viejos
SET @has_old_saldo_inicial := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cajas'
    AND COLUMN_NAME = 'saldo_inicial'
);

SET @has_new_saldo_inicial := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cajas'
    AND COLUMN_NAME = 'saldo_inicial_en_cuenta'
);

SET @has_old_saldo_final := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cajas'
    AND COLUMN_NAME = 'saldo_final'
);

SET @has_new_saldo_final := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cajas'
    AND COLUMN_NAME = 'saldo_final_en_cuenta'
);

SET @sql_rename_inicial := IF(@has_old_saldo_inicial > 0 AND @has_new_saldo_inicial = 0,
  'ALTER TABLE cajas CHANGE COLUMN saldo_inicial saldo_inicial_en_cuenta DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT "Saldo inicial en cuenta (MP, banco, etc.)"',
  'SELECT 1');
PREPARE stmt_rename_inicial FROM @sql_rename_inicial;
EXECUTE stmt_rename_inicial;
DEALLOCATE PREPARE stmt_rename_inicial;

SET @sql_rename_final := IF(@has_old_saldo_final > 0 AND @has_new_saldo_final = 0,
  'ALTER TABLE cajas CHANGE COLUMN saldo_final saldo_final_en_cuenta DECIMAL(12,2) COMMENT "Saldo final en cuenta (NULL si abierta)"',
  'SELECT 1');
PREPARE stmt_rename_final FROM @sql_rename_final;
EXECUTE stmt_rename_final;
DEALLOCATE PREPARE stmt_rename_final;

-- Paso 2: agregar columnas nuevas si faltan
ALTER TABLE cajas
  ADD COLUMN IF NOT EXISTS id_evento_confirmado INT COMMENT 'FK a eventos_confirmados.id - Evento asociado (si aplica)',
  ADD COLUMN IF NOT EXISTS saldo_inicial_en_efectivo DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Saldo inicial en efectivo',
  ADD COLUMN IF NOT EXISTS saldo_final_en_efectivo DECIMAL(12,2) COMMENT 'Saldo final en efectivo (NULL si abierta)';

-- Paso 3: asegurar índice y FK de id_evento_confirmado
CREATE INDEX IF NOT EXISTS idx_evento ON cajas (id_evento_confirmado);

SET @fk_evento_exists := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cajas'
    AND CONSTRAINT_NAME = 'fk_cajas_evento'
);
SET @sql_fk_evento := IF(@fk_evento_exists = 0,
  'ALTER TABLE cajas ADD CONSTRAINT fk_cajas_evento FOREIGN KEY (id_evento_confirmado) REFERENCES eventos_confirmados(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt_fk_evento FROM @sql_fk_evento;
EXECUTE stmt_fk_evento;
DEALLOCATE PREPARE stmt_fk_evento;

-- Paso 4: compatibilidad de datos
UPDATE cajas
SET saldo_inicial_en_efectivo = 0
WHERE saldo_inicial_en_efectivo IS NULL;

-- Paso 5: logging
SELECT 'Migración 05 completa' AS status;
SELECT COUNT(*) AS total_cajas, estado FROM cajas GROUP BY estado;
