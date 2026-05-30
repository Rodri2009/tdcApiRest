-- =============================================================================
-- MIGRACIÓN: Actualizar tabla cajas con nuevos campos de saldo
-- =============================================================================
-- Fecha: 30/05/2026
-- Cambios:
--   1. Agregar id_evento_confirmado (FK a eventos_confirmados)
--   2. Cambiar saldo_inicial → saldo_inicial_en_cuenta, saldo_inicial_en_efectivo
--   3. Cambiar saldo_final → saldo_final_en_cuenta, saldo_final_en_efectivo
-- =============================================================================

USE tdc_db;

-- Paso 1: Agregar nuevos campos
ALTER TABLE cajas 
ADD COLUMN id_evento_confirmado INT COMMENT 'FK a eventos_confirmados.id - Evento asociado (si aplica)' AFTER nombre,
ADD COLUMN saldo_inicial_en_efectivo DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Saldo inicial en efectivo' AFTER saldo_inicial,
ADD COLUMN saldo_final_en_efectivo DECIMAL(12,2) COMMENT 'Saldo final en efectivo (NULL si abierta)' AFTER saldo_final,
ADD INDEX idx_evento (id_evento_confirmado),
ADD CONSTRAINT fk_cajas_evento FOREIGN KEY (id_evento_confirmado) REFERENCES eventos_confirmados(id) ON DELETE SET NULL;

-- Paso 2: Renombrar campos existentes (si es posible mediante CHANGE)
ALTER TABLE cajas 
CHANGE COLUMN saldo_inicial saldo_inicial_en_cuenta DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Saldo inicial en cuenta (MP, banco, etc.)',
CHANGE COLUMN saldo_final saldo_final_en_cuenta DECIMAL(12,2) COMMENT 'Saldo final en cuenta (NULL si abierta)';

-- Paso 3: Migración de datos (si hay cajas existentes)
-- Asumimos que cajas existentes tenían saldo_inicial como "en efectivo" o "total"
-- Vamos a mantenerlo como saldo_inicial_en_cuenta por backward compatibility
UPDATE cajas SET saldo_inicial_en_efectivo = 0 WHERE saldo_inicial_en_efectivo IS NULL;

-- Paso 4: Logging de cambios
SELECT 'Migración completada exitosamente' as status;
SELECT COUNT(*) as total_cajas, estado FROM cajas GROUP BY estado;
