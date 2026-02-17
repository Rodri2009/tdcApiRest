-- ===========================================================================
-- 02_seed.sql - Datos de configuración y catálogos
-- Solo datos necesarios para que el sistema funcione
-- Versión refactorizada - Diciembre 2025
-- ===========================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- TIPOS DE EVENTO (opciones_tipos)
-- Categorías: ALQUILER_SALON, FECHA_BANDAS, TALLERES_ACTIVIDADES, SERVICIOS
-- ---------------------------------------------------------------------------
INSERT INTO opciones_tipos (id_tipo_evento, nombre_para_mostrar, descripcion, categoria, es_publico, monto_sena, deposito) VALUES
-- === ALQUILER_SALON ===
('INFANTILES', 'INFANTILES: Cumpleaños hasta 12 años (SERVICIO COMPLETO)', '🎈 **CUMPLEAÑOS INFANTILES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina completa con cocinera\n• Inflable 3x3\n• Metegoles, Ping Pong, Pool y Jenga gigante\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Baño equipado\n• Música y juego de luces\n• Cancha de fútbol (niños hasta 12 años)\n• 20 min previos para decoración\n\n❌ **NO INCLUYE:** Bebidas, alimentos, animación, vajilla de cristal', 'ALQUILER_SALON', 1, 50000, NULL),
('INFORMALES', 'INFORMALES: Juntadas, parrilladas (SERVICIO ECONÓMICO)', '🎉 **SERVICIO ECONÓMICO**\n\n✅ **INCLUYE:**\n• Encargada/o general y control de puerta\n• Mesas y sillas\n• Uso de parrilla\n• Uso de bachas, mesadas, barra\n• Heladera y freezer\n• Baño equipado\n• Equipo de música\n• Metegoles, Ping Pong, Pool\n\n❌ **NO INCLUYE:** Horno, hornallas, cocinera, mantelería, vajilla', 'ALQUILER_SALON', 1, 50000, 80000),
('CON_SERVICIO_DE_MESA', 'FIESTAS de 15 / 18 / casamientos (SERVICIO COMPLETO)', '🌟 **SERVICIO COMPLETO**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Cocinera y uso completo de cocina\n• Meseras según cantidad\n• Mesas, sillas y mantelería\n• Vajilla de cristal y cubiertos de metal\n• Sonido profesional PA JBL\n• Backline para bandas\n• Baño equipado\n\n❌ **NO INCLUYE:** DJ, decoración, cancha de fútbol', 'ALQUILER_SALON', 1, 80000, NULL),
('BABY_SHOWERS', 'BABY SHOWERS / BAUTISMOS / COMUNIONES', '👶 **BABY SHOWERS / BAUTISMOS / COMUNIONES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina con cocinera\n• Inflable 3x3\n• Metegoles, Ping Pong, Pool\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Música y luces\n• Cancha (niños hasta 12)\n\n❌ **NO INCLUYE:** Meseras, animación, vajilla de metal', 'ALQUILER_SALON', 1, 50000, NULL),
('ADOLESCENTES', 'ADOLESCENTES: Cumpleaños de 13 a 17 años', '🎧 **CUMPLEAÑOS ADOLESCENTES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina con cocinera\n• Metegoles, Ping Pong, Pool, Jenga\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Música y juego de luces\n• 20 min previos para decoración\n\n❌ **NO INCLUYE:** Cancha de fútbol', 'ALQUILER_SALON', 1, 50000, 80000),

-- === FECHA_BANDAS ===
('FECHA_BANDAS', 'Fecha para bandas en vivo', '🎸 **FECHA PARA BANDAS**\n\n✅ **INCLUYE:**\n• Coordinación de bandas\n• Flyers y publicaciones\n• Encargada de puerta\n• Uso de cocina\n• Sonido profesional\n• Backline completo', 'FECHA_BANDAS', 0, NULL, NULL),

