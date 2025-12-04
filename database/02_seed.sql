-- ===========================================================================
-- 02_seed.sql - Datos iniciales para TDC
-- Versión refactorizada - Diciembre 2025
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- TIPOS DE EVENTO (opciones_tipos)
-- Categorías principales: ALQUILER_SALON, FECHA_BANDAS, TALLERES, SERVICIO
-- ---------------------------------------------------------------------------
INSERT INTO opciones_tipos (id_evento, nombre_para_mostrar, descripcion, categoria, es_publico) VALUES
('SIN_SERVICIO_DE_MESA', 'Sin Servicio de Mesa', 'Te brindamos una cocina totalmente equipada con cocina a gas y eléctrica, horno eléctrico, microondas, dos heladeras y un freezer de 200 litros. Contamos con una vajilla completa para 120 personas incluye vasos de vidrio, platos llanos, platos chicos, cubiertos (juego completo por persona), fuentes de vidrio, juegos de jarra y balde para el hielo, etc. El alquiler incluye el uso de la parrilla y el horno de barro.', 'ALQUILER_SALON', 1),
('CON_SERVICIO_DE_MESA', 'Con Servicio de Mesa', 'El pack INTERMEDIO incluye TODO lo que incluye el pack BASICO (vajilla para 120 personas, cocina equipada, parrilla y horno de barro) con el agregado de PERSONAL DE SERVICIO (esto incluye una encargada, una cocinera, y una persona para la puerta -de acuerdo a la capacidad del evento se agregarán más meseras y un/a ayudante de cocina). El servicio de mesas incluye servir todo lo que el cliente trae para que sus invitados coman. Además el personal se encarga de la limpieza del salón al finalizar el evento.', 'ALQUILER_SALON', 1),
('INFORMALES', 'Informales', 'El pack BASICO AMPLIADO para fiestas más "descontracturadas" incluye TODO lo que incluye el pack BASICO (vajilla para 120 personas, cocina equipada, parrilla y horno de barro) con el agregado de una encargada y una persona en la puerta que recibirá a los invitados. También incluye la limpieza del salón al finalizar el evento.', 'ALQUILER_SALON', 1),
('INFANTILES', 'Infantiles', 'El pack INFANTIL incluye todo lo que incluye el pack INTERMEDIO (servicio de mesa, vajilla para 120 personas, cocina equipada, parrilla y horno de barro) con el agregado de un LIVING PARA ADULTOS, un metegol, un tejo, aros de basketball y pelotas, un inflable de 4x4 metros a eleccion (Spiderman o Princesas).', 'ALQUILER_SALON', 1),
('ADOLESCENTES', 'Adolescentes', 'Nos dedicamos a organizar este tipo de eventos desde hace 10 años, contamos con una amplia experiencia en el rubro y un extenso sistema de Sonido e Iluminación y el mejor DJ para Fiestas de Jóvenes. La idea es que sea una fiesta entre amigos con el mismo formato de un boliche, con la diferencia de que la cumpleañera es la protagonista de la noche.', 'ALQUILER_SALON', 1),
('BABY_SHOWERS', 'Baby Showers', 'Con el mismo pack que ofrecemos para los CUMPLES INFANTILES ofrecemos la posibilidad de hacer BABY SHOWERS en nuestro hermoso salón.', 'ALQUILER_SALON', 1),
('FECHA_BANDAS', 'Fecha para Bandas', 'Alquiler del salón para eventos musicales. Incluye sonido profesional, escenario y personal técnico.', 'FECHA_BANDAS', 1),
('SERVICIO_DEPILACION', 'Depilación Definitiva', 'Servicio de depilación definitiva con tecnología láser.', 'SERVICIO', 0);

