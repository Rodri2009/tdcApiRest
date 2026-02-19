-- Migración: Agregar campos url_flyer y es_publico a solicitudes_fechas_bandas
-- Fecha: 2025-02-15
-- Descripción: Agrega los campos necesarios para guardar URL del flyer y parámetro de privacidad de eventos

ALTER TABLE solicitudes_fechas_bandas 
ADD COLUMN IF NOT EXISTS url_flyer VARCHAR(500) DEFAULT NULL AFTER notas_admin,
ADD COLUMN IF NOT EXISTS es_publico TINYINT(1) DEFAULT 1 AFTER url_flyer;

ALTER TABLE solicitudes_fechas_bandas 
ADD INDEX idx_es_publico (es_publico) AFTER FOREIGN KEY(id_banda);

-- Verificar que los campos fueron agregados
SHOW COLUMNS FROM solicitudes_fechas_bandas;
