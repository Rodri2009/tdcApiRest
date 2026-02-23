-- Migración: Refactorizar estructura de bandas a JSON unificado
-- Fecha: 2026-02-21
-- Descripción: 
--   Migrar de (id_banda + nombre_banda + invitadas_json) → bandas_json (única fuente de verdad)
--   Estructura nueva:
--   bandas_json = [
--     { id_banda: 1, nombre: "Banda 1", orden_show: 0, es_principal: true },
--     { id_banda: 2, nombre: "Banda 2", orden_show: 1, es_principal: false }
--   ]

-- PASO 1: Agregar columna bandas_json si no existe
ALTER TABLE solicitudes_fechas_bandas 
ADD COLUMN IF NOT EXISTS bandas_json TEXT COMMENT 'JSON array de bandas [{id_banda, nombre, orden_show, es_principal}]' 
AFTER expectativa_publico;

-- PASO 2: Migrar datos de (id_banda + invitadas_json) → bandas_json
-- Para cada solicitud:
-- 1. Si tiene id_banda, agregar como banda principal (orden=0, es_principal=true)
-- 2. Si tiene invitadas_json, agregar cada invitada (orden=1+, es_principal=false)

UPDATE solicitudes_fechas_bandas
SET bandas_json = CASE
    WHEN id_banda IS NOT NULL AND invitadas_json IS NOT NULL THEN
        -- Tiene banda principal + invitadas
        CONCAT(
            '[{"id_banda":',COALESCE(id_banda,'null'),',"nombre":"',
            COALESCE(nombre_banda,'Sin nombre'),'","orden_show":0,"es_principal":true},',
            SUBSTRING(invitadas_json, 2, LENGTH(invitadas_json)-2),
            ']'
        )
    WHEN id_banda IS NOT NULL THEN
        -- Solo banda principal (sin invitadas)
        CONCAT(
            '[{"id_banda":',COALESCE(id_banda,'null'),
            ',"nombre":"',COALESCE(nombre_banda,'Sin nombre'),
            '","orden_show":0,"es_principal":true}]'
        )
    WHEN invitadas_json IS NOT NULL THEN
        -- Solo invitadas (sin banda principal) - raro pero posible
        invitadas_json
    ELSE
        -- Sin bandas
        '[]'
END
WHERE bandas_json IS NULL;

-- PASO 3: Verificar que la migración fue exitosa
SELECT '✅ Verificando migraci\u00f3n de bandas_json' AS status;
SELECT 
    id_solicitud,
    id_banda,
    nombre_banda,
    invitadas_json,
    bandas_json,
    JSON_LENGTH(bandas_json) as cantidad_bandas_en_json
FROM solicitudes_fechas_bandas
LIMIT 5;

-- PASO 4: Marcar como archivado (no eliminar aún para compatibilidad)
-- NOTE: id_banda y nombre_banda ahora son DEPRECATED
-- Usar bandas_json como ÚNICA fuente de verdad
-- Las columnas viejas se pueden eliminar en future cleanup si es necesario

SHOW COLUMNS FROM solicitudes_fechas_bandas WHERE Field IN ('bandas_json', 'id_banda', 'nombre_banda');
