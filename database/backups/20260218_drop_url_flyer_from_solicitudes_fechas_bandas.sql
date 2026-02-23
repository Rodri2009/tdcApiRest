-- ARCHIVED: Estructura ya correcta en 01_schema.sql
-- Migración: Remover url_flyer de solicitudes_fechas_bandas
-- Justificación: url_flyer ahora está centralizado en la tabla padre 'solicitudes'
-- Esto evita redundancia y sigue mejor el patrón de normalización

ALTER TABLE solicitudes_fechas_bandas 
DROP COLUMN IF EXISTS url_flyer;

-- Verificación
SHOW COLUMNS FROM solicitudes_fechas_bandas LIKE 'url_flyer';
