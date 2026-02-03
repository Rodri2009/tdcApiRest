-- ================================================
-- 06_migrate_solicitudes.sql
-- Propósito: Backfill y migración segura de solicitudes
-- - Copia datos desde `solicitudes_alquiler` y `solicitudes_bandas` hacia
--   la tabla normalizada `solicitudes`.
-- - Crea registros asociados en `solicitudes_talleres` y `solicitudes_servicios`
--   cuando corresponda.
-- - Migra adicionales y bandas (bandas_solicitudes) asociándolos al nuevo id.
--
-- Instrucciones de uso:
-- 1) Ejecutar en un ambiente de staging primero.
-- 2) Revisar los SELECTs de verificación después de cada bloque.
-- 3) Mantener backups (se generan automáticamente aquí con COPY).
-- 4) Si todo es correcto, remover/renombrar las tablas legacy tras un periodo de verificación.
--
-- Nota: este script intenta ser idempotente en la medida de lo posible.
-- ================================================

-- 0) Settings
SET @migracion = '2026-02-02_migracion_solicitudes';

-- Nota: para uniformizar nombres, renombrar la tabla legacy `solicitudes_bandas` a `solicitudes_bandas_legacy`
-- y la tabla nueva `bandas_solicitudes` a `solicitudes_bandas` si es necesario. Estas operaciones pueden ser
-- ejecutadas manualmente en la base de datos de staging/producción con las instrucciones siguientes (ejecutar solo si corresponde):
-- RENAME TABLE solicitudes_bandas TO solicitudes_bandas_legacy;
-- RENAME TABLE bandas_solicitudes TO solicitudes_bandas;

-- Se dejan comentadas por seguridad; descomentar y ejecutar manualmente cuando se verifique el plan de corte.

-- 1) Backups (crea copias rápidas de las tablas legacy)
DROP TABLE IF EXISTS backup_solicitudes_alquiler_20260202;
CREATE TABLE IF NOT EXISTS backup_solicitudes_alquiler_20260202 AS SELECT * FROM solicitudes_alquiler;

DROP TABLE IF EXISTS backup_solicitudes_bandas_20260202;
CREATE TABLE IF NOT EXISTS backup_solicitudes_bandas_20260202 AS SELECT * FROM solicitudes_bandas_legacy;

DROP TABLE IF EXISTS backup_solicitudes_adicionales_20260202;
CREATE TABLE IF NOT EXISTS backup_solicitudes_adicionales_20260202 AS SELECT * FROM solicitudes_adicionales;

-- 2) Preparar columna temporal de mapeo en `solicitudes`
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS migration_key VARCHAR(255) DEFAULT NULL;

-- 3) Backfill desde `solicitudes_alquiler` (ALQUILER_SALON, TALLERES_ACTIVIDADES, SERVICIOS)
--    Usamos migration_key = CONCAT('al_', id_solicitud) para mapear más tarde
INSERT INTO solicitudes (
    tipo_de_evento, tipo_servicio, es_publico, fecha_hora, fecha_evento, hora_evento, duracion,
    cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado, fingerprintid, migration_key
)
SELECT
    'ALQUILER_SALON' as tipo_de_evento,
    tipo_servicio,
    es_publico,
    fecha_hora,
    fecha_evento,
    hora_evento,
    duracion,
    cantidad_de_personas,
    precio_basico,
    nombre_completo,
    telefono,
    email,
    descripcion,
    estado,
    fingerprintid,
    CONCAT('al_', id_solicitud) as migration_key
FROM solicitudes_alquiler
WHERE id_solicitud IS NOT NULL;

-- Verificación rápida
SELECT 'alquiler_count_legacy' as label, COUNT(*) as cnt FROM solicitudes_alquiler;
SELECT 'alquiler_count_new' as label, COUNT(*) as cnt FROM solicitudes WHERE migration_key LIKE 'al\_%';

-- 4) Backfill desde `solicitudes_bandas`
INSERT INTO solicitudes (
    tipo_de_evento, tipo_servicio, es_publico, fecha_hora, fecha_evento, hora_evento, duracion,
    cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado, fingerprintid, migration_key
)
SELECT
    'FECHA_BANDAS' as tipo_de_evento,
    tipo_servicio,
    es_publico,
    fecha_hora,
    fecha_evento,
    hora_evento,
    duracion,
    cantidad_de_personas,
    precio_basico,
    nombre_completo,
    telefono,
    email,
    descripcion,
    estado,
    fingerprintid,
    CONCAT('bd_', id_solicitud) as migration_key
FROM solicitudes_bandas_legacy
WHERE id_solicitud IS NOT NULL;

-- Verificación
SELECT 'bandas_count_legacy' as label, COUNT(*) as cnt FROM solicitudes_bandas_legacy;
SELECT 'bandas_count_new' as label, COUNT(*) as cnt FROM solicitudes WHERE migration_key LIKE 'bd\_%';

-- 5) Migrar metadata de talleres: crear filas en solicitudes_talleres para filas ALQUILERS con tipo 'TALLERES_ACTIVIDADES'
INSERT INTO solicitudes_talleres (id_solicitud, taller_id, tallerista_id, modalidad, cupo)
SELECT s.id_solicitud, NULL, NULL, sa.tipo_servicio, NULL
FROM solicitudes_alquiler sa
JOIN solicitudes s ON s.migration_key = CONCAT('al_', sa.id_solicitud)
WHERE sa.tipo_de_evento = 'TALLERES_ACTIVIDADES';