-- ---------------------------------------------------------------------------
-- PRECIOS VIGENCIA
-- ---------------------------------------------------------------------------
INSERT INTO precios_vigencia (id_evento, id_duracion, precio_anticipado, precio_puerta, vigente_desde, vigente_hasta) VALUES
-- SIN_SERVICIO_DE_MESA
('SIN_SERVICIO_DE_MESA', 4, 150000.00, 180000.00, '2025-11-01', '2025-12-31'),
('SIN_SERVICIO_DE_MESA', 5, 170000.00, 200000.00, '2025-11-01', '2025-12-31'),
('SIN_SERVICIO_DE_MESA', 6, 200000.00, 230000.00, '2025-11-01', '2025-12-31'),
('SIN_SERVICIO_DE_MESA', 7, 230000.00, 260000.00, '2025-11-01', '2025-12-31'),
('SIN_SERVICIO_DE_MESA', 8, 270000.00, 300000.00, '2025-11-01', '2025-12-31'),
-- CON_SERVICIO_DE_MESA
('CON_SERVICIO_DE_MESA', 4, 250000.00, 300000.00, '2025-11-01', '2025-12-31'),
('CON_SERVICIO_DE_MESA', 5, 280000.00, 330000.00, '2025-11-01', '2025-12-31'),
('CON_SERVICIO_DE_MESA', 6, 320000.00, 370000.00, '2025-11-01', '2025-12-31'),
('CON_SERVICIO_DE_MESA', 7, 370000.00, 430000.00, '2025-11-01', '2025-12-31'),
('CON_SERVICIO_DE_MESA', 8, 430000.00, 500000.00, '2025-11-01', '2025-12-31'),
-- INFORMALES
('INFORMALES', 4, 200000.00, 240000.00, '2025-11-01', '2025-12-31'),
('INFORMALES', 5, 220000.00, 260000.00, '2025-11-01', '2025-12-31'),
('INFORMALES', 6, 250000.00, 290000.00, '2025-11-01', '2025-12-31'),
('INFORMALES', 7, 290000.00, 340000.00, '2025-11-01', '2025-12-31'),
('INFORMALES', 8, 340000.00, 400000.00, '2025-11-01', '2025-12-31'),
-- INFANTILES
('INFANTILES', 4, 300000.00, 360000.00, '2025-11-01', '2025-12-31'),
('INFANTILES', 5, 330000.00, 390000.00, '2025-11-01', '2025-12-31'),
('INFANTILES', 6, 370000.00, 440000.00, '2025-11-01', '2025-12-31'),
('INFANTILES', 7, 420000.00, 500000.00, '2025-11-01', '2025-12-31'),
('INFANTILES', 8, 480000.00, 560000.00, '2025-11-01', '2025-12-31'),
-- ADOLESCENTES
('ADOLESCENTES', 4, 350000.00, 420000.00, '2025-11-01', '2025-12-31'),
('ADOLESCENTES', 5, 380000.00, 450000.00, '2025-11-01', '2025-12-31'),
('ADOLESCENTES', 6, 420000.00, 500000.00, '2025-11-01', '2025-12-31'),
('ADOLESCENTES', 7, 470000.00, 550000.00, '2025-11-01', '2025-12-31'),
('ADOLESCENTES', 8, 520000.00, 600000.00, '2025-11-01', '2025-12-31'),
-- BABY_SHOWERS
('BABY_SHOWERS', 4, 300000.00, 360000.00, '2025-11-01', '2025-12-31'),
('BABY_SHOWERS', 5, 330000.00, 390000.00, '2025-11-01', '2025-12-31'),
('BABY_SHOWERS', 6, 370000.00, 440000.00, '2025-11-01', '2025-12-31'),
('BABY_SHOWERS', 7, 420000.00, 500000.00, '2025-11-01', '2025-12-31'),
('BABY_SHOWERS', 8, 480000.00, 560000.00, '2025-11-01', '2025-12-31'),
-- FECHA_BANDAS
('FECHA_BANDAS', 4, 200000.00, 230000.00, '2025-11-01', '2025-12-31'),
('FECHA_BANDAS', 5, 220000.00, 250000.00, '2025-11-01', '2025-12-31'),
('FECHA_BANDAS', 6, 250000.00, 280000.00, '2025-11-01', '2025-12-31');

