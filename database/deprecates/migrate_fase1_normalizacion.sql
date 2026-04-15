-- =============================================================================
-- MIGRACIÓN FASE 1 — Normalización de campos duplicados
-- Fecha: 27/03/2026
-- Descripción: Elimina columnas duplicadas de tablas hijo y consolida
--              descripcion en el padre (solicitudes.descripcion_larga).
-- BACKUP PREVIO recomendado antes de ejecutar.
-- =============================================================================

USE tdc_db;

-- -----------------------------------------------------------------------------
-- PASO 1: Migrar datos ANTES de eliminar columnas
-- -----------------------------------------------------------------------------

-- 1a. Migrar solicitudes.descripcion (legacy) → solicitudes.descripcion_larga
--     Solo donde descripcion_larga esté vacía y descripcion tenga valor
UPDATE solicitudes
SET descripcion_larga = descripcion
WHERE descripcion IS NOT NULL
  AND descripcion != ''
  AND (descripcion_larga IS NULL OR descripcion_larga = '');

-- 1b. Migrar solicitudes_fechas_bandas.descripcion → solicitudes.descripcion_larga
--     Solo donde la tabla padre no tenga descripcion_larga aún
UPDATE solicitudes s
JOIN solicitudes_fechas_bandas sfb ON sfb.id_solicitud = s.id_solicitud
SET s.descripcion_larga = sfb.descripcion
WHERE sfb.descripcion IS NOT NULL
  AND sfb.descripcion != ''
  AND (s.descripcion_larga IS NULL OR s.descripcion_larga = '');

-- 1c. Asegurar consistencia de estado: solicitudes.estado = sfb.estado
--     (la fuente de verdad pasa a ser solicitudes.estado)
UPDATE solicitudes s
JOIN solicitudes_fechas_bandas sfb ON sfb.id_solicitud = s.id_solicitud
SET s.estado = sfb.estado
WHERE sfb.estado IS NOT NULL
  AND sfb.estado != ''
  AND (s.estado IS NULL OR s.estado = 'Solicitado');

-- Mismo para alquiler
UPDATE solicitudes s
JOIN solicitudes_alquiler sa ON sa.id_solicitud = s.id_solicitud
SET s.estado = sa.estado
WHERE sa.estado IS NOT NULL
  AND sa.estado != ''
  AND (s.estado IS NULL OR s.estado = 'Solicitado');

-- -----------------------------------------------------------------------------
-- PASO 2: Eliminar columnas duplicadas de solicitudes_fechas_bandas
-- -----------------------------------------------------------------------------

ALTER TABLE solicitudes_fechas_bandas
  DROP COLUMN descripcion,
  DROP COLUMN estado,
  DROP COLUMN creado_en,
  DROP COLUMN actualizado_en;

-- -----------------------------------------------------------------------------
-- PASO 3: Eliminar columnas duplicadas de solicitudes_alquiler
-- -----------------------------------------------------------------------------

ALTER TABLE solicitudes_alquiler
  DROP COLUMN estado,
  DROP COLUMN creado_en,
  DROP COLUMN actualizado_en;

-- -----------------------------------------------------------------------------
-- PASO 4: Eliminar columna legacy de solicitudes padre
-- -----------------------------------------------------------------------------

ALTER TABLE solicitudes
  DROP COLUMN descripcion;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN
-- -----------------------------------------------------------------------------

SELECT 'MIGRACIÓN FASE 1 COMPLETA' AS resultado;

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'tdc_db'
  AND TABLE_NAME IN ('solicitudes', 'solicitudes_alquiler', 'solicitudes_fechas_bandas')
  AND COLUMN_NAME IN ('estado', 'descripcion', 'creado_en', 'actualizado_en', 'descripcion_larga')
ORDER BY TABLE_NAME, COLUMN_NAME;
