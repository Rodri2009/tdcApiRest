-- ===========================================================================
-- 03_test_data.sql - Datos de prueba/ejemplo (OPCIONAL)
-- Solo para desarrollo y testing - NO ejecutar en producción
-- Versión refactorizada - Diciembre 2025
-- ===========================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- CUPONES DE EJEMPLO
-- ---------------------------------------------------------------------------
INSERT INTO cupones (codigo, tipo_descuento, valor_fijo, porcentaje_descuento, usos_maximos, usos_actuales, fecha_expiracion, activo, aplica_a) VALUES
('ROCK20', 'PORCENTAJE', NULL, 20.00, 50, 0, '2025-12-31', 1, 'TODAS'),
('DESCUENTO10K', 'MONTO_FIJO', 10000.00, NULL, NULL, 0, NULL, 1, 'ANTICIPADA'),
('PUERTA25', 'PORCENTAJE', NULL, 25.00, 100, 0, '2025-12-31', 1, 'PUERTA');

-- ---------------------------------------------------------------------------
-- BANDAS DE EJEMPLO
-- ---------------------------------------------------------------------------
INSERT INTO bandas_artistas (nombre, genero_musical, bio, instagram, facebook, youtube, spotify, contacto_nombre, contacto_email, contacto_telefono, contacto_rol, verificada, activa) VALUES
('Reite', 'Rock / Tributo La Renga', 'Tributo a La Renga con más de 10 años de trayectoria en la zona sur.', '@reite.tributo', 'ReiteOficial', 'https://youtube.com/@reitetributo', 'https://open.spotify.com/artist/reite', 'Carlos Pérez', 'reite.tributo@gmail.com', '1155001122', 'Manager', 1, 1),
('Pateando Bares', 'Rock Nacional', 'Rock nacional con temas propios y algunos covers.', '@pateando.bares', 'PateandobaresOk', NULL, NULL, 'Martín Gómez', 'pateando.bares@gmail.com', '1155003344', 'Líder', 1, 1),
('Las Mentas', 'Rock Alternativo', 'Banda femenina de rock alternativo.', '@lasmentas.rock', NULL, 'https://youtube.com/@lasmentas', 'https://open.spotify.com/artist/lasmentas', 'Laura Fernández', 'lasmentas@gmail.com', '1155005566', 'Cantante', 1, 1),
('Cumbia Sudaka', 'Cumbia', 'Cumbia villera con letras sociales.', '@cumbiasudaka', 'CumbiaSudakaOficial', 'https://youtube.com/@cumbiasudaka', NULL, 'Diego Ramírez', 'cumbiasudaka@gmail.com', '1155009900', 'Manager', 1, 1);

-- Formación de las bandas
INSERT INTO bandas_formacion (id_banda, nombre_integrante, instrumento, es_lider, notas) VALUES
-- Reite
(1, 'Carlos', 'Guitarra eléctrica', 1, 'Guitarra líder'),
(1, 'Pablo', 'Guitarra eléctrica', 0, 'Guitarra rítmica'),
(1, 'Gustavo', 'Bajo eléctrico', 0, NULL),
(1, 'Chicha', 'Batería', 0, NULL),
(1, 'El Tano', 'Voz principal', 0, NULL),
-- Pateando Bares
(2, 'Martín', 'Guitarra eléctrica', 1, 'Guitarra y voz'),
(2, 'Martín', 'Voz principal', 0, NULL),
(2, 'Fede', 'Bajo eléctrico', 0, NULL),
(2, 'Nico', 'Batería', 0, NULL),
-- Las Mentas
(3, 'Laura', 'Voz principal', 1, NULL),
(3, 'Camila', 'Guitarra eléctrica', 0, NULL),
(3, 'Sol', 'Bajo eléctrico', 0, NULL),
(3, 'Maia', 'Batería', 0, NULL),
(3, 'Vale', 'Teclado', 0, 'Sintetizadores'),
-- Cumbia Sudaka
(4, 'Diego', 'Voz principal', 1, NULL),
(4, NULL, 'Teclado', 0, NULL),
(4, NULL, 'Guitarra eléctrica', 0, NULL),
(4, NULL, 'Bajo eléctrico', 0, NULL),
(4, NULL, 'Batería', 0, NULL);

