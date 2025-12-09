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

-- ---------------------------------------------------------------------------
-- EVENTOS DE EJEMPLO (Fechas de bandas)
-- ---------------------------------------------------------------------------
INSERT INTO eventos (tipo_evento, nombre_banda, genero_musical, descripcion, fecha, hora_inicio, hora_fin, precio_anticipada, precio_puerta, aforo_maximo, estado, es_publico, activo) VALUES
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
INSERT INTO solicitudes (tipo_de_evento, tipo_servicio, es_publico, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado) VALUES
('INFANTILES', NULL, 0, '2025-12-20', '15:00', '4 horas', '25', 200000.00, 'María García', '1155667788', 'maria.garcia@email.com', 'Cumpleaños de 7 años temático de Minecraft', 'Solicitado'),
('ADOLESCENTES', NULL, 0, '2025-12-22', '20:00', '5 horas', '40', 250000.00, 'Carlos López', '1144556677', 'carlos.lopez@email.com', 'Fiesta de 15 para mi hija Valentina', 'Solicitado'),
('CON_SERVICIO_DE_MESA', NULL, 0, '2025-12-27', '13:00', '4 horas', '30', 240000.00, 'Roberto Fernández', '1133445566', 'roberto.f@email.com', 'Almuerzo familiar de fin de año', 'Solicitado'),
('INFORMALES', NULL, 0, '2025-12-29', '12:00', '6 horas', '45', 180000.00, 'Ana Martínez', '1122334455', 'ana.m@email.com', 'Asado familiar de fin de año', 'Solicitado');

-- ---------------------------------------------------------------------------
-- SOLICITUDES DE BANDAS (pendientes de aprobación)
-- ---------------------------------------------------------------------------
INSERT INTO bandas_solicitudes (
    nombre_banda, genero_musical, formacion_json,
    instagram, youtube, spotify,
    contacto_nombre, contacto_email, contacto_telefono,
    fecha_preferida, fecha_alternativa, hora_preferida,
    invitadas_json, cantidad_bandas,
    precio_anticipada_propuesto, precio_puerta_propuesto, expectativa_publico,
    mensaje, estado
) VALUES
(
    'Los Pericos del Sur', 'Reggae/Ska', '[{"instrumento":"Guitarra","cantidad":2},{"instrumento":"Bajo","cantidad":1},{"instrumento":"Batería","cantidad":1}]',
    '@lospericosdelsur', 'https://youtube.com/@lospericosdelsur', NULL,
    'Juan Reggae', 'juan.reggae@email.com', '1155443322',
    '2026-01-10', '2026-01-17', '21:00',
    '[{"nombre":"Ska-P Tribute"}]', 2,
    2500.00, 3500.00, '100-120',
    'Queremos hacer una fecha de reggae/ska.',
    'pendiente'
),
(
    'Blues Brothers Tribute', 'Blues/Soul', '[{"instrumento":"Guitarra","cantidad":1},{"instrumento":"Bajo","cantidad":1},{"instrumento":"Batería","cantidad":1}]',
    '@bluesbrostribute', NULL, NULL,
    'Pedro Blues', 'pedro.blues@email.com', '1166554433',
    '2026-01-24', '2026-01-31', '22:00',
    NULL, 1,
    3000.00, 4000.00, '80-100',
    'Somos una banda de tributo a Blues Brothers.',
    'pendiente'
);

-- ===========================================================================
-- FIN DE LOS DATOS DE PRUEBA
-- ===========================================================================
