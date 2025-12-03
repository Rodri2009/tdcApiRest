-- Migración 7: Añadir columnas de precio a bandas_solicitudes

ALTER TABLE bandas_solicitudes
  ADD COLUMN IF NOT EXISTS precio_anticipada DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS precio_puerta DECIMAL(10,2) NULL;

SELECT 'migration_7_ok' AS status;