-- SOLICITUDES CORRESPONDIENTES A LAS FECHAS DE BANDAS (para mantener consistencia) - Ahora en solicitudes_bandas
INSERT INTO solicitudes_bandas (tipo_de_evento, es_publico, fecha_hora, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, descripcion, estado) VALUES
('FECHA_BANDAS', 1, NOW(), '2025-12-20', '21:00', '5 horas', '150', 3000.00, 'Reite', 'Gran noche de rock nacional con Tributo a La Renga', 'Confirmado'),
('FECHA_BANDAS', 1, NOW(), '2025-12-21', '20:00', '5 horas', '100', 2500.00, 'Jazz en el Templo', 'Noche de jazz con los mejores músicos de la zona sur', 'Confirmado'),
('FECHA_BANDAS', 1, NOW(), '2025-12-28', '22:00', '6 horas', '180', 2000.00, 'Cumbia Power', 'La mejor cumbia para cerrar el año bailando!', 'Confirmado');

-- FECHAS DE BANDAS DE EJEMPLO
INSERT INTO fechas_bandas_confirmadas (tipo_evento, nombre_banda, genero_musical, descripcion, fecha, hora_inicio, hora_fin, precio_anticipada, precio_puerta, aforo_maximo, estado, es_publico, activo) VALUES
('BANDA', 'Reite', 'Rock nacional', 'Gran noche de rock nacional con Tributo a La Renga', '2025-12-20', '21:00:00', '02:00:00', 3000.00, 4000.00, 150, 'Confirmado', 1, 1),
('BANDA', 'Jazz en el Templo', 'Jazz', 'Noche de jazz con los mejores músicos de la zona sur', '2025-12-21', '20:00:00', '01:00:00', 2500.00, 3500.00, 100, 'Confirmado', 1, 1),
('BANDA', 'Cumbia Power', 'Cumbia', 'La mejor cumbia para cerrar el año bailando!', '2025-12-28', '22:00:00', '04:00:00', 2000.00, 3000.00, 180, 'Confirmado', 1, 1);

-- Lineup de eventos
INSERT INTO eventos_lineup (id_evento, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, hora_inicio, duracion_minutos, estado) VALUES
(1, 2, 'Pateando Bares', 0, 0, 0, '21:30:00', 45, 'confirmada'),
(1, 3, 'Las Mentas', 1, 0, 0, '22:30:00', 50, 'confirmada'),
(1, 1, 'Reite', 2, 1, 1, '23:45:00', 90, 'confirmada'),
(3, 4, 'Cumbia Sudaka', 0, 1, 1, '22:30:00', 120, 'confirmada');

-- ---------------------------------------------------------------------------
-- SOLICITUDES DE EJEMPLO (Alquileres)
-- NOTA: tipo_de_evento = subtipo (INFANTILES, CON_SERVICIO_DE_MESA, etc.)
-- ---------------------------------------------------------------------------
INSERT INTO solicitudes_alquiler (tipo_de_evento, tipo_servicio, es_publico, fecha_hora, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado) VALUES
('ALQUILER_SALON', 'INFANTILES', 0, NOW(), '2025-12-20', '15:00', '4 horas', '25', 200000.00, 'María García', '1155667788', 'maria.garcia@email.com', 'Cumpleaños de 7 años temático de Minecraft', 'Solicitado'),
('ALQUILER_SALON', 'ADOLESCENTES', 0, NOW(), '2025-12-22', '20:00', '5 horas', '40', 250000.00, 'Carlos López', '1144556677', 'carlos.lopez@email.com', 'Fiesta de 15 para mi hija Valentina', 'Solicitado'),
('ALQUILER_SALON', 'CON_SERVICIO_DE_MESA', 0, NOW(), '2025-12-27', '13:00', '4 horas', '30', 240000.00, 'Roberto Fernández', '1133445566', 'roberto.f@email.com', 'Almuerzo familiar de fin de año', 'Solicitado'),
('ALQUILER_SALON', 'INFORMALES', 0, NOW(), '2025-12-29', '12:00', '6 horas', '45', 180000.00, 'Ana Martínez', '1122334455', 'ana.m@email.com', 'Asado familiar de fin de año', 'Solicitado');