-- Verificación
SELECT 'talleres_migradas' as label, COUNT(*) as cnt FROM solicitudes_talleres st JOIN solicitudes s ON st.id_solicitud = s.id_solicitud;

-- 6) Migrar metadata de servicios: crear filas en solicitudes_servicios para filas ALQUILERS con tipo 'SERVICIOS'
INSERT INTO solicitudes_servicios (id_solicitud, servicio_id, profesional_id, duracion_minutos, notas_servicio)
SELECT s.id_solicitud, sa.tipo_servicio, NULL, NULL, sa.descripcion
FROM solicitudes_alquiler sa
JOIN solicitudes s ON s.migration_key = CONCAT('al_', sa.id_solicitud)
WHERE sa.tipo_de_evento = 'SERVICIOS';

-- Verificación
SELECT 'servicios_migrados' as label, COUNT(*) as cnt FROM solicitudes_servicios ss JOIN solicitudes s ON ss.id_solicitud = s.id_solicitud;

-- 7) Migrar adicionales (solicitudes_adicionales)
INSERT INTO solicitudes_adicionales (id_solicitud, nombre_adicional, precio_adicional)
SELECT s.id_solicitud, sa.nombre_adicional, sa.precio_adicional
FROM solicitudes_adicionales sa
JOIN solicitudes s ON s.migration_key = CONCAT('al_', sa.id_solicitud);

-- Verificación
SELECT 'adicionales_legacy' as label, COUNT(*) as cnt FROM backup_solicitudes_adicionales_20260202;
SELECT 'adicionales_new' as label, COUNT(*) as cnt FROM solicitudes_adicionales WHERE id_solicitud IN (SELECT id_solicitud FROM solicitudes WHERE migration_key LIKE 'al\_%');

-- 8) Migrar bandas_solicitudes: asociar a los nuevos IDs creados desde solicitudes_bandas
-- Insertar sólo si no existe una fila equivalente para evitar duplicados
INSERT INTO solicitudes_bandas (id_solicitud, nombre_banda, contacto_email, link_musica, propuesta, event_id, precio_anticipada, precio_puerta, created_at, updated_at)
SELECT DISTINCT
    s.id_solicitud,
    b.nombre_completo AS nombre_banda,
    b.email AS contacto_email,
    COALESCE(b.youtube, b.instagram, b.facebook) AS link_musica,
    b.descripcion AS propuesta,
    NULL AS event_id,
    NULL AS precio_anticipada,
    b.precio_puerta_propuesto AS precio_puerta,
    NOW(), NOW()
FROM backup_solicitudes_bandas_20260202 b
JOIN solicitudes_bandas_legacy sb ON b.id_solicitud = sb.id_solicitud
JOIN solicitudes s ON s.migration_key = CONCAT('bd_', sb.id_solicitud)
LEFT JOIN solicitudes_bandas sb2 ON sb2.id_solicitud = s.id_solicitud AND sb2.nombre_banda = b.nombre_completo
WHERE sb2.id IS NULL;

-- Verificación
SELECT 'bandas_solicitudes_legacy' as label, COUNT(*) as cnt FROM backup_solicitudes_bandas_20260202;
SELECT 'bandas_solicitudes_new' as label, COUNT(*) as cnt FROM solicitudes_bandas WHERE id_solicitud IN (SELECT id_solicitud FROM solicitudes WHERE migration_key LIKE 'bd\_%');

-- 9) Post-checks / consistencia
-- - Contar solicitudes migradas vs legacy
SELECT 'resumen' as label,
  (SELECT COUNT(*) FROM solicitudes WHERE migration_key LIKE 'al\_%') as alquileres_migradas,
  (SELECT COUNT(*) FROM solicitudes_alquiler) as alquileres_legacy_total,
  (SELECT COUNT(*) FROM solicitudes WHERE migration_key LIKE 'bd\_%') as bandas_migradas,
  (SELECT COUNT(*) FROM solicitudes_bandas_legacy) as bandas_legacy_total;

-- 10) Limpieza temporal
-- (Opcional) Después de verificar manualmente, se puede remover la columna migration_key
-- ALTER TABLE solicitudes DROP COLUMN migration_key;

-- 11) Reversión rápida (si detectas problemas):
-- Ejemplo: Restaurar backups y truncar tablas nuevas (USAR CON PRECAUCIÓN)
-- ROLLBACK EXAMPLE (manual):
-- TRUNCATE TABLE solicitudes;
-- TRUNCATE TABLE solicitudes_talleres;
-- TRUNCATE TABLE solicitudes_servicios;
-- TRUNCATE TABLE solicitudes_adicionales;
-- INSERT INTO solicitudes_alquiler SELECT * FROM backup_solicitudes_alquiler_20260202; -- si fue modificada

-- FIN DEL SCRIPT

-- Notas:
-- - Este script hace asunciones razonables (por ejemplo no existe info exacta del taller_id en solicitudes_alquiler),
--   por lo que algunos campos se dejan NULL o se mapean a tipo_servicio cuando aplica.
-- - Recomendado: ejecutar por partes y revisar outputs de los SELECTs de verificación antes de continuar.