-- === SERVICIOS (cuidado personal) - cada uno con id_evento único ===
('MASAJES', 'Masajes', '💆 **MASAJES PROFESIONALES**\n\nTipos: Descontracturante, Relajante, Reflexología, Piedras calientes\nDuración: 45 a 90 min', 'SERVICIOS', 1, NULL, NULL),
('ESTETICA', 'Estética', '✨ **ESTÉTICA**\n\nTratamientos: Limpieza facial, Hidratación, Anti-age, Acné', 'SERVICIOS', 1, NULL, NULL),
('DEPILACION', 'Depilación', '🌸 **DEPILACIÓN**\n\nZonas: Piernas, Brazos, Cavado, Bozo, Axilas\nMétodo: Cera tibia descartable', 'SERVICIOS', 1, NULL, NULL),
('DEPILACION_DEFINITIVA', 'Depilación Definitiva', '⚡ **DEPILACIÓN DEFINITIVA**', 'SERVICIOS', 0, NULL, NULL),

-- === TALLERES_ACTIVIDADES - cada uno con id_evento único ===
('TALLER_ARTE', 'Arte y Manualidades', '🎨 **TALLERES DE ARTE**\n\nPintura, Dibujo, Cerámica, Manualidades, Tejido', 'TALLERES_ACTIVIDADES', 1, NULL, NULL),
('TALLER_YOGA', 'Yoga', '🧘 **YOGA**\n\nEstilos: Hatha, Vinyasa, Restaurativo, Embarazadas', 'TALLERES_ACTIVIDADES', 1, NULL, NULL),
('TALLER_DANZA', 'Danza', '💃 **DANZA**\n\nEstilos: Folklore, Tango, Contemporánea, Salsa, Bachata', 'TALLERES_ACTIVIDADES', 1, NULL, NULL),
('TALLER_MUSICA', 'Música', '🎵 **MÚSICA**\n\nInstrumentos: Guitarra, Teclado, Batería, Canto, Vientos', 'TALLERES_ACTIVIDADES', 1, NULL, NULL);

-- ---------------------------------------------------------------------------
-- CONFIGURACIÓN GENERAL
-- ---------------------------------------------------------------------------
INSERT INTO configuracion (Clave, Valor) VALUES
('NOMBRE_NEGOCIO', 'El Templo de Claypole'),
('EMAIL_CONTACTO', 'contacto@eltemplodeclaypole.com'),
('TELEFONO', '1155551234'),
('DIRECCION', 'Claypole, Buenos Aires'),
('HORARIO_ATENCION', 'Lunes a Sábado 10:00 - 22:00'),
('ANTICIPACION_MINIMA_DIAS', '3'),
('ANTICIPACION_MAXIMA_DIAS', '90');

-- ---------------------------------------------------------------------------
-- PRECIOS VIGENCIA (precio_por_hora × duración = precio total)
-- ---------------------------------------------------------------------------
INSERT INTO precios_vigencia (id_tipo_evento, cantidad_min, cantidad_max, precio_por_hora, vigente_desde) VALUES
-- INFANTILES
('INFANTILES', 1, 40, 50000, '2025-08-01'),
('INFANTILES', 41, 50, 55000, '2025-08-01'),
('INFANTILES', 51, 60, 60000, '2025-08-01'),
('INFANTILES', 61, 70, 65000, '2025-08-01'),
('INFANTILES', 71, 80, 70000, '2025-08-01'),
('INFANTILES', 81, 90, 75000, '2025-08-01'),
('INFANTILES', 91, 100, 75000, '2025-08-01'),
('INFANTILES', 101, 110, 75000, '2025-08-01'),
-- INFORMALES
('INFORMALES', 1, 50, 30000, '2025-08-01'),
('INFORMALES', 51, 70, 40000, '2025-08-01'),
('INFORMALES', 71, 90, 50000, '2025-08-01'),
('INFORMALES', 91, 110, 60000, '2025-08-01'),
-- CON_SERVICIO_DE_MESA
('CON_SERVICIO_DE_MESA', 1, 40, 60000, '2025-08-01'),
('CON_SERVICIO_DE_MESA', 41, 60, 80000, '2025-08-01'),
('CON_SERVICIO_DE_MESA', 61, 80, 100000, '2025-08-01'),
('CON_SERVICIO_DE_MESA', 81, 100, 120000, '2025-08-01'),
('CON_SERVICIO_DE_MESA', 101, 120, 140000, '2025-08-01'),
-- BABY_SHOWERS
('BABY_SHOWERS', 1, 40, 50000, '2025-08-01'),
('BABY_SHOWERS', 41, 50, 55000, '2025-08-01'),
('BABY_SHOWERS', 51, 60, 60000, '2025-08-01'),
('BABY_SHOWERS', 61, 70, 65000, '2025-08-01'),
('BABY_SHOWERS', 71, 80, 70000, '2025-08-01'),
('BABY_SHOWERS', 81, 90, 75000, '2025-08-01'),
-- ADOLESCENTES
('ADOLESCENTES', 1, 40, 50000, '2025-11-01'),
('ADOLESCENTES', 41, 50, 55000, '2025-11-01'),
('ADOLESCENTES', 51, 60, 60000, '2025-11-01'),
-- FECHA_BANDAS
('FECHA_BANDAS', 1, 120, 120000, '2025-10-01');