-- ---------------------------------------------------------------------------
-- DURACIONES POR TIPO
-- ---------------------------------------------------------------------------
INSERT INTO opciones_duracion (id_evento, duracion_horas, descripcion) VALUES
-- SIN_SERVICIO_DE_MESA
('SIN_SERVICIO_DE_MESA', 4, '4 horas'),
('SIN_SERVICIO_DE_MESA', 5, '5 horas'),
('SIN_SERVICIO_DE_MESA', 6, '6 horas'),
('SIN_SERVICIO_DE_MESA', 7, '7 horas'),
('SIN_SERVICIO_DE_MESA', 8, '8 horas'),
-- CON_SERVICIO_DE_MESA
('CON_SERVICIO_DE_MESA', 4, '4 horas'),
('CON_SERVICIO_DE_MESA', 5, '5 horas'),
('CON_SERVICIO_DE_MESA', 6, '6 horas'),
('CON_SERVICIO_DE_MESA', 7, '7 horas'),
('CON_SERVICIO_DE_MESA', 8, '8 horas'),
-- INFORMALES
('INFORMALES', 4, '4 horas'),
('INFORMALES', 5, '5 horas'),
('INFORMALES', 6, '6 horas'),
('INFORMALES', 7, '7 horas'),
('INFORMALES', 8, '8 horas'),
-- INFANTILES
('INFANTILES', 4, '4 horas'),
('INFANTILES', 5, '5 horas'),
('INFANTILES', 6, '6 horas'),
('INFANTILES', 7, '7 horas'),
('INFANTILES', 8, '8 horas'),
-- ADOLESCENTES
('ADOLESCENTES', 4, '4 horas'),
('ADOLESCENTES', 5, '5 horas'),
('ADOLESCENTES', 6, '6 horas'),
('ADOLESCENTES', 7, '7 horas'),
('ADOLESCENTES', 8, '8 horas'),
-- BABY_SHOWERS
('BABY_SHOWERS', 4, '4 horas'),
('BABY_SHOWERS', 5, '5 horas'),
('BABY_SHOWERS', 6, '6 horas'),
('BABY_SHOWERS', 7, '7 horas'),
('BABY_SHOWERS', 8, '8 horas'),
-- FECHA_BANDAS
('FECHA_BANDAS', 4, '4 horas'),
('FECHA_BANDAS', 5, '5 horas'),
('FECHA_BANDAS', 6, '6 horas');

-- ---------------------------------------------------------------------------
-- HORARIOS POR TIPO
-- ---------------------------------------------------------------------------
INSERT INTO configuracion_horarios (id_evento, dia_semana, hora_inicio, hora_fin) VALUES
-- SIN_SERVICIO_DE_MESA
('SIN_SERVICIO_DE_MESA', 'lunes', '10:00:00', '23:00:00'),
('SIN_SERVICIO_DE_MESA', 'martes', '10:00:00', '23:00:00'),
('SIN_SERVICIO_DE_MESA', 'miercoles', '10:00:00', '23:00:00'),
('SIN_SERVICIO_DE_MESA', 'jueves', '10:00:00', '23:00:00'),
('SIN_SERVICIO_DE_MESA', 'viernes', '10:00:00', '02:00:00'),
('SIN_SERVICIO_DE_MESA', 'sabado', '10:00:00', '02:00:00'),
('SIN_SERVICIO_DE_MESA', 'domingo', '10:00:00', '23:00:00'),
-- CON_SERVICIO_DE_MESA
('CON_SERVICIO_DE_MESA', 'lunes', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'martes', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'miercoles', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'jueves', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'viernes', '10:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '10:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'domingo', '10:00:00', '23:00:00'),
-- INFORMALES
('INFORMALES', 'lunes', '10:00:00', '23:00:00'),
('INFORMALES', 'martes', '10:00:00', '23:00:00'),
('INFORMALES', 'miercoles', '10:00:00', '23:00:00'),
('INFORMALES', 'jueves', '10:00:00', '23:00:00'),
('INFORMALES', 'viernes', '10:00:00', '02:00:00'),
('INFORMALES', 'sabado', '10:00:00', '02:00:00'),
('INFORMALES', 'domingo', '10:00:00', '23:00:00'),
-- INFANTILES
('INFANTILES', 'lunes', '10:00:00', '23:00:00'),
('INFANTILES', 'martes', '10:00:00', '23:00:00'),
('INFANTILES', 'miercoles', '10:00:00', '23:00:00'),
('INFANTILES', 'jueves', '10:00:00', '23:00:00'),
('INFANTILES', 'viernes', '10:00:00', '02:00:00'),
('INFANTILES', 'sabado', '10:00:00', '02:00:00'),
('INFANTILES', 'domingo', '10:00:00', '23:00:00'),
-- ADOLESCENTES
('ADOLESCENTES', 'viernes', '20:00:00', '04:00:00'),
('ADOLESCENTES', 'sabado', '20:00:00', '04:00:00'),
-- BABY_SHOWERS
('BABY_SHOWERS', 'lunes', '10:00:00', '23:00:00'),
('BABY_SHOWERS', 'martes', '10:00:00', '23:00:00'),
('BABY_SHOWERS', 'miercoles', '10:00:00', '23:00:00'),
('BABY_SHOWERS', 'jueves', '10:00:00', '23:00:00'),
('BABY_SHOWERS', 'viernes', '10:00:00', '02:00:00'),
('BABY_SHOWERS', 'sabado', '10:00:00', '02:00:00'),
('BABY_SHOWERS', 'domingo', '10:00:00', '23:00:00'),
-- FECHA_BANDAS
('FECHA_BANDAS', 'viernes', '18:00:00', '04:00:00'),
('FECHA_BANDAS', 'sabado', '18:00:00', '04:00:00'),
('FECHA_BANDAS', 'domingo', '14:00:00', '23:00:00');

