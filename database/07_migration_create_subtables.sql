-- Migración 4: Clasificar eventos existentes e insertar datos en subtables
-- Nota: Las tablas ya fueron creadas en migración 06, solo clasificamos aquí

-- Índices
CREATE INDEX idx_eventos_tipo_fecha ON eventos(tipo_evento, fecha_hora);
CREATE INDEX idx_eventos_es_publico_fecha ON eventos(es_publico, fecha_hora);

-- 3) Reglas automáticas de clasificación para registros existentes
-- Prioridad: BANDA (si nombre_banda existe), ALQUILER (si descripcion/nombre contiene 'alquil'), TALLER (si descripcion contiene 'taller'), DEPILACION (si descripcion contiene 'depil')

-- Marcar bandas donde exista nombre_banda
UPDATE eventos
SET tipo_evento = 'BANDA', es_publico = 1
WHERE (nombre_banda IS NOT NULL AND TRIM(nombre_banda) <> '')
  AND (tipo_evento IS NULL OR tipo_evento = 'OTRO');

-- Marcar alquiler si la descripción o nombre contiene 'alquil' (alquiler/alquilar)
UPDATE eventos
SET tipo_evento = 'ALQUILER', es_publico = 0
WHERE (LOWER(IFNULL(descripcion, '')) LIKE '%alquil%' OR LOWER(IFNULL(nombre_banda, '')) LIKE '%alquil%')
  AND (tipo_evento IS NULL OR tipo_evento = 'OTRO');

-- Marcar talleres si la descripción contiene 'taller'
UPDATE eventos
SET tipo_evento = 'TALLER', es_publico = 1
WHERE LOWER(IFNULL(descripcion, '')) LIKE '%taller%'
  AND (tipo_evento IS NULL OR tipo_evento = 'OTRO');

-- Marcar depilacion si la descripcion contiene 'depil'
UPDATE eventos
SET tipo_evento = 'DEPILACION', es_publico = 1
WHERE LOWER(IFNULL(descripcion, '')) LIKE '%depil%'
  AND (tipo_evento IS NULL OR tipo_evento = 'OTRO');

-- Dejar el resto como OTRO y público por defecto (ya configurado por defecto)

-- 4) Poblar las subtables mínimamente para los eventos clasificados (no sobrescribe entradas existentes)

-- Bandas en vivo
INSERT INTO bandas_en_vivo (event_id, nombre_banda)
SELECT id, nombre_banda
FROM eventos e
WHERE e.tipo_evento = 'BANDA'
  AND NOT EXISTS (SELECT 1 FROM bandas_en_vivo b WHERE b.event_id = e.id);

-- Talleres/Actividades
INSERT INTO talleres_actividades (event_id)
SELECT id
FROM eventos e
WHERE e.tipo_evento = 'TALLER'
  AND NOT EXISTS (SELECT 1 FROM talleres_actividades t WHERE t.event_id = e.id);

-- Servicios (depilacion u otros servicios)
INSERT INTO servicios (event_id)
SELECT id
FROM eventos e
WHERE e.tipo_evento = 'DEPILACION'
  AND NOT EXISTS (SELECT 1 FROM servicios s WHERE s.event_id = e.id);

-- Alquiler del salón
INSERT INTO alquiler_salon (event_id)
SELECT id
FROM eventos e
WHERE e.tipo_evento = 'ALQUILER'
  AND NOT EXISTS (SELECT 1 FROM alquiler_salon a WHERE a.event_id = e.id);

-- Fin de migración
SELECT 'migracion_4_ok' AS status;