-- ---------------------------------------------------------------------------
-- DURACIONES POR TIPO
-- ---------------------------------------------------------------------------
INSERT INTO opciones_duracion (id_tipo_evento, duracion_horas, descripcion) VALUES
-- INFANTILES: 3, 4, 5 horas
('INFANTILES', 3, '3 horas'),
('INFANTILES', 4, '4 horas'),
('INFANTILES', 5, '5 horas'),
-- INFORMALES: 4, 6, 8, 10 horas
('INFORMALES', 4, '4 horas'),
('INFORMALES', 6, '6 horas'),
('INFORMALES', 8, '8 horas'),
('INFORMALES', 10, '10 horas'),
-- CON_SERVICIO_DE_MESA: 4, 6, 8, 10 horas
('CON_SERVICIO_DE_MESA', 4, '4 horas'),
('CON_SERVICIO_DE_MESA', 6, '6 horas'),
('CON_SERVICIO_DE_MESA', 8, '8 horas'),
('CON_SERVICIO_DE_MESA', 10, '10 horas'),
-- BABY_SHOWERS: 3, 4, 5, 6 horas
('BABY_SHOWERS', 3, '3 horas'),
('BABY_SHOWERS', 4, '4 horas'),
('BABY_SHOWERS', 5, '5 horas'),
('BABY_SHOWERS', 6, '6 horas'),
-- ADOLESCENTES: 3, 4, 5 horas
('ADOLESCENTES', 3, '3 horas'),
('ADOLESCENTES', 4, '4 horas'),
('ADOLESCENTES', 5, '5 horas'),
-- FECHA_BANDAS: 5, 6, 7, 8 horas
('FECHA_BANDAS', 5, '5 horas'),
('FECHA_BANDAS', 6, '6 horas'),
('FECHA_BANDAS', 7, '7 horas'),
('FECHA_BANDAS', 8, '8 horas');

