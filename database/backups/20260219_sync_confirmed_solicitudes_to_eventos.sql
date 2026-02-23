-- ARCHIVED: Usa columnas deprecadas (precio_final en lugar de precio_puerta). Datos sincronizados manualmente.
-- Migración: Sincronizar solicitudes confirmadas sin eventos a eventos_confirmados
-- Fecha: 2026-02-19
-- Descripción: 
--   Crea eventos_confirmados para todas las solicitudes confirmadas (alquiler, bandas, servicios, talleres)
--   que no tengan un evento correspondiente. Esto asegura que todos los eventos confirmados sean visibles
--   en la agenda pública.

SET FOREIGN_KEY_CHECKS=0;
START TRANSACTION;

-- 1. ALQUILER: Crear eventos para solicitudes_alquiler confirmadas
INSERT INTO eventos_confirmados (
    id_solicitud, tipo_evento, tabla_origen,
    nombre_evento, descripcion, url_flyer, fecha_evento, hora_inicio, duracion_estimada,
    nombre_cliente, email_cliente, telefono_cliente,
    precio_base, precio_final, es_publico, activo,
    genero_musical, cantidad_personas, tipo_servicio, nombre_taller
)
SELECT
    sa.id_solicitud,
    'ALQUILER_SALON',
    'solicitudes_alquiler',
    COALESCE(s.descripcion_corta, sa.tipo_de_evento, 'Alquiler'),
    sa.descripcion,
    s.url_flyer,
    sa.fecha_evento,
    COALESCE(sa.hora_evento, '21:00:00'),
    sa.duracion,
    COALESCE(c.nombre, ''),
    c.email,
    c.telefono,
    sa.precio_basico,
    sa.precio_final,
    COALESCE(s.es_publico, 0),
    1,
    NULL,
    sa.cantidad_de_personas,
    sa.tipo_servicio,
    NULL
FROM solicitudes_alquiler sa
JOIN solicitudes s ON sa.id_solicitud = s.id
LEFT JOIN clientes c ON s.cliente_id = c.id
WHERE s.estado = 'Confirmado'
AND NOT EXISTS (
    SELECT 1 FROM eventos_confirmados 
    WHERE id_solicitud = sa.id_solicitud AND tipo_evento = 'ALQUILER_SALON'
);

-- 2. BANDAS: Crear eventos para solicitudes_fechas_bandas confirmadas
INSERT INTO eventos_confirmados (
    id_solicitud, tipo_evento, tabla_origen,
    nombre_evento, descripcion, url_flyer, fecha_evento, hora_inicio, duracion_estimada,
    nombre_cliente, email_cliente, telefono_cliente,
    precio_base, precio_final, es_publico, activo,
    genero_musical, cantidad_personas, tipo_servicio, nombre_taller
)
SELECT
    sfb.id_solicitud,
    'BANDA',
    'solicitudes_fechas_bandas',
    COALESCE(s.descripcion_corta, 'Banda', ba.nombre),
    sfb.descripcion,
    s.url_flyer,
    sfb.fecha_evento,
    COALESCE(sfb.hora_evento, '21:00:00'),
    sfb.duracion,
    COALESCE(c.nombre, ''),
    c.email,
    c.telefono,
    sfb.precio_basico,
    sfb.precio_final,
    COALESCE(s.es_publico, 0),
    1,
    COALESCE(ba.genero_musical, NULL),
    sfb.cantidad_bandas,
    NULL,
    NULL
FROM solicitudes_fechas_bandas sfb
JOIN solicitudes s ON sfb.id_solicitud = s.id
LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id
LEFT JOIN clientes c ON s.cliente_id = c.id
WHERE s.estado = 'Confirmado'
AND NOT EXISTS (
    SELECT 1 FROM eventos_confirmados 
    WHERE id_solicitud = sfb.id_solicitud AND tipo_evento = 'BANDA'
);

-- 3. SERVICIOS: Crear eventos para solicitudes_servicios confirmadas
INSERT INTO eventos_confirmados (
    id_solicitud, tipo_evento, tabla_origen,
    nombre_evento, descripcion, url_flyer, fecha_evento, hora_inicio, duracion_estimada,
    nombre_cliente, email_cliente, telefono_cliente,
    precio_base, precio_final, es_publico, activo,
    genero_musical, cantidad_personas, tipo_servicio, nombre_taller
)
SELECT
    ss.id_solicitud,
    'SERVICIO',
    'solicitudes_servicios',
    COALESCE(s.descripcion_corta, ss.tipo_servicio, 'Servicio'),
    NULL,
    s.url_flyer,
    ss.fecha_evento,
    COALESCE(ss.hora_evento, '21:00:00'),
    ss.duracion,
    COALESCE(c.nombre, ''),
    c.email,
    c.telefono,
    ss.precio,
    NULL,
    COALESCE(s.es_publico, 0),
    1,
    NULL,
    NULL,
    ss.tipo_servicio,
    NULL
FROM solicitudes_servicios ss
JOIN solicitudes s ON ss.id_solicitud = s.id
LEFT JOIN clientes c ON s.cliente_id = c.id
WHERE s.estado = 'Confirmado'
AND NOT EXISTS (
    SELECT 1 FROM eventos_confirmados 
    WHERE id_solicitud = ss.id_solicitud AND tipo_evento = 'SERVICIO'
);

-- 4. TALLERES: Crear eventos para solicitudes_talleres confirmadas
INSERT INTO eventos_confirmados (
    id_solicitud, tipo_evento, tabla_origen,
    nombre_evento, descripcion, url_flyer, fecha_evento, hora_inicio, duracion_estimada,
    nombre_cliente, email_cliente, telefono_cliente,
    precio_base, precio_final, es_publico, activo,
    genero_musical, cantidad_personas, tipo_servicio, nombre_taller
)
SELECT
    st.id_solicitud,
    'TALLER',
    'solicitudes_talleres',
    COALESCE(s.descripcion_corta, st.nombre_taller, 'Taller'),
    NULL,
    s.url_flyer,
    st.fecha_evento,
    COALESCE(st.hora_evento, '21:00:00'),
    st.duracion,
    COALESCE(c.nombre, ''),
    c.email,
    c.telefono,
    NULL,
    NULL,
    COALESCE(s.es_publico, 0),
    1,
    NULL,
    NULL,
    NULL,
    st.nombre_taller
FROM solicitudes_talleres st
JOIN solicitudes s ON st.id_solicitud = s.id
LEFT JOIN clientes c ON s.cliente_id = c.id
WHERE s.estado = 'Confirmado'
AND NOT EXISTS (
    SELECT 1 FROM eventos_confirmados 
    WHERE id_solicitud = st.id_solicitud AND tipo_evento = 'TALLER'
);

COMMIT;

-- Actualizar id_evento_generado en solicitudes_fechas_bandas para que apunte al evento creado
UPDATE solicitudes_fechas_bandas sfb
SET id_evento_generado = (
    SELECT id FROM eventos_confirmados 
    WHERE id_solicitud = sfb.id_solicitud AND tipo_evento = 'BANDA'
)
WHERE EXISTS (
    SELECT 1 FROM eventos_confirmados 
    WHERE id_solicitud = sfb.id_solicitud AND tipo_evento = 'BANDA'
) AND id_evento_generado IS NULL;

SET FOREIGN_KEY_CHECKS=1;
