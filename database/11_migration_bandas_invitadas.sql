-- Migración 7: Añadir columna para invitados en bandas_solicitudes

ALTER TABLE bandas_solicitudes
  ADD COLUMN invitados JSON NULL;

SELECT 'migracion_7_ok' AS status;
