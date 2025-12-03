-- Migración 18: Insertar tipo SIN_SERVICIO_DE_MESA faltante
-- Problema: La solicitud ID=1 usa SIN_SERVICIO_DE_MESA pero el tipo no existe en opciones_tipos
-- Este tipo es para alquileres de salón sin servicio de mesa

INSERT INTO opciones_tipos (
    id_evento, 
    nombre_para_mostrar, 
    descripcion, 
    monto_sena, 
    deposito, 
    es_publico, 
    categoria
) VALUES (
    'SIN_SERVICIO_DE_MESA',
    'FIESTAS sin servicio de mesa (ALQUILER)',
    'Alquiler de salón sin servicio de mesa ni cocinera. Incluye: encargada general, encargada de puerta, mesas, sillas, mantelería, uso de cocina básica, baño equipado, equipo de música, juegos de entretenimiento (metegol, ping pong, pool, jenga). NO INCLUYE: cocinera, meseras, servicios especializados.',
    50000.00,
    0.00,
    1,
    'ALQUILER'
) ON DUPLICATE KEY UPDATE
    nombre_para_mostrar = 'FIESTAS sin servicio de mesa (ALQUILER)',
    descripcion = 'Alquiler de salón sin servicio de mesa ni cocinera. Incluye: encargada general, encargada de puerta, mesas, sillas, mantelería, uso de cocina básica, baño equipado, equipo de música, juegos de entretenimiento (metegol, ping pong, pool, jenga). NO INCLUYE: cocinera, meseras, servicios especializados.',
    es_publico = 1,
    categoria = 'ALQUILER';

-- Asegurar que CON_SERVICIO_DE_MESA es público
UPDATE opciones_tipos SET es_publico = 1 WHERE id_evento = 'CON_SERVICIO_DE_MESA';

-- Asegurar que INFORMALES es público
UPDATE opciones_tipos SET es_publico = 1 WHERE id_evento = 'INFORMALES';

-- Asegurar que tipos OTRO (INFANTILES, ADOLESCENTES, BABY_SHOWERS) son públicos
UPDATE opciones_tipos SET es_publico = 1 WHERE id_evento IN ('INFANTILES', 'ADOLESCENTES', 'BABY_SHOWERS');

-- Asegurar que FECHA_BANDAS es público (si existe)
UPDATE opciones_tipos SET es_publico = 1 WHERE id_evento = 'FECHA_BANDAS';

-- Depilación - puede no ser público o puede serlo
UPDATE opciones_tipos SET es_publico = 0 WHERE id_evento = 'DEPILACION_DEFINITIVA';

SELECT 'Migración 18: Tipos insertados/actualizados correctamente.' AS status;
SELECT id_evento, nombre_para_mostrar, categoria, es_publico FROM opciones_tipos ORDER BY categoria, nombre_para_mostrar;
