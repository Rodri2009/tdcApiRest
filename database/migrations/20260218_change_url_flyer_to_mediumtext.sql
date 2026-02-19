-- Migración: cambiar columna url_flyer a MEDIUMTEXT para permitir data-URIs
-- Fecha: 2026-02-18

ALTER TABLE solicitudes_fechas_bandas 
  MODIFY COLUMN url_flyer MEDIUMTEXT DEFAULT NULL;

-- Verificación
SHOW COLUMNS FROM solicitudes_fechas_bandas LIKE 'url_flyer';