-- ---------------------------------------------------------------------------
-- HORARIOS POR TIPO (dia_semana = 'todos' aplica a cualquier día)
-- ---------------------------------------------------------------------------
INSERT INTO configuracion_horarios (id_tipo_evento, dia_semana, hora_inicio, hora_fin) VALUES
-- INFANTILES (todos los días)
('INFANTILES', 'todos', '12:00:00', '23:00:00'),
('INFANTILES', 'todos', '13:00:00', '23:00:00'),
('INFANTILES', 'todos', '14:00:00', '23:00:00'),
('INFANTILES', 'todos', '16:00:00', '23:00:00'),
('INFANTILES', 'todos', '17:00:00', '23:00:00'),
('INFANTILES', 'todos', '18:00:00', '23:00:00'),
-- INFORMALES (todos + sábados noche)
('INFORMALES', 'todos', '09:00:00', '23:00:00'),
('INFORMALES', 'todos', '10:00:00', '23:00:00'),
('INFORMALES', 'todos', '11:00:00', '23:00:00'),
('INFORMALES', 'todos', '12:00:00', '23:00:00'),
('INFORMALES', 'todos', '13:00:00', '23:00:00'),
('INFORMALES', 'todos', '14:00:00', '23:00:00'),
('INFORMALES', 'sabado', '15:00:00', '02:00:00'),
('INFORMALES', 'sabado', '16:00:00', '02:00:00'),
('INFORMALES', 'sabado', '17:00:00', '02:00:00'),
('INFORMALES', 'sabado', '18:00:00', '02:00:00'),
('INFORMALES', 'sabado', '19:00:00', '02:00:00'),
('INFORMALES', 'sabado', '20:00:00', '02:00:00'),
('INFORMALES', 'sabado', '21:00:00', '02:00:00'),
('INFORMALES', 'sabado', '22:00:00', '02:00:00'),
-- CON_SERVICIO_DE_MESA (todos + sábados noche)
('CON_SERVICIO_DE_MESA', 'todos', '09:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'todos', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'todos', '11:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'todos', '12:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '18:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '19:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '20:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '21:00:00', '02:00:00'),
-- BABY_SHOWERS (todos + sábados)
('BABY_SHOWERS', 'todos', '12:00:00', '23:00:00'),
('BABY_SHOWERS', 'todos', '13:00:00', '23:00:00'),
('BABY_SHOWERS', 'todos', '14:00:00', '23:00:00'),
('BABY_SHOWERS', 'todos', '16:00:00', '23:00:00'),
('BABY_SHOWERS', 'sabado', '17:00:00', '02:00:00'),
('BABY_SHOWERS', 'sabado', '18:00:00', '02:00:00'),
-- ADOLESCENTES (todos + sábados noche)
('ADOLESCENTES', 'todos', '12:00:00', '23:00:00'),
('ADOLESCENTES', 'todos', '13:00:00', '23:00:00'),
('ADOLESCENTES', 'todos', '14:00:00', '23:00:00'),
('ADOLESCENTES', 'todos', '16:00:00', '23:00:00'),
('ADOLESCENTES', 'sabado', '17:00:00', '02:00:00'),
('ADOLESCENTES', 'sabado', '18:00:00', '02:00:00'),
-- FECHA_BANDAS (todos + sábados)
('FECHA_BANDAS', 'todos', '12:00:00', '23:00:00'),
('FECHA_BANDAS', 'sabado', '21:00:00', '02:00:00');

