-- =============================================================================
-- MIGRACIÓN FASE 2 — Mover campos de evento al padre + estandarizar tipos
-- Fecha: 27/03/2026
-- Descripción:
--   1. Agrega fecha_evento, hora_inicio, duracion_minutos, hora_fin,
--      fecha_alternativa a la tabla padre 'solicitudes'.
--   2. Limpia los valores de texto en columnas 'duracion' (de "X horas" a
--      minutos numéricos) antes del cambio de tipo.
--   3. Migra los datos de las tablas hijo al padre.
--   4. Estandariza los tipos de hora_evento (VARCHAR→TIME) y
--      duracion (VARCHAR→INT) en sfb, ss y st.
-- BACKUP PREVIO recomendado antes de ejecutar.
-- =============================================================================

USE tdc_db;

-- -----------------------------------------------------------------------------
-- PASO 1: Agregar columnas al padre solicitudes
-- -----------------------------------------------------------------------------

ALTER TABLE solicitudes
  ADD COLUMN fecha_evento      DATE     DEFAULT NULL          COMMENT 'Fecha principal del evento'    AFTER descripcion_larga,
  ADD COLUMN hora_inicio       TIME     DEFAULT NULL          COMMENT 'Hora de inicio del evento'     AFTER fecha_evento,
  ADD COLUMN duracion_minutos  INT      DEFAULT NULL          COMMENT 'Duración en minutos'           AFTER hora_inicio,
  ADD COLUMN hora_fin          TIME     DEFAULT NULL          COMMENT 'Hora estimada de fin'          AFTER duracion_minutos,
  ADD COLUMN fecha_alternativa DATE     DEFAULT NULL          COMMENT 'Fecha alternativa propuesta'   AFTER hora_fin;

-- -----------------------------------------------------------------------------
-- PASO 2: Limpiar columnas 'duracion' VARCHAR antes de cambiar tipo
--         Convierte "X horas" → minutos enteros, "X minutos" → minutos enteros
-- -----------------------------------------------------------------------------

-- sfb.duracion: valores "2.5 horas", "4 horas", "3 horas"
UPDATE solicitudes_fechas_bandas
SET duracion = CASE
    WHEN TRIM(duracion) REGEXP '^[0-9]+(\\.[0-9]+)? horas?$'
        THEN CAST(ROUND(CAST(TRIM(REPLACE(REPLACE(duracion, ' horas', ''), ' hora', '')) AS DECIMAL(10,2)) * 60) AS CHAR)
    WHEN TRIM(duracion) REGEXP '^[0-9]+ minutos?$'
        THEN CAST(TRIM(REPLACE(REPLACE(duracion, ' minutos', ''), ' minuto', '')) AS CHAR)
    WHEN TRIM(duracion) REGEXP '^[0-9]+$'
        THEN duracion  -- ya es número
    ELSE NULL
END
WHERE duracion IS NOT NULL AND TRIM(duracion) != '';

-- ss.duracion: valores "4 horas"
UPDATE solicitudes_servicios
SET duracion = CASE
    WHEN TRIM(duracion) REGEXP '^[0-9]+(\\.[0-9]+)? horas?$'
        THEN CAST(ROUND(CAST(TRIM(REPLACE(REPLACE(duracion, ' horas', ''), ' hora', '')) AS DECIMAL(10,2)) * 60) AS CHAR)
    WHEN TRIM(duracion) REGEXP '^[0-9]+ minutos?$'
        THEN CAST(TRIM(REPLACE(REPLACE(duracion, ' minutos', ''), ' minuto', '')) AS CHAR)
    WHEN TRIM(duracion) REGEXP '^[0-9]+$'
        THEN duracion
    ELSE NULL
END
WHERE duracion IS NOT NULL AND TRIM(duracion) != '';

-- st.duracion: valores "90 minutos"
UPDATE solicitudes_talleres
SET duracion = CASE
    WHEN TRIM(duracion) REGEXP '^[0-9]+(\\.[0-9]+)? horas?$'
        THEN CAST(ROUND(CAST(TRIM(REPLACE(REPLACE(duracion, ' horas', ''), ' hora', '')) AS DECIMAL(10,2)) * 60) AS CHAR)
    WHEN TRIM(duracion) REGEXP '^[0-9]+ minutos?$'
        THEN CAST(TRIM(REPLACE(REPLACE(duracion, ' minutos', ''), ' minuto', '')) AS CHAR)
    WHEN TRIM(duracion) REGEXP '^[0-9]+$'
        THEN duracion
    ELSE NULL
END
WHERE duracion IS NOT NULL AND TRIM(duracion) != '';

-- -----------------------------------------------------------------------------
-- PASO 3: Migrar datos de solicitudes_fechas_bandas → solicitudes padre
-- -----------------------------------------------------------------------------

UPDATE solicitudes s
JOIN solicitudes_fechas_bandas sfb ON sfb.id_solicitud = s.id_solicitud
SET s.fecha_evento      = sfb.fecha_evento,
    s.hora_inicio       = CASE
                            WHEN sfb.hora_evento IS NOT NULL AND TRIM(sfb.hora_evento) != ''
                            THEN STR_TO_DATE(TRIM(sfb.hora_evento), '%H:%i')
                            ELSE NULL
                          END,
    s.duracion_minutos  = CASE
                            WHEN sfb.duracion IS NOT NULL AND TRIM(sfb.duracion) REGEXP '^[0-9]+$'
                            THEN CAST(sfb.duracion AS UNSIGNED)
                            ELSE NULL
                          END,
    s.fecha_alternativa = sfb.fecha_alternativa
