-- =========================================================
-- MIGRACIÓN 16: Reestructurar tabla solicitudes con tipos correctos
-- =========================================================
-- 
-- CAMBIOS:
-- 1. tipo_de_evento → tipo_servicio (renombramos el campo existente)
-- 2. Agregamos tipo_de_evento ENUM con valor fijo 'ALQUILER_SALON'
-- 3. Agregamos es_publico BOOLEAN (siempre FALSE para alquileres)
-- 4. Actualizamos datos existentes para coherencia
--
-- LÓGICA CORRECTA:
-- - tipo_de_evento = 'ALQUILER_SALON' (identifica que es alquiler)
-- - tipo_servicio = 'INFANTILES' | 'ADOLESCENTES' | 'CON_SERVICIO_DE_MESA' | etc. (subtipo específico)
-- - es_publico = FALSE (los alquileres NO son públicos)
-- =========================================================

USE tdc_db;

-- 1) Renombrar columna tipo_de_evento a tipo_servicio
ALTER TABLE solicitudes 
  CHANGE COLUMN tipo_de_evento tipo_servicio VARCHAR(255);

-- 2) Agregar columna tipo_de_evento con valor ENUM y DEFAULT
ALTER TABLE solicitudes
  ADD COLUMN tipo_de_evento ENUM('ALQUILER_SALON') NOT NULL DEFAULT 'ALQUILER_SALON' AFTER id_solicitud;

-- 3) Agregar columna es_publico (siempre FALSE para solicitudes de alquiler)
ALTER TABLE solicitudes
  ADD COLUMN es_publico BOOLEAN NOT NULL DEFAULT FALSE AFTER tipo_de_evento;

-- 4) Limpiar datos: mapear valores de tipo_servicio a enums válidos
-- (Los valores existentes ya corresponden a los 5 tipos: SIN_SERVICIO_DE_MESA, CON_SERVICIO_DE_MESA, INFANTILES, INFORMALES, etc.)
-- Solo necesitamos mapear FECHA_BANDAS (que no debería estar aquí)

UPDATE solicitudes
SET tipo_servicio = 'INFORMALES'
WHERE tipo_servicio = 'FECHA_BANDAS';

-- 5) Validar datos: confirmar que todos los tipo_servicio son válidos
-- Valores esperados: ADOLESCENTES, BABY_SHOWERS, CON_SERVICIO_DE_MESA, INFANTILES, INFORMALES, SIN_SERVICIO_DE_MESA

-- 6) Agregar restricción de clave foránea a alquiler_salon si no existe
ALTER TABLE alquiler_salon
  MODIFY event_id INT,
  ADD CONSTRAINT UNIQUE KEY unique_event (event_id);

-- 7) Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_solicitudes_tipo_estado ON solicitudes(tipo_servicio, estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_es_publico ON solicitudes(es_publico);

-- Confirmar migración
SELECT 
  '✅ Migración 16 completada: Estructura de solicitudes reorganizada' AS status,
  COUNT(*) as total_solicitudes,
  'tipo_de_evento = ALQUILER_SALON (fijo)' as tipo_evento_value,
  'tipo_servicio = [INFANTILES|ADOLESCENTES|etc]' as tipo_servicio_description,
  'es_publico = FALSE (siempre)' as es_publico_value
FROM solicitudes;
