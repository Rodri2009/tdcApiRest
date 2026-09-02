USE tdc_db;

-- 1) Crear solicitudes base para cada taller nuevo.
-- La migración es idempotente y puede reejecutarse sin duplicar registros.
INSERT INTO solicitudes (
    id_solicitud,
    categoria,
    id_cliente,
    id_usuario_creador,
    fecha_creacion,
    estado,
    es_publico,
    descripcion_corta,
    descripcion_larga,
    fecha_evento,
    hora_inicio,
    duracion_minutos,
    hora_fin,
    actualizado_en
)
SELECT 12, 'TALLERES', 2, 2, NOW(), 'Confirmado', 1,
       'Percusión Fun para Principiantes',
       'Taller de percusión corporal y ritmos latinos para principiantes. Se trabaja coordinación, escucha y groove en grupo.',
       '2026-09-15', '18:30:00', 60, '19:30:00', NOW()
WHERE NOT EXISTS (SELECT 1 FROM solicitudes WHERE id_solicitud = 12)
UNION ALL
SELECT 13, 'TALLERES', 2, 2, NOW(), 'Confirmado', 1,
       'Latin Dance Essentials',
       'Introducción al baile latino con trabajo de base, musicalidad y expresión corporal en un ambiente accesible.',
       '2026-09-17', '20:00:00', 60, '21:00:00', NOW()
WHERE NOT EXISTS (SELECT 1 FROM solicitudes WHERE id_solicitud = 13)
UNION ALL
SELECT 14, 'TALLERES', 2, 2, NOW(), 'Confirmado', 1,
       'Yoga para Recuperar Energía',
       'Práctica de yoga con foco en movilidad, respiración y relajación para comenzar o retomar la rutina.',
       '2026-09-20', '10:00:00', 60, '11:00:00', NOW()
WHERE NOT EXISTS (SELECT 1 FROM solicitudes WHERE id_solicitud = 14)
UNION ALL
SELECT 15, 'TALLERES', 2, 2, NOW(), 'Confirmado', 1,
       'Collage y Color',
       'Exploración creativa con recortes, texturas y color aplicados a composiciones visuales sencillas y expresivas.',
       '2026-09-25', '17:00:00', 90, '18:30:00', NOW()
WHERE NOT EXISTS (SELECT 1 FROM solicitudes WHERE id_solicitud = 15);

-- 2) Crear detalle de cada taller asociado a la solicitud padre.
INSERT INTO solicitudes_talleres (
    id_solicitud_taller,
    id_solicitud,
    nombre_taller,
    id_tipo_evento,
    comentarios_observaciones,
    fecha_evento,
    hora_evento,
    precio
)
SELECT 12, 12, 'Percusión Fun para Principiantes', 'TALLER_MUSICA_DANZA_Y_ARTES_ESCENICAS',
       'Taller de percusión corporal y ritmos latinos para principiantes.',
       '2026-09-15', '18:30:00', 3500.00
WHERE NOT EXISTS (SELECT 1 FROM solicitudes_talleres WHERE id_solicitud_taller = 12)
UNION ALL
SELECT 13, 13, 'Latin Dance Essentials', 'TALLER_MUSICA_DANZA_Y_ARTES_ESCENICAS',
       'Introducción al baile latino con trabajo de base, musicalidad y expresión corporal.',
       '2026-09-17', '20:00:00', 4000.00
WHERE NOT EXISTS (SELECT 1 FROM solicitudes_talleres WHERE id_solicitud_taller = 13)
UNION ALL
SELECT 14, 14, 'Yoga para Recuperar Energía', 'TALLER_CULTURA_COMUNITARIA_Y_DE_BARRIO',
       'Práctica de yoga con foco en movilidad, respiración y relajación.',
       '2026-09-20', '10:00:00', 3200.00
WHERE NOT EXISTS (SELECT 1 FROM solicitudes_talleres WHERE id_solicitud_taller = 14)
UNION ALL
SELECT 15, 15, 'Collage y Color', 'TALLER_ARTES_VISUALES_ARTESANIAS_Y_PATRIMONIO_MATERIAL',
       'Exploración creativa con recortes, texturas y color.',
       '2026-09-25', '17:00:00', 4200.00
WHERE NOT EXISTS (SELECT 1 FROM solicitudes_talleres WHERE id_solicitud_taller = 15);

-- 3) Crear sólo los 4 talleres que corresponden a las 4 solicitudes de taller.
-- Estos tipos pertenecen al catálogo TALLERES_ACTIVIDADES y no al catálogo genérico de eventos.
INSERT INTO talleres (
    tipo_taller_id,
    tallerista_id,
    id_cliente,
    nombre,
    descripcion,
    dia_semana,
    hora_inicio,
    hora_fin,
    duracion_minutos,
    cupo_maximo,
    cupo_minimo,
    ubicacion,
    activo,
    creado_en
)
SELECT 'TALLER_MUSICA_DANZA_Y_ARTES_ESCENICAS', 2, NULL, 'Percusión Fun para Principiantes',
       'Taller de percusión corporal y ritmos latinos para principiantes. Se trabaja coordinación, escucha y groove en grupo.',
       'martes', '18:30:00', '19:30:00', 60, 10, 3, 'Salón TDC', 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM talleres WHERE nombre = 'Percusión Fun para Principiantes' AND tipo_taller_id = 'TALLER_MUSICA_DANZA_Y_ARTES_ESCENICAS'
)
UNION ALL
SELECT 'TALLER_MUSICA_DANZA_Y_ARTES_ESCENICAS', 1, NULL, 'Latin Dance Essentials',
       'Introducción al baile latino con trabajo de base, musicalidad y expresión corporal en un ambiente accesible.',
       'jueves', '20:00:00', '21:00:00', 60, 12, 4, 'Salón TDC', 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM talleres WHERE nombre = 'Latin Dance Essentials' AND tipo_taller_id = 'TALLER_MUSICA_DANZA_Y_ARTES_ESCENICAS'
)
UNION ALL
SELECT 'TALLER_CULTURA_COMUNITARIA_Y_DE_BARRIO', 3, NULL, 'Yoga para Recuperar Energía',
       'Práctica de yoga con foco en movilidad, respiración y relajación para comenzar o retomar la rutina.',
       'domingo', '10:00:00', '11:00:00', 60, 16, 4, 'Salón TDC', 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM talleres WHERE nombre = 'Yoga para Recuperar Energía' AND tipo_taller_id = 'TALLER_CULTURA_COMUNITARIA_Y_DE_BARRIO'
)
UNION ALL
SELECT 'TALLER_ARTES_VISUALES_ARTESANIAS_Y_PATRIMONIO_MATERIAL', 4, NULL, 'Collage y Color',
       'Exploración creativa con recortes, texturas y color aplicados a composiciones visuales sencillas y expresivas.',
       'viernes', '17:00:00', '18:30:00', 90, 8, 3, 'Salón TDC', 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM talleres WHERE nombre = 'Collage y Color' AND tipo_taller_id = 'TALLER_ARTES_VISUALES_ARTESANIAS_Y_PATRIMONIO_MATERIAL'
);