-- ARCHIVED: Columna ya existe en 01_schema.sql
-- Migración: Agregar url_flyer a tabla solicitudes (padre)
-- Justificación: El flyer es un atributo de la solicitud, no específico de fechas/bandas
-- Permite que TODOS los tipos de eventos (alquiler, bandas, servicios, talleres) tengan flyer

ALTER TABLE solicitudes 
ADD COLUMN IF NOT EXISTS url_flyer MEDIUMTEXT DEFAULT NULL COMMENT 'URL del flyer/cartel/promocional adjunto por el solicitante'
AFTER descripcion_larga;

-- Verificación
SHOW COLUMNS FROM solicitudes WHERE Field = 'url_flyer';
