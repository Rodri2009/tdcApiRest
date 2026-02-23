-- ARCHIVED: consolidated into database/01_schema.sql/database/02_seed.sql on 2026-02-12
-- Migration: Migrar datos de fechas_bandas_confirmadas -> eventos_confirmados
-- Fecha: 2026-02-04
-- 1) Backup de la tabla original
DROP TABLE IF EXISTS backup_fechas_bandas_confirmadas;
CREATE TABLE backup_fechas_bandas_confirmadas AS SELECT * FROM fechas_bandas_confirmadas;

-- 2) Insertar en eventos_confirmados (si no existe ya)
INSERT INTO eventos_confirmados (
    id_solicitud, tipo_evento, tabla_origen,
    nombre_evento, descripcion, fecha_evento, hora_inicio, duracion_estimada,
    nombre_cliente, email_cliente, telefono_cliente,
    precio_base, precio_final, es_publico, activo,
    genero_musical, cantidad_personas, confirmado_en
)
SELECT
    NULL AS id_solicitud,
    'BANDA' AS tipo_evento,
    'fechas_bandas_confirmadas' AS tabla_origen,
    nombre_banda AS nombre_evento,
    descripcion,
    fecha AS fecha_evento,
    hora_inicio AS hora_inicio,
    NULL AS duracion_estimada,
    nombre_contacto AS nombre_cliente,
    email_contacto AS email_cliente,
    telefono_contacto AS telefono_cliente,
    precio_base,
    precio_puerta AS precio_final,
    es_publico,
    activo,
    genero_musical,
    aforo_maximo AS cantidad_personas,
    creado_en AS confirmado_en
FROM fechas_bandas_confirmadas f
WHERE NOT EXISTS (
    SELECT 1 FROM eventos_confirmados e
    WHERE e.nombre_evento = f.nombre_banda AND e.fecha_evento = f.fecha
);

-- 3) Crear tabla de mapping old_id -> new_id
DROP TABLE IF EXISTS mapping_fechas_eventos;
CREATE TABLE mapping_fechas_eventos AS
SELECT f.id AS old_id, e.id AS new_id
FROM fechas_bandas_confirmadas f
JOIN eventos_confirmados e ON e.nombre_evento = f.nombre_banda AND e.fecha_evento = f.fecha;

-- 4) Actualizar ids en tablas dependientes
UPDATE eventos_lineup el
JOIN mapping_fechas_eventos m ON el.id_evento_confirmado = m.old_id
SET el.id_evento_confirmado = m.new_id; 

UPDATE eventos_personal ep
JOIN mapping_fechas_eventos m ON ep.id_evento = m.old_id
SET ep.id_evento = m.new_id;

UPDATE eventos_bandas_invitadas eb
JOIN mapping_fechas_eventos m ON eb.id_evento = m.old_id
SET eb.id_evento = m.new_id;

UPDATE tickets t
JOIN mapping_fechas_eventos m ON t.id_evento = m.old_id
SET t.id_evento = m.new_id;

-- 5) Quitar las FK que referencian a fechas_bandas_confirmadas (dinámico)
-- Construir y ejecutar sentencias para dropear las FKs
SET @drop_sql = (
  SELECT GROUP_CONCAT(CONCAT('ALTER TABLE `', TABLE_NAME, '` DROP FOREIGN KEY `', CONSTRAINT_NAME, '`;') SEPARATOR ' ') 
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE REFERENCED_TABLE_NAME = 'fechas_bandas_confirmadas' AND CONSTRAINT_SCHEMA = DATABASE()
);

-- Ejecutar DROP FK si existe
PREPARE stmt FROM @drop_sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- 6) Añadir nuevas FKs apuntando a eventos_confirmados
ALTER TABLE eventos_lineup ADD CONSTRAINT fk_eventos_lineup_evento FOREIGN KEY (id_evento_confirmado) REFERENCES eventos_confirmados(id) ON DELETE CASCADE;
ALTER TABLE eventos_personal ADD CONSTRAINT fk_eventos_personal_evento FOREIGN KEY (id_evento) REFERENCES eventos_confirmados(id) ON DELETE CASCADE;
ALTER TABLE eventos_bandas_invitadas ADD CONSTRAINT fk_eventos_bandas_invitadas_evento FOREIGN KEY (id_evento) REFERENCES eventos_confirmados(id) ON DELETE CASCADE;
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_evento FOREIGN KEY (id_evento) REFERENCES eventos_confirmados(id) ON DELETE CASCADE;

-- 7) Renombrar la tabla original (no la eliminamos aún)
RENAME TABLE fechas_bandas_confirmadas TO fechas_bandas_confirmadas_deprecated;

-- 8) Verificación: mostrar contadores (para logs manuales)
SELECT COUNT(*) AS eventos_confirmados_total FROM eventos_confirmados;
SELECT COUNT(*) AS mapping_total FROM mapping_fechas_eventos;

-- FIN