-- ---------------------------------------------------------------------------
-- ADICIONALES
-- ---------------------------------------------------------------------------
INSERT INTO opciones_adicionales (nombre, precio, descripcion, url_imagen) VALUES
('Cama elástica', 30000.00, 'Cama elástica con red lateral para niños hasta 10 años', 'https://lh3.googleusercontent.com/pw/AP1GczMM-aZTEqkYM4KlsY5A79dD5IMy03IVXb0EgLUWVPlflvdfCikVlgkn3p6PVwELvS4qtBoD9HGf8LiIVAHNIuTzn3FxMxYcIecyqjeE1Ew-PZfl723Rt1kQGs-ClWpThLxG77uaRM153VQfVvD4O8fJ=w700-h933-s-no-gm?authuser=0'),
('Inflable Cocodrilo', 30000.00, 'Inflable con forma de cocodrilo de 4x7 metros con tobogan', 'https://lh3.googleusercontent.com/pw/AP1GczM9WbWMorMn_fPb7f9_uS7-IWAsKEj0LcCn8Zvi7U14_7Kjdjge28_RV50Gcu7wkinQk_W5mK5NFNXh1iFjv-Uq-EHjvQWigm3TcSlMvNhhM3ZOZMT05WkaWaxuL-QNciykkIuCmLe0YwQYRrFieHTl=w394-h231-s-no-gm?authuser=0'),
('Inflable Mickey/Minnie', 25000.00, 'Inflable de 4x4 metros con caras gigantes de Mickey y Minnie en la entrada', 'https://lh3.googleusercontent.com/pw/AP1GczMQl1ffjotYB0j0jFCInMgBquqvsgAITDe31BuKk14RFS3Bky5eSfrTjuDJFDCqZ8bAkeVK1xqPFz3xzJBw8R_YXNyS6Zo0ZIytnwaHNIQCJvghvfhwP5xetCI7Xg2cVqFmbbDUuJ3Cv_-SHFU3BI6f=w340-h358-s-no-gm?authuser=0'),
('Inflable Princesa', 22000.00, 'Inflable con la tematica de Princesas de 3x3 metros', 'https://lh3.googleusercontent.com/pw/AP1GczOYtkKsvQOWJsscPoXvPKxmGWHFzXBUCnWMVr3jyPXvQLDPJFLKivYfqf0HP0DCFCiDZeuF_OHT2Dg7mY5gdOva0YQL94uS9aGQOhRviny_ZNoIPCAR-9p5x2gOXjrNYaAIzRnEKbOOqseXBmWgwfnT=w377-h360-s-no-gm?authuser=0'),
('Inflable Spiderman', 22000.00, 'Inflable con la tematica del Hombre Araña de 3x3 metros', 'https://lh3.googleusercontent.com/pw/AP1GczOlO48NaDkNnHM_ZPKJT-4eHH36bUYMJUZFlAObTvGgIgHy6H0hwaSbyxFJvAjmIrucr12rvG2FTpeLcezzfGBVUCmADUhhTYXZAUdUPw4bw2gdvjts1P-GOH4XPD3MrxLG3AfhHWlHtnk2IosfgBhl=w418-h349-s-no-gm?authuser=0'),
('Manteles negros con camino blanco', 30000.00, 'Manteles negros con camino blanco para todas las mesas', 'https://lh3.googleusercontent.com/pw/AP1GczPfoLiluF0pE9tFCtHRtuXpK0pFM3BQRZ97t81cE9aapbIAzlsJ5srLNeaJYfmI_2F247p2zH33ilH6oW3D-N_nM7BQKZL0CcrE49wNHZ1hQALYnGrsjMk3VsdwQ66In8Ub11R8bW8rD4Riyl6WJTjp=w999-h779-s-no-gm?authuser=0'),
('Manteles negros sólos', 20000.00, 'Manteles negros para todas las mesas', 'https://lh3.googleusercontent.com/pw/AP1GczOSpOTKTwuEAckvaWRc8thYEivYe0el_Fno_l6-ylS331QQaBD7L8zRVPQ1BVBXGdCjdyFbinue3OMV6BtZXpndGSbE4AuCCH710iGesDuGLotzH3gHsirHRral9vmMs-x8pG1S-rrSV0odj9BLrCSV=w800-h749-s-no-gm?authuser=0');