-- ---------------------------------------------------------------------------
-- ADICIONALES (servicios extra para alquileres)
-- ---------------------------------------------------------------------------
INSERT INTO opciones_adicionales (nombre, precio, descripcion, url_imagen) VALUES
('Cama elástica', 30000.00, 'Cama elástica con red lateral para niños hasta 10 años', 'https://lh3.googleusercontent.com/pw/AP1GczMM-aZTEqkYM4KlsY5A79dD5IMy03IVXb0EgLUWVPlflvdfCikVlgkn3p6PVwELvS4qtBoD9HGf8LiIVAHNIuTzn3FxMxYcIecyqjeE1Ew-PZfl723Rt1kQGs-ClWpThLxG77uaRM153VQfVvD4O8fJ=w700-h933-s-no-gm?authuser=0'),
('Inflable Cocodrilo', 30000.00, 'Inflable con forma de cocodrilo de 4x7 metros con tobogan', 'https://lh3.googleusercontent.com/pw/AP1GczM9WbWMorMn_fPb7f9_uS7-IWAsKEj0LcCn8Zvi7U14_7Kjdjge28_RV50Gcu7wkinQk_W5mK5NFNXh1iFjv-Uq-EHjvQWigm3TcSlMvNhhM3ZOZMT05WkaWaxuL-QNciykkIuCmLe0YwQYRrFieHTl=w394-h231-s-no-gm?authuser=0'),
('Inflable Mickey/Minnie', 25000.00, 'Inflable de 4x4 metros con caras gigantes de Mickey y Minnie', 'https://lh3.googleusercontent.com/pw/AP1GczMQl1ffjotYB0j0jFCInMgBquqvsgAITDe31BuKk14RFS3Bky5eSfrTjuDJFDCqZ8bAkeVK1xqPFz3xzJBw8R_YXNyS6Zo0ZIytnwaHNIQCJvghvfhwP5xetCI7Xg2cVqFmbbDUuJ3Cv_-SHFU3BI6f=w340-h358-s-no-gm?authuser=0'),
('Inflable Princesa', 22000.00, 'Inflable temática Princesas de 3x3 metros', 'https://lh3.googleusercontent.com/pw/AP1GczOYtkKsvQOWJsscPoXvPKxmGWHFzXBUCnWMVr3jyPXvQLDPJFLKivYfqf0HP0DCFCiDZeuF_OHT2Dg7mY5gdOva0YQL94uS9aGQOhRviny_ZNoIPCAR-9p5x2gOXjrNYaAIzRnEKbOOqseXBmWgwfnT=w377-h360-s-no-gm?authuser=0'),
('Inflable Spiderman', 22000.00, 'Inflable temática Hombre Araña de 3x3 metros', 'https://lh3.googleusercontent.com/pw/AP1GczOlO48NaDkNnHM_ZPKJT-4eHH36bUYMJUZFlAObTvGgIgHy6H0hwaSbyxFJvAjmIrucr12rvG2FTpeLcezzfGBVUCmADUhhTYXZAUdUPw4bw2gdvjts1P-GOH4XPD3MrxLG3AfhHWlHtnk2IosfgBhl=w418-h349-s-no-gm?authuser=0'),
('Manteles negros con camino blanco', 30000.00, 'Manteles negros con camino blanco para todas las mesas', 'https://lh3.googleusercontent.com/pw/AP1GczPfoLiluF0pE9tFCtHRtuXpK0pFM3BQRZ97t81cE9aapbIAzlsJ5srLNeaJYfmI_2F247p2zH33ilH6oW3D-N_nM7BQKZL0CcrE49wNHZ1hQALYnGrsjMk3VsdwQ66In8Ub11R8bW8rD4Riyl6WJTjp=w999-h779-s-no-gm?authuser=0'),
('Manteles negros sólos', 20000.00, 'Manteles negros para todas las mesas', 'https://lh3.googleusercontent.com/pw/AP1GczOSpOTKTwuEAckvaWRc8thYEivYe0el_Fno_l6-ylS331QQaBD7L8zRVPQ1BVBXGdCjdyFbinue3OMV6BtZXpndGSbE4AuCCH710iGesDuGLotzH3gHsirHRral9vmMs-x8pG1S-rrSV0odj9BLrCSV=w800-h749-s-no-gm?authuser=0');

-- ---------------------------------------------------------------------------
-- PERSONAL DISPONIBLE
-- ---------------------------------------------------------------------------
INSERT INTO personal_disponible (id_personal, nombre_completo, rol, celular, activo) VALUES
('P001', 'Chony', 'Encargada,Puerta', '11 5959-7348', 1),
('P002', 'Leila', 'Limpieza,Puerta,Cocinera,Mesera', '11 3199-6780', 1),
('P003', 'Anita', 'Limpieza,Puerta', '11 5313-4502', 1),
('P004', 'Belen', 'Ayudante de cocina,Mesera', '11 2672-0497', 1),
('P005', 'Amelia', 'Mesera', '11 5064-1123', 1),
('P006', 'Giselle', 'Depiladora', NULL, 0),
('P007', 'Rodrigo', 'Bartender,Puerta,Cocinera,Mesera,Sonido', NULL, 0);

-- ---------------------------------------------------------------------------
-- ROLES REQUERIDOS POR EVENTO (según cantidad de personas)
-- ---------------------------------------------------------------------------
INSERT INTO roles_por_evento (id_tipo_evento, rol_requerido, cantidad, min_personas, max_personas) VALUES
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
('INFORMALES', 'Puerta', 1, 0, 120),
-- FECHA_BANDAS (eventos musicales)
('FECHA_BANDAS', 'Bartender', 1, 0, 500),
('FECHA_BANDAS', 'Puerta', 1, 0, 500),
('FECHA_BANDAS', 'Sonido', 1, 0, 500);

