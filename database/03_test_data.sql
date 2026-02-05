-- ===========================================================================
-- 03_test_data.sql - Datos de prueba/ejemplo (OPCIONAL)
-- Solo para desarrollo y testing - NO ejecutar en producción
-- Versión refactorizada - Febrero 2026
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
(1, 'Carlos', 'Guitarra eléctrica', 1, 'Guitarra líder'),
(1, 'Pablo', 'Guitarra eléctrica', 0, 'Guitarra rítmica'),
(1, 'Gustavo', 'Bajo eléctrico', 0, NULL),
(1, 'Chicha', 'Batería', 0, NULL),
(1, 'El Tano', 'Voz principal', 0, NULL),
(2, 'Martín', 'Guitarra eléctrica', 1, 'Guitarra y voz'),
(2, 'Martín', 'Voz principal', 0, NULL),
(2, 'Fede', 'Bajo eléctrico', 0, NULL),
(2, 'Nico', 'Batería', 0, NULL),
(3, 'Laura', 'Voz principal', 1, NULL),
(3, 'Camila', 'Guitarra eléctrica', 0, NULL),
(3, 'Sol', 'Bajo eléctrico', 0, NULL),
(3, 'Maia', 'Batería', 0, NULL),
(3, 'Vale', 'Teclado', 0, 'Sintetizadores'),
(4, 'Diego', 'Voz principal', 1, NULL),
(4, NULL, 'Teclado', 0, NULL),
(4, NULL, 'Guitarra eléctrica', 0, NULL),
(4, NULL, 'Bajo eléctrico', 0, NULL),
(4, NULL, 'Batería', 0, NULL);

-- SOLICITUDES CORRESPONDIENTES A LAS FECHAS DE BANDAS
-- Primero insertar solicitudes padre para las bandas (id_solicitud)
INSERT INTO solicitudes (id, categoria, fecha_creacion, estado, es_publico, descripcion, nombre_solicitante, telefono_solicitante, email_solicitante) VALUES
(7, 'BANDAS', NOW(), 'Confirmado', 1, 'Gran noche de rock nacional con Tributo a La Renga', 'Reite', NULL, NULL),
(8, 'BANDAS', NOW(), 'Confirmado', 1, 'Noche de jazz con los mejores músicos de la zona sur', 'Jazz en el Templo', NULL, NULL),
(9, 'BANDAS', NOW(), 'Confirmado', 1, 'La mejor cumbia para cerrar el año bailando!', 'Cumbia Power', NULL, NULL),
(10, 'BANDAS', NOW(), 'Pendiente', 1, 'Noche de rock con bandas emergentes', 'Rock March', NULL, NULL),
(11, 'BANDAS', NOW(), 'Confirmado', 1, 'Tributo a las mejores bandas de rock', 'Rock Legends', NULL, NULL);

INSERT INTO solicitudes_bandas (id_solicitud, tipo_de_evento, fecha_hora, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, descripcion, estado) VALUES
(7, 'FECHA_BANDAS', NOW(), '2025-12-20', '21:00', '5 horas', '150', 3000.00, 'Reite', 'Gran noche de rock nacional con Tributo a La Renga', 'Confirmado'),
(8, 'FECHA_BANDAS', NOW(), '2025-12-21', '20:00', '5 horas', '100', 2500.00, 'Jazz en el Templo', 'Noche de jazz con los mejores músicos de la zona sur', 'Confirmado'),
(9, 'FECHA_BANDAS', NOW(), '2025-12-28', '22:00', '6 horas', '180', 2000.00, 'Cumbia Power', 'La mejor cumbia para cerrar el año bailando!', 'Confirmado'),
(10, 'FECHA_BANDAS', NOW(), '2026-03-15', '20:00', '4 horas', '120', 2800.00, 'Rock March', 'Noche de rock con bandas emergentes', 'Pendiente'),
(11, 'FECHA_BANDAS', NOW(), '2026-04-10', '21:00', '3 horas', '200', 3500.00, 'Rock Legends', 'Tributo a las mejores bandas de rock', 'Confirmado');

-- FECHAS DE BANDAS DE EJEMPLO (migradas a eventos_confirmados)
-- Notas: `id_solicitud` referencia a la fila correspondiente en `solicitudes_bandas`.
INSERT INTO eventos_confirmados (tipo_evento, id_solicitud, tabla_origen, nombre_evento, descripcion, fecha_evento, hora_inicio, duracion_estimada, genero_musical, precio_base, precio_final, cantidad_personas, es_publico, activo) VALUES
('BANDA', 7, 'fechas_bandas_confirmadas', 'Reite', 'Gran noche de rock nacional con Tributo a La Renga', '2025-12-20', '21:00:00', NULL, 'Rock nacional', 3000.00, 4000.00, 150, 1, 1),
('BANDA', 8, 'fechas_bandas_confirmadas', 'Jazz en el Templo', 'Noche de jazz con los mejores músicos de la zona sur', '2025-12-21', '20:00:00', NULL, 'Jazz', 2500.00, 3500.00, 100, 1, 1),
('BANDA', 9, 'fechas_bandas_confirmadas', 'Cumbia Power', 'La mejor cumbia para cerrar el año bailando!', '2025-12-28', '22:00:00', NULL, 'Cumbia', 2000.00, 3000.00, 180, 1, 1);