-- ---------------------------------------------------------------------------
-- SOLICITUDES DE SERVICIOS (Estética, Depilación, Masajes)
-- ---------------------------------------------------------------------------
INSERT INTO solicitudes_alquiler (tipo_de_evento, tipo_servicio, es_publico, fecha_hora, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado) VALUES
('SERVICIOS', 'DEPILACION', 1, NOW(), '2025-12-18', '10:00', '1 hora', '1', 5000.00, 'Lucía Méndez', '1177889900', 'lucia.mendez@email.com', 'Depilación piernas completas', 'Confirmado'),
('SERVICIOS', 'ESTETICA', 1, NOW(), '2025-12-19', '11:00', '1.5 horas', '1', 8000.00, 'Valentina Torres', '1166778899', 'val.torres@email.com', 'Limpieza facial profunda + hidratación', 'Solicitado'),
('SERVICIOS', 'MASAJES', 1, NOW(), '2025-12-21', '16:00', '1 hora', '1', 7000.00, 'Patricia Ruiz', '1155667788', 'patricia.r@email.com', 'Masaje descontracturante espalda y cuello', 'Confirmado'),
('SERVICIOS', 'DEPILACION_DEFINITIVA', 0, NOW(), '2025-12-27', '09:30', '8 horas', '1', 50000.00, 'Centro Estética Laura', '1123456789', 'estetica.laura@email.com', 'Jornada completa depilación definitiva - Servicio privado', 'Confirmado');

-- ---------------------------------------------------------------------------
-- SOLICITUDES DE TALLERES (Yoga, Música, Danza, Arte)
-- ---------------------------------------------------------------------------
INSERT INTO solicitudes_alquiler (tipo_de_evento, tipo_servicio, es_publico, fecha_hora, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado) VALUES
('TALLERES_ACTIVIDADES', 'TALLER_YOGA', 1, NOW(), '2025-12-16', '09:00', '1.5 horas', '15', 3000.00, 'Marina Paz', '1144556677', 'marina.yoga@email.com', 'Clase de Yoga Hatha - Todos los niveles', 'Confirmado'),
('TALLERES_ACTIVIDADES', 'TALLER_MUSICA', 1, NOW(), '2025-12-17', '18:00', '2 horas', '8', 5000.00, 'Prof. Ricardo Música', '1133445566', 'ricardo.musica@email.com', 'Taller de guitarra para principiantes', 'Confirmado'),
('TALLERES_ACTIVIDADES', 'TALLER_DANZA', 1, NOW(), '2025-12-23', '20:00', '1.5 horas', '20', 4000.00, 'Academia Ritmo Sur', '1122334455', 'ritmo.sur@email.com', 'Clase de Salsa y Bachata', 'Solicitado'),
('TALLERES_ACTIVIDADES', 'TALLER_ARTE', 1, NOW(), '2025-12-26', '15:00', '3 horas', '12', 6000.00, 'Taller Creativo Lomas', '1111223344', 'taller.creativo@email.com', 'Taller de cerámica navideña', 'Confirmado');

-- ---------------------------------------------------------------------------
-- SOLICITUDES DE BANDAS (pendientes de aprobación)
-- ---------------------------------------------------------------------------
INSERT INTO solicitudes_bandas (
    tipo_de_evento, nombre_completo, genero_musical, formacion_json,
    instagram, youtube, spotify,
    contacto_rol, email, telefono,
    fecha_evento, fecha_alternativa, hora_evento,
    invitadas_json, cantidad_bandas,
    precio_basico, precio_puerta_propuesto, expectativa_publico,
    descripcion, estado
) VALUES
(
    'FECHA_BANDAS', 'Los Pericos del Sur', 'Reggae/Ska', '[{"instrumento":"Guitarra","cantidad":2},{"instrumento":"Bajo","cantidad":1},{"instrumento":"Batería","cantidad":1}]',
    '@lospericosdelsur', 'https://youtube.com/@lospericosdelsur', NULL,
    'Juan Reggae', 'juan.reggae@email.com', '1155443322',
    '2026-01-10', '2026-01-17', '21:00',
    '[{"nombre":"Ska-P Tribute"}]', 2,
    2500.00, 3500.00, '100-120',
    'Queremos hacer una fecha de reggae/ska.',
    'Solicitado'
),
(
    'FECHA_BANDAS', 'Blues Brothers Tribute', 'Blues/Soul', '[{"instrumento":"Guitarra","cantidad":1},{"instrumento":"Bajo","cantidad":1},{"instrumento":"Batería","cantidad":1}]',
    '@bluesbrostribute', NULL, NULL,
    'Pedro Blues', 'pedro.blues@email.com', '1166554433',
    '2026-01-24', '2026-01-31', '22:00',
    NULL, 1,
    3000.00, 4000.00, '80-100',
    'Somos una banda de tributo a Blues Brothers.',
    'Solicitado'
);

-- ===========================================================================
-- FIN DE LOS DATOS DE PRUEBA
-- ===========================================================================