-- ---------------------------------------------------------------------------
-- CATÁLOGO DE ROLES
-- ---------------------------------------------------------------------------
INSERT INTO catalogo_roles (nombre, descripcion) VALUES
('Encargada', 'Responsable general del evento'),
('Cocinera', 'Preparación de alimentos'),
('Puerta', 'Recepción de invitados'),
('Mesera', 'Servicio de mesas'),
('Ayudante de cocina', 'Asistente en cocina'),
('Limpieza', 'Limpieza del salón'),
('Depiladora', 'Servicio de depilación'),
('Bartender', 'Manejo completo del Servicio de bar'),
('Sonido', 'Técnico de sonido'),
('DJ', 'Disc Jockey'),
('Seguridad', 'Personal de seguridad');

-- ---------------------------------------------------------------------------
-- COSTOS DE PERSONAL POR ROL Y VIGENCIA
-- ---------------------------------------------------------------------------
INSERT INTO costos_personal_vigencia (rol, fecha_de_vigencia, costo_por_hora, viaticos) VALUES
('Encargada', '2025-08-01', 5000, 0),
('Bartender', '2025-08-01', 5000, 0),
('Cocinera', '2025-08-01', 3500, 0),
('Puerta', '2025-08-01', 3500, 1000),
('Ayudante de cocina', '2025-08-01', 3000, 0),
('Mesera', '2025-08-01', 3000, 0),
('Limpieza', '2025-09-01', 3500, 1200),
('Sonido', '2025-08-01', 4000, 500),
('DJ', '2025-08-01', 4500, 0),
('Seguridad', '2025-08-01', 4000, 1000);

-- ---------------------------------------------------------------------------
-- CATÁLOGO DE INSTRUMENTOS (para bandas)
-- ---------------------------------------------------------------------------
INSERT INTO catalogo_instrumentos (nombre, categoria, icono) VALUES
-- Cuerdas
('Guitarra eléctrica', 'Cuerdas', 'fa-guitar'),
('Guitarra acústica', 'Cuerdas', 'fa-guitar'),
('Guitarra criolla', 'Cuerdas', 'fa-guitar'),
('Bajo eléctrico', 'Cuerdas', 'fa-guitar'),
('Bajo acústico', 'Cuerdas', 'fa-guitar'),
('Violín', 'Cuerdas', 'fa-violin'),
('Ukelele', 'Cuerdas', 'fa-guitar'),
-- Percusión
('Batería', 'Percusión', 'fa-drum'),
('Cajón peruano', 'Percusión', 'fa-drum'),
('Congas', 'Percusión', 'fa-drum'),
('Bongó', 'Percusión', 'fa-drum'),
('Timbales', 'Percusión', 'fa-drum'),
('Percusión menor', 'Percusión', 'fa-drum'),
-- Teclados
('Teclado', 'Teclados', 'fa-keyboard'),
('Piano', 'Teclados', 'fa-keyboard'),
('Sintetizador', 'Teclados', 'fa-keyboard'),
('Acordeón', 'Teclados', 'fa-keyboard'),
-- Vientos
('Saxofón', 'Vientos', 'fa-wind'),
('Trompeta', 'Vientos', 'fa-wind'),
('Trombón', 'Vientos', 'fa-wind'),
('Flauta traversa', 'Vientos', 'fa-wind'),
('Clarinete', 'Vientos', 'fa-wind'),
('Armónica', 'Vientos', 'fa-wind'),
-- Voz
('Voz principal', 'Voz', 'fa-microphone'),
('Coros', 'Voz', 'fa-microphone'),
('Segunda voz', 'Voz', 'fa-microphone'),
-- Electrónico
('DJ / Controlador', 'Electrónico', 'fa-compact-disc'),
('Sampler', 'Electrónico', 'fa-sliders');

-- ===========================================================================
-- FIN DEL SEED
-- ===========================================================================