-- ---------------------------------------------------------------------------
-- PERSONAL DISPONIBLE
-- ---------------------------------------------------------------------------
INSERT INTO personal_disponible (id_personal, nombre_completo, rol, celular, activo, cvu_alias) VALUES
('P001', 'Chony', 'Encargada,Puerta', '11 5959-7348', 1, NULL),
('P002', 'Leila', 'Limpieza,Puerta,Cocinera,Mesera', '11 3199-6780', 1, NULL),
('P003', 'Anita', 'Limpieza,Puerta', '11 5313-4502', 1, NULL),
('P004', 'Belen', 'Ayudante de cocina,Mesera', '11 2672-0497', 1, NULL),
('P005', 'Amelia', 'Mesera', '11 5064-1123', 1, NULL),
('P006', 'Giselle', 'Depiladora', NULL, 0, NULL),
('P007', 'Rodrigo', 'Encargado,Puerta,Cocinera,Mesera,Sonido', NULL, 0, NULL);

-- ---------------------------------------------------------------------------
-- ROLES POR EVENTO (según cantidad de personas)
-- ---------------------------------------------------------------------------
INSERT INTO roles_por_evento (id_evento, rol_requerido, cantidad, min_personas, max_personas) VALUES
-- INFANTILES
('INFANTILES', 'Encargada', 1, 0, 120),
('INFANTILES', 'Cocinera', 1, 0, 120),
('INFANTILES', 'Puerta', 1, 0, 120),
('INFANTILES', 'Mesera', 1, 51, 60),
('INFANTILES', 'Mesera', 2, 61, 80),
('INFANTILES', 'Mesera', 3, 81, 100),
('INFANTILES', 'Mesera', 4, 101, 120),
('INFANTILES', 'Ayudante de cocina', 1, 51, 80),
('INFANTILES', 'Ayudante de cocina', 2, 81, 120),
-- CON_SERVICIO_DE_MESA
('CON_SERVICIO_DE_MESA', 'Encargada', 1, 0, 120),
('CON_SERVICIO_DE_MESA', 'Cocinera', 1, 0, 120),
('CON_SERVICIO_DE_MESA', 'Puerta', 1, 0, 120),
('CON_SERVICIO_DE_MESA', 'Mesera', 1, 51, 60),
('CON_SERVICIO_DE_MESA', 'Mesera', 2, 61, 80),
('CON_SERVICIO_DE_MESA', 'Mesera', 3, 81, 100),
('CON_SERVICIO_DE_MESA', 'Mesera', 4, 101, 120),
('CON_SERVICIO_DE_MESA', 'Ayudante de cocina', 1, 51, 80),
('CON_SERVICIO_DE_MESA', 'Ayudante de cocina', 2, 81, 120),
-- BABY_SHOWERS
('BABY_SHOWERS', 'Encargada', 1, 0, 120),
('BABY_SHOWERS', 'Cocinera', 1, 0, 120),
('BABY_SHOWERS', 'Puerta', 1, 0, 120),
('BABY_SHOWERS', 'Mesera', 1, 51, 60),
('BABY_SHOWERS', 'Mesera', 2, 61, 80),
('BABY_SHOWERS', 'Mesera', 3, 81, 100),
('BABY_SHOWERS', 'Mesera', 4, 101, 120),
('BABY_SHOWERS', 'Ayudante de cocina', 1, 51, 80),
('BABY_SHOWERS', 'Ayudante de cocina', 2, 81, 120),
-- INFORMALES
('INFORMALES', 'Encargada', 1, 0, 120),
('INFORMALES', 'Puerta', 1, 0, 120);