-- Lineup de eventos
INSERT INTO eventos_lineup (id_evento, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, hora_inicio, duracion_minutos, estado) VALUES
(1, 2, 'Pateando Bares', 0, 0, 0, '21:30:00', 45, 'confirmada'),
(1, 3, 'Las Mentas', 1, 0, 0, '22:30:00', 50, 'confirmada'),
(1, 1, 'Reite', 2, 1, 1, '23:45:00', 90, 'confirmada'),
(3, 4, 'Cumbia Sudaka', 0, 1, 1, '22:30:00', 120, 'confirmada');

-- ---------------------------------------------------------------------------
-- SOLICITUDES DE EJEMPLO (Alquileres)
-- Removida columna fecha_hora (no existe en solicitudes_alquiler)
-- ---------------------------------------------------------------------------
-- Primero insertar en solicitudes padre
INSERT INTO solicitudes (id, categoria, fecha_creacion, estado, es_publico, descripcion, nombre_solicitante, telefono_solicitante, email_solicitante) VALUES
(1, 'ALQUILER', NOW(), 'Solicitado', 0, 'Cumpleaños de 7 años temático de Minecraft', 'María García', '1155667788', 'maria.garcia@email.com'),
(2, 'ALQUILER', NOW(), 'Solicitado', 0, 'Fiesta de 15 para mi hija Valentina', 'Carlos López', '1144556677', 'carlos.lopez@email.com'),
(3, 'ALQUILER', NOW(), 'Solicitado', 0, 'Almuerzo familiar de fin de año', 'Roberto Fernández', '1133445566', 'roberto.f@email.com'),
(4, 'ALQUILER', NOW(), 'Solicitado', 0, 'Asado familiar de fin de año', 'Ana Martínez', '1122334455', 'ana.m@email.com');

-- Luego insertar en solicitudes_alquiler
INSERT INTO solicitudes_alquiler (id_solicitud, tipo_de_evento, tipo_servicio, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado) VALUES
(1, 'ALQUILER_SALON', 'INFANTILES', '2025-12-20', '15:00', '4 horas', '25', 200000.00, 'María García', '1155667788', 'maria.garcia@email.com', 'Cumpleaños de 7 años temático de Minecraft', 'Solicitado'),
(2, 'ALQUILER_SALON', 'ADOLESCENTES', '2025-12-22', '20:00', '5 horas', '40', 250000.00, 'Carlos López', '1144556677', 'carlos.lopez@email.com', 'Fiesta de 15 para mi hija Valentina', 'Solicitado'),
(3, 'ALQUILER_SALON', 'CON_SERVICIO_DE_MESA', '2025-12-27', '13:00', '4 horas', '30', 240000.00, 'Roberto Fernández', '1133445566', 'roberto.f@email.com', 'Almuerzo familiar de fin de año', 'Solicitado'),
(4, 'ALQUILER_SALON', 'INFORMALES', '2025-12-29', '12:00', '6 horas', '45', 180000.00, 'Ana Martínez', '1122334455', 'ana.m@email.com', 'Asado familiar de fin de año', 'Solicitado');

-- ---------------------------------------------------------------------------
-- USUARIO ADMINISTRADOR DE EJEMPLO
-- ---------------------------------------------------------------------------
INSERT INTO usuarios (email, password_hash, rol, activo) VALUES
('rodrigo@rodrigo', '$2b$10$OHa6QTfDeP6DAn9lReTkE.eETT8TAqD58ir3Hj7QCqz999jEZ4SYe', 'admin', 1);

-- ---------------------------------------------------------------------------
-- NUEVAS SOLICITUDES PÚBLICAS PARA PRUEBAS
-- ---------------------------------------------------------------------------
-- Nueva solicitud de taller público confirmada
INSERT INTO solicitudes (id, categoria, fecha_creacion, estado, es_publico, descripcion, nombre_solicitante, telefono_solicitante, email_solicitante) VALUES
(5, 'TALLERES', NOW(), 'Confirmado', 1, 'Taller de Fotografía', 'Juan Pérez', '123456789', 'juan.perez@email.com');

INSERT INTO solicitudes_talleres (id_solicitud, nombre_taller, fecha_evento, hora_evento, duracion, precio) VALUES
(5, 'Taller de Fotografía', '2026-04-15', '18:00', '2 horas', 1500.00);

-- Nueva solicitud de servicio público confirmada
INSERT INTO solicitudes (id, categoria, fecha_creacion, estado, es_publico, descripcion, nombre_solicitante, telefono_solicitante, email_solicitante) VALUES
(6, 'SERVICIOS', NOW(), 'Confirmado', 1, 'Servicio de Catering', 'Ana López', '987654321', 'ana.lopez@email.com');

INSERT INTO solicitudes_servicios (id_solicitud, tipo_servicio, fecha_evento, hora_evento, duracion, precio) VALUES
(6, 'Servicio de Catering', '2026-04-20', '12:00', '5 horas', 5000.00);

-- ===========================================================================
-- FIN DE LOS DATOS DE PRUEBA
-- ===========================================================================
