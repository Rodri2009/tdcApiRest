-- Migración: Añadir FK eventos_confirmados.id_solicitud -> solicitudes.id
-- Fecha: 2026-02-19
-- Objetivo: Forzar integridad referencial entre eventos_confirmados y solicitudes.
-- PRECONDICIÓN: No debe haber filas huérfanas en eventos_confirmados (ejecutar scripts/backfill_confirmed_solicitudes.js si las hay).

-- 1) Mostrar conteo de filas huérfanas (debe ser 0 antes de aplicar la FK)
SELECT
  (SELECT COUNT(*) FROM eventos_confirmados e LEFT JOIN solicitudes s ON e.id_solicitud = s.id WHERE s.id IS NULL) AS orphan_eventos_count;

-- 2) Eliminar restricción antigua si existiera (seguro / idempotente)
ALTER TABLE eventos_confirmados
  DROP FOREIGN KEY IF EXISTS fk_eventos_confirmados_solicitud;

-- 3) Añadir la restricción FK (ON DELETE CASCADE para comportamiento consistente con otras tablas de solicitudes)
ALTER TABLE eventos_confirmados
  ADD CONSTRAINT fk_eventos_confirmados_solicitud
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- 4) Verificación rápida
SELECT CONSTRAINT_NAME, DELETE_RULE, UPDATE_RULE
  FROM information_schema.REFERENTIAL_CONSTRAINTS
 WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'eventos_confirmados'
   AND CONSTRAINT_NAME = 'fk_eventos_confirmados_solicitud';