-- ---------------------------------------------------------------------------
-- CUPONES DE EJEMPLO
-- ---------------------------------------------------------------------------
INSERT INTO cupones (codigo, tipo_descuento, valor_fijo, porcentaje_descuento, usos_maximos, usos_actuales, fecha_expiracion, activo, aplica_a) VALUES
('ROCK20', 'PORCENTAJE', NULL, 20.00, 50, 0, '2025-12-31', 1, 'TODAS'),
('A-TODO-O-NADA', 'MONTO_FIJO', 1000.00, NULL, NULL, 0, NULL, 1, 'ANTICIPADA'),
('ENPUERTA25', 'PORCENTAJE', NULL, 25.00, 100, 0, '2025-12-31', 1, 'PUERTA');

-- ---------------------------------------------------------------------------
-- EVENTOS DE EJEMPLO (para agenda de bandas)
-- ---------------------------------------------------------------------------
INSERT INTO eventos (tipo_evento, nombre_banda, genero_musical, descripcion, fecha, hora_inicio, hora_fin, precio_anticipada, precio_puerta, aforo_maximo, estado, es_publico, activo) VALUES
('BANDA', 'Reite / Pateando Bares / Las Mentas', 'Rock nacional', 'Gran noche de rock nacional con alto Tributo a La Renga, no te lo pierdas!', '2025-12-06', '21:00:00', '02:00:00', 3000.00, 4000.00, 150, 'Confirmado', 1, 1),
('BANDA', 'Jazz en el Templo', 'Jazz', 'Noche de jazz con los mejores músicos de la zona sur', '2025-12-21', '20:00:00', '01:00:00', 2500.00, 3500.00, 100, 'Confirmado', 1, 1),
('BANDA', 'Cumbia Power', 'Cumbia', 'La mejor cumbia para cerrar el año bailando!', '2025-12-28', '22:00:00', '04:00:00', 2000.00, 3000.00, 180, 'Confirmado', 1, 1);

-- ---------------------------------------------------------------------------
-- SOLICITUDES DE EJEMPLO (para probar otros tipos de evento)
-- ---------------------------------------------------------------------------
INSERT INTO solicitudes (tipo_de_evento, tipo_servicio, es_publico, fecha_hora, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, precio_final, nombre_completo, telefono, email, descripcion, estado) VALUES
('SERVICIO', 'SERVICIO_DEPILACION', 1, NOW(), '2025-12-27', '09:30hs', '9.5 horas', NULL, 50000.00, 50000.00, 'Estetica Laura', '1155667788', 'laura.estetica@email.com', 'Servicio de depilación definitiva - Jornada completa de 9:30 a 19:00hs', 'Confirmado');

-- ===========================================================================
-- FIN DEL SEED
-- ===========================================================================
