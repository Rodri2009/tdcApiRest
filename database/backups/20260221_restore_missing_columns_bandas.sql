-- Migración: Restaurar columnas faltantes en solicitudes_fechas_bandas
-- Fecha: 2026-02-21
-- Descripción: Agregar columnas id_banda, invitadas_json, precio_final, es_publico que definen el schema pero fueron perdidas
-- durante cambios de fase. El backend y frontend esperan estas columnas.

-- Verificar y agregar id_banda si falta
ALTER TABLE solicitudes_fechas_bandas ADD COLUMN IF NOT EXISTS id_banda INT DEFAULT NULL COMMENT 'FK a bandas_artistas.id (banda principal)' AFTER id_solicitud;

-- Verificar y agregar invitadas_json si falta
ALTER TABLE solicitudes_fechas_bandas ADD COLUMN IF NOT EXISTS invitadas_json TEXT COMMENT 'JSON array de bandas invitadas: [{id_banda, nombre}]' AFTER expectativa_publico;

-- Verificar y agregar precio_final si falta
ALTER TABLE solicitudes_fechas_bandas ADD COLUMN IF NOT EXISTS precio_final DECIMAL(10,2) DEFAULT NULL COMMENT 'Precio en puerta / Precio final' AFTER precio_basico;

-- Verificar y agregar es_publico si falta
ALTER TABLE solicitudes_fechas_bandas ADD COLUMN IF NOT EXISTS es_publico TINYINT(1) DEFAULT 1 COMMENT 'Evento visible en agenda pública' AFTER notas_admin;

-- Verificar y agregar índice para banda si falta
ALTER TABLE solicitudes_fechas_bandas ADD INDEX IF NOT EXISTS idx_banda (id_banda);

-- Verificar y agregar FK para id_banda si falta
ALTER TABLE solicitudes_fechas_bandas DROP FOREIGN KEY IF EXISTS fk_solicitudes_fechas_bandas_banda;
ALTER TABLE solicitudes_fechas_bandas ADD CONSTRAINT fk_solicitudes_fechas_bandas_banda 
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id) ON DELETE SET NULL;

-- Verificar estructura actualizada
SELECT '✅ Estructura de solicitudes_fechas_bandas después de restaurar columnas:' AS status;
SHOW COLUMNS FROM solicitudes_fechas_bandas;