WHERE sfb.fecha_evento IS NOT NULL
  AND s.fecha_evento IS NULL;

-- -----------------------------------------------------------------------------
-- PASO 4: Migrar datos de solicitudes_alquiler → solicitudes padre
--         (sa.duracion ya es INT en minutos, hora_evento ya es TIME)
-- -----------------------------------------------------------------------------

UPDATE solicitudes s
JOIN solicitudes_alquiler sa ON sa.id_solicitud = s.id_solicitud
SET s.fecha_evento     = sa.fecha_evento,
    s.hora_inicio      = sa.hora_evento,
    s.duracion_minutos = sa.duracion
WHERE sa.fecha_evento IS NOT NULL
  AND s.fecha_evento IS NULL;

-- -----------------------------------------------------------------------------
-- PASO 5: Migrar datos de solicitudes_servicios → solicitudes padre
-- -----------------------------------------------------------------------------

UPDATE solicitudes s
JOIN solicitudes_servicios ss ON ss.id_solicitud = s.id_solicitud
SET s.fecha_evento     = ss.fecha_evento,
    s.hora_inicio      = CASE
                           WHEN ss.hora_evento IS NOT NULL AND TRIM(ss.hora_evento) != ''
                           THEN STR_TO_DATE(TRIM(ss.hora_evento), '%H:%i')
                           ELSE NULL
                         END,
    s.duracion_minutos = CASE
                           WHEN ss.duracion IS NOT NULL AND TRIM(ss.duracion) REGEXP '^[0-9]+$'
                           THEN CAST(ss.duracion AS UNSIGNED)
                           ELSE NULL
                         END
WHERE ss.fecha_evento IS NOT NULL
  AND s.fecha_evento IS NULL;

-- -----------------------------------------------------------------------------
-- PASO 6: Migrar datos de solicitudes_talleres → solicitudes padre
-- -----------------------------------------------------------------------------

UPDATE solicitudes s
JOIN solicitudes_talleres st ON st.id_solicitud = s.id_solicitud
SET s.fecha_evento     = st.fecha_evento,
    s.hora_inicio      = CASE
                           WHEN st.hora_evento IS NOT NULL AND TRIM(st.hora_evento) != ''
                           THEN STR_TO_DATE(TRIM(st.hora_evento), '%H:%i')
                           ELSE NULL
                         END,
    s.duracion_minutos = CASE
                           WHEN st.duracion IS NOT NULL AND TRIM(st.duracion) REGEXP '^[0-9]+$'
                           THEN CAST(st.duracion AS UNSIGNED)
                           ELSE NULL
                         END
WHERE st.fecha_evento IS NOT NULL
  AND s.fecha_evento IS NULL;

-- -----------------------------------------------------------------------------
-- PASO 7: Calcular hora_fin donde tenemos hora_inicio y duracion válida
-- -----------------------------------------------------------------------------

UPDATE solicitudes
SET hora_fin = ADDTIME(hora_inicio, SEC_TO_TIME(duracion_minutos * 60))
WHERE hora_inicio IS NOT NULL
  AND duracion_minutos IS NOT NULL
  AND duracion_minutos > 0;

-- -----------------------------------------------------------------------------
-- PASO 8: Estandarizar tipos en solicitudes_fechas_bandas
-- -----------------------------------------------------------------------------

ALTER TABLE solicitudes_fechas_bandas
  MODIFY COLUMN hora_evento TIME    DEFAULT NULL COMMENT 'Hora de inicio del evento',
  MODIFY COLUMN duracion    INT     DEFAULT NULL COMMENT 'Duración en minutos';

-- -----------------------------------------------------------------------------
-- PASO 9: Estandarizar tipos en solicitudes_servicios
-- -----------------------------------------------------------------------------

ALTER TABLE solicitudes_servicios
  MODIFY COLUMN hora_evento TIME    DEFAULT NULL COMMENT 'Hora de inicio del evento',
  MODIFY COLUMN duracion    INT     DEFAULT NULL COMMENT 'Duración en minutos';

-- -----------------------------------------------------------------------------
-- PASO 10: Estandarizar tipos en solicitudes_talleres
-- -----------------------------------------------------------------------------

ALTER TABLE solicitudes_talleres
  MODIFY COLUMN hora_evento TIME    DEFAULT NULL COMMENT 'Hora de inicio del evento',
  MODIFY COLUMN duracion    INT     DEFAULT NULL COMMENT 'Duración en minutos';

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN
-- -----------------------------------------------------------------------------

SELECT 'MIGRACIÓN FASE 2 COMPLETA' AS resultado;

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'tdc_db'
  AND TABLE_NAME IN ('solicitudes', 'solicitudes_alquiler', 'solicitudes_fechas_bandas',
                     'solicitudes_servicios', 'solicitudes_talleres')
  AND COLUMN_NAME IN ('fecha_evento', 'hora_inicio', 'hora_evento', 'duracion',
                      'duracion_minutos', 'hora_fin', 'fecha_alternativa')
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT 'Conteo de solicitudes con fecha_evento en padre:' AS info,
       COUNT(*) AS total
FROM solicitudes
WHERE fecha_evento IS NOT NULL;
