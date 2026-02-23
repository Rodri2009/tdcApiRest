/*
=============================================================================
TDC App - Data Seed (Configuración y Semillas)
=============================================================================
CONTIENE: Datos de configuración, catálogos, tarifas y personal
- Configuración del sistema
- Tipos de eventos y duraciones
- Horarios disponibles
- Servicios adicionales (inflables, manteles, etc.)
- Catálogos de roles e instrumentos
- Personal disponible y tarifas
- Precios vigentes
- Profesionales asociados
- Bandas en catálogo
- Cupones de descuento
=============================================================================
*/

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- =====================================================================
-- CONFIGURACIÓN DEL SISTEMA
-- =====================================================================
LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` (`Clave`, `Valor`) VALUES 
  ('NOMBRE_NEGOCIO', 'El Templo de Claypole'),
  ('TELEFONO', '1155630357'),
  ('EMAIL_CONTACTO', 'contacto@eltemplodeclaypole.com'),
  ('DIRECCION', 'Liniers 465, Claypole, Buenos Aires'),
  ('HORARIO_ATENCION', 'Lunes a Sábado 10:00 - 22:00'),
  ('ANTICIPACION_MINIMA_DIAS', '3'),
  ('ANTICIPACION_MAXIMA_DIAS', '90');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- TIPOS DE EVENTOS DISPONIBLES
-- =====================================================================
LOCK TABLES `opciones_tipos` WRITE;
/*!40000 ALTER TABLE `opciones_tipos` DISABLE KEYS */;
INSERT INTO `opciones_tipos` 
  (`id_tipo_evento`, `nombre_para_mostrar`, `descripcion`, `categoria`, `es_publico`, `monto_sena`, `deposito`) 
VALUES 
  ('INFANTILES', 
   'INFANTILES: Cumpleaños hasta 12 años (SERVICIO COMPLETO)', 
   '🎈 **CUMPLEAÑOS INFANTILES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina completa con cocinera\n• Inflable 3x3\n• Metegoles, Ping Pong, Pool y Jenga gigante\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Baño equipado\n• Música y juego de luces\n• Cancha de fútbol (niños hasta 12 años)\n• 20 min previos para decoración\n\n❌ **NO INCLUYE:** Bebidas, alimentos, animación, vajilla de cristal',
   'ALQUILER_SALON', 1, 50000.00, NULL),

  ('ADOLESCENTES',
   'ADOLESCENTES: Cumpleaños de 13 a 17 años',
   '🎧 **CUMPLEAÑOS ADOLESCENTES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina con cocinera\n• Metegoles, Ping Pong, Pool, Jenga\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Música y juego de luces\n• 20 min previos para decoración\n\n❌ **NO INCLUYE:** Cancha de fútbol',
   'ALQUILER_SALON', 1, 50000.00, 80000.00),

  ('BABY_SHOWERS',
   'BABY SHOWERS / BAUTISMOS / COMUNIONES',
   '👶 **BABY SHOWERS / BAUTISMOS / COMUNIONES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina con cocinera\n• Inflable 3x3\n• Metegoles, Ping Pong, Pool\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Música y luces\n• Cancha (niños hasta 12)\n\n❌ **NO INCLUYE:** Meseras, animación, vajilla de metal',
   'ALQUILER_SALON', 1, 50000.00, NULL),

  ('CON_SERVICIO_DE_MESA',
   'FIESTAS de 15 / 18 / casamientos (SERVICIO COMPLETO)',
   '🌟 **SERVICIO COMPLETO**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Cocinera y uso completo de cocina\n• Meseras según cantidad\n• Mesas, sillas y mantelería\n• Vajilla de cristal y cubiertos de metal\n• Sonido profesional PA JBL\n• Backline para bandas\n• Baño equipado\n\n❌ **NO INCLUYE:** DJ, decoración, cancha de fútbol',
   'ALQUILER_SALON', 1, 80000.00, NULL),

  ('INFORMALES',
   'INFORMALES: Juntadas, parrilladas (SERVICIO ECONÓMICO)',
   '🎉 **SERVICIO ECONÓMICO**\n\n✅ **INCLUYE:**\n• Encargada/o general y control de puerta\n• Mesas y sillas\n• Uso de parrilla\n• Uso de bachas, mesadas, barra\n• Heladera y freezer\n• Baño equipado\n• Equipo de música\n• Metegoles, Ping Pong, Pool\n\n❌ **NO INCLUYE:** Horno, hornallas, cocinera, mantelería, vajilla',
   'ALQUILER_SALON', 1, 50000.00, 80000.00),

  ('FECHA_BANDAS',
   'Fecha para bandas en vivo',
   '🎸 **FECHA PARA BANDAS**\n\n✅ **INCLUYE:**\n• Coordinación de bandas\n• Flyers y publicaciones\n• Encargada de puerta\n• Uso de cocina\n• Sonido profesional\n• Backline completo',
   'FECHA_BANDAS', 0, NULL, NULL),

  ('MASAJES',
   'Masajes',
   '💆 **MASAJES PROFESIONALES**\n\nTipos: Descontracturante, Relajante, Reflexología, Piedras calientes\nDuración: 45 a 90 min',
   'SERVICIOS', 1, NULL, NULL),

  ('DEPILACION',
   'Depilación',
   '🌸 **DEPILACIÓN**\n\nZonas: Piernas, Brazos, Cavado, Bozo, Axilas\nMétodo: Cera tibia descartable',
   'SERVICIOS', 1, NULL, NULL),

  ('DEPILACION_DEFINITIVA',
   'Depilación Definitiva',
   '⚡ **DEPILACIÓN DEFINITIVA**',
   'SERVICIOS', 0, NULL, NULL),

  ('ESTETICA',
   'Estética',
   '✨ **ESTÉTICA**\n\nTratamientos: Limpieza facial, Hidratación, Anti-age, Acné',
   'SERVICIOS', 1, NULL, NULL),

  ('TALLER_MUSICA',
   'Música',
   '🎵 **MÚSICA**\n\nInstrumentos: Guitarra, Teclado, Batería, Canto, Vientos',
   'TALLERES_ACTIVIDADES', 1, NULL, NULL),

  ('TALLER_DANZA',
   'Danza',
   '💃 **DANZA**\n\nEstilos: Folklore, Tango, Contemporánea, Salsa, Bachata',
   'TALLERES_ACTIVIDADES', 1, NULL, NULL),

  ('TALLER_YOGA',
   'Yoga',
   '🧘 **YOGA**\n\nEstilos: Hatha, Vinyasa, Restaurativo, Embarazadas',
   'TALLERES_ACTIVIDADES', 1, NULL, NULL),

  ('TALLER_ARTE',
   'Arte y Manualidades',
   '🎨 **TALLERES DE ARTE**\n\nPintura, Dibujo, Cerámica, Manualidades, Tejido',
   'TALLERES_ACTIVIDADES', 1, NULL, NULL);
/*!40000 ALTER TABLE `opciones_tipos` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- DURACIONES DISPONIBLES POR TIPO DE EVENTO
-- =====================================================================
LOCK TABLES `opciones_duracion` WRITE;
/*!40000 ALTER TABLE `opciones_duracion` DISABLE KEYS */;
INSERT INTO `opciones_duracion` 
  (`id`, `id_tipo_evento`, `duracion_horas`, `descripcion`) 
VALUES 
  -- INFANTILES: 3, 4, 5 horas
  (1, 'INFANTILES', 3, '3 horas'),
  (2, 'INFANTILES', 4, '4 horas'),
  (3, 'INFANTILES', 5, '5 horas'),
  
  -- INFORMALES: 4, 6, 8, 10 horas
  (4, 'INFORMALES', 4, '4 horas'),
  (5, 'INFORMALES', 6, '6 horas'),
  (6, 'INFORMALES', 8, '8 horas'),
  (7, 'INFORMALES', 10, '10 horas'),
  
  -- CON_SERVICIO_DE_MESA: 4, 6, 8, 10 horas
  (8, 'CON_SERVICIO_DE_MESA', 4, '4 horas'),
  (9, 'CON_SERVICIO_DE_MESA', 6, '6 horas'),
  (10, 'CON_SERVICIO_DE_MESA', 8, '8 horas'),
  (11, 'CON_SERVICIO_DE_MESA', 10, '10 horas'),
  
  -- BABY_SHOWERS: 3, 4, 5, 6 horas
  (12, 'BABY_SHOWERS', 3, '3 horas'),
  (13, 'BABY_SHOWERS', 4, '4 horas'),
  (14, 'BABY_SHOWERS', 5, '5 horas'),
  (15, 'BABY_SHOWERS', 6, '6 horas'),
  
  -- ADOLESCENTES: 3, 4, 5 horas
  (16, 'ADOLESCENTES', 3, '3 horas'),
  (17, 'ADOLESCENTES', 4, '4 horas'),
  (18, 'ADOLESCENTES', 5, '5 horas'),
  
  -- FECHA_BANDAS: 5, 6, 7, 8 horas
  (19, 'FECHA_BANDAS', 5, '5 horas'),
  (20, 'FECHA_BANDAS', 6, '6 horas'),
  (21, 'FECHA_BANDAS', 7, '7 horas'),
  (22, 'FECHA_BANDAS', 8, '8 horas');
/*!40000 ALTER TABLE `opciones_duracion` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- HORARIOS DISPONIBLES POR TIPO DE EVENTO
-- =====================================================================
LOCK TABLES `configuracion_horarios` WRITE;
/*!40000 ALTER TABLE `configuracion_horarios` DISABLE KEYS */;
INSERT INTO `configuracion_horarios` 
  (`id`, `id_tipo_evento`, `dia_semana`, `hora_inicio`, `hora_fin`) 
VALUES 
  -- INFANTILES (todos los días de 12:00 a 23:00 con varios horarios)
  (1, 'INFANTILES', 'todos', '12:00:00', '23:00:00'),
  (2, 'INFANTILES', 'todos', '13:00:00', '23:00:00'),
  (3, 'INFANTILES', 'todos', '14:00:00', '23:00:00'),
  (4, 'INFANTILES', 'todos', '16:00:00', '23:00:00'),
  (5, 'INFANTILES', 'todos', '17:00:00', '23:00:00'),
  (6, 'INFANTILES', 'todos', '18:00:00', '23:00:00'),
  
  -- INFORMALES (días laborales de 09:00 a 23:00)
  (7, 'INFORMALES', 'todos', '09:00:00', '23:00:00'),
  (8, 'INFORMALES', 'todos', '10:00:00', '23:00:00'),
  (9, 'INFORMALES', 'todos', '11:00:00', '23:00:00'),
  (10, 'INFORMALES', 'todos', '12:00:00', '23:00:00'),
  (11, 'INFORMALES', 'todos', '13:00:00', '23:00:00'),
  (12, 'INFORMALES', 'todos', '14:00:00', '23:00:00'),
  
  -- INFORMALES (sábados hasta las 2:00 AM)
  (13, 'INFORMALES', 'sabado', '15:00:00', '02:00:00'),
  (14, 'INFORMALES', 'sabado', '16:00:00', '02:00:00'),
  (15, 'INFORMALES', 'sabado', '17:00:00', '02:00:00'),
  (16, 'INFORMALES', 'sabado', '18:00:00', '02:00:00'),
  (17, 'INFORMALES', 'sabado', '19:00:00', '02:00:00'),
  (18, 'INFORMALES', 'sabado', '20:00:00', '02:00:00'),
  (19, 'INFORMALES', 'sabado', '21:00:00', '02:00:00'),
  (20, 'INFORMALES', 'sabado', '22:00:00', '02:00:00'),
  
  -- CON_SERVICIO_DE_MESA (de 09:00 a 23:00)
  (21, 'CON_SERVICIO_DE_MESA', 'todos', '09:00:00', '23:00:00'),
  (22, 'CON_SERVICIO_DE_MESA', 'todos', '10:00:00', '23:00:00'),
  (23, 'CON_SERVICIO_DE_MESA', 'todos', '11:00:00', '23:00:00'),
  (24, 'CON_SERVICIO_DE_MESA', 'todos', '12:00:00', '23:00:00'),
  
  -- CON_SERVICIO_DE_MESA (sábados)
  (25, 'CON_SERVICIO_DE_MESA', 'sabado', '18:00:00', '02:00:00'),
  (26, 'CON_SERVICIO_DE_MESA', 'sabado', '19:00:00', '02:00:00'),
  (27, 'CON_SERVICIO_DE_MESA', 'sabado', '20:00:00', '02:00:00'),
  (28, 'CON_SERVICIO_DE_MESA', 'sabado', '21:00:00', '02:00:00'),
  
  -- BABY_SHOWERS
  (29, 'BABY_SHOWERS', 'todos', '12:00:00', '23:00:00'),
  (30, 'BABY_SHOWERS', 'todos', '13:00:00', '23:00:00'),
  (31, 'BABY_SHOWERS', 'todos', '14:00:00', '23:00:00'),
  (32, 'BABY_SHOWERS', 'todos', '16:00:00', '23:00:00'),
  (33, 'BABY_SHOWERS', 'sabado', '17:00:00', '02:00:00'),
  (34, 'BABY_SHOWERS', 'sabado', '18:00:00', '02:00:00'),
  
  -- ADOLESCENTES
  (35, 'ADOLESCENTES', 'todos', '12:00:00', '23:00:00'),
  (36, 'ADOLESCENTES', 'todos', '13:00:00', '23:00:00'),
  (37, 'ADOLESCENTES', 'todos', '14:00:00', '23:00:00'),
  (38, 'ADOLESCENTES', 'todos', '16:00:00', '23:00:00'),
  (39, 'ADOLESCENTES', 'sabado', '17:00:00', '02:00:00'),
  (40, 'ADOLESCENTES', 'sabado', '18:00:00', '02:00:00'),
  
  -- FECHA_BANDAS
  (41, 'FECHA_BANDAS', 'todos', '12:00:00', '23:00:00'),
  (42, 'FECHA_BANDAS', 'sabado', '21:00:00', '02:00:00');
/*!40000 ALTER TABLE `configuracion_horarios` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SERVICIOS ADICIONALES (INFLABLES, MANTELES, etc.)
-- =====================================================================
LOCK TABLES `opciones_adicionales` WRITE;
/*!40000 ALTER TABLE `opciones_adicionales` DISABLE KEYS */;
INSERT INTO `opciones_adicionales` 
  (`nombre`, `precio`, `descripcion`, `url_imagen`) 
VALUES 
  ('Inflable Cocodrilo', 30000.00, 
   'Inflable con forma de cocodrilo de 4x7 metros con tobogan',
   'https://lh3.googleusercontent.com/pw/AP1GczM9WbWMorMn_fPb7f9_uS7-IWAsKEj0LcCn8Zvi7U14_7Kjdjge28_RV50Gcu7wkinQk_W5mK5NFNXh1iFjv-Uq-EHjvQWigm3TcSlMvNhhM3ZOZMT05WkaWaxuL-QNciykkIuCmLe0YwQYRrFieHTl=w394-h231-s-no-gm?authuser=0'),

  ('Inflable Mickey/Minnie', 25000.00,
   'Inflable de 4x4 metros con caras gigantes de Mickey y Minnie',
   'https://lh3.googleusercontent.com/pw/AP1GczMQl1ffjotYB0j0jFCInMgBquqvsgAITDe31BuKk14RFS3Bky5eSfrTjuDJFDCqZ8bAkeVK1xqPFz3xzJBw8R_YXNyS6Zo0ZIytnwaHNIQCJvghvfhwP5xetCI7Xg2cVqFmbbDUuJ3Cv_-SHFU3BI6f=w340-h358-s-no-gm?authuser=0'),

  ('Inflable Princesa', 22000.00,
   'Inflable temática Princesas de 3x3 metros',
   'https://lh3.googleusercontent.com/pw/AP1GczOYtkKsvQOWJsscPoXvPKxmGWHFzXBUCnWMVr3jyPXvQLDPJFLKivYfqf0HP0DCFCiDZeuF_OHT2Dg7mY5gdOva0YQL94uS9aGQOhRviny_ZNoIPCAR-9p5x2gOXjrNYaAIzRnEKbOOqseXBmWgwfnT=w377-h360-s-no-gm?authuser=0'),

  ('Inflable Spiderman', 22000.00,
   'Inflable temática Hombre Araña de 3x3 metros',
   'https://lh3.googleusercontent.com/pw/AP1GczOlO48NaDkNnHM_ZPKJT-4eHH36bUYMJUZFlAObTvGgIgHy6H0hwaSbyxFJvAjmIrucr12rvG2FTpeLcezzfGBVUCmADUhhTYXZAUdUPw4bw2gdvjts1P-GOH4XPD3MrxLG3AfhHWlHtnk2IosfgBhl=w418-h349-s-no-gm?authuser=0'),

  ('Cama elástica', 30000.00,
   'Cama elástica con red lateral para niños hasta 10 años',
   'https://lh3.googleusercontent.com/pw/AP1GczMM-aZTEqkYM4KlsY5A79dD5IMy03IVXb0EgLUWVPlflvdfCikVlgkn3p6PVwELvS4qtBoD9HGf8LiIVAHNIuTzn3FxMxYcIecyqjeE1Ew-PZfl723Rt1kQGs-ClWpThLxG77uaRM153VQfVvD4O8fJ=w700-h933-s-no-gm?authuser=0'),

  ('Manteles negros con camino blanco', 30000.00,
   'Manteles negros con camino blanco para todas las mesas',
   'https://lh3.googleusercontent.com/pw/AP1GczPfoLiluF0pE9tFCtHRtuXpK0pFM3BQRZ97t81cE9aapbIAzlsJ5srLNeaJYfmI_2F247p2zH33ilH6oW3D-N_nM7BQKZL0CcrE49wNHZ1hQALYnGrsjMk3VsdwQ66In8Ub11R8bW8rD4Riyl6WJTjp=w999-h779-s-no-gm?authuser=0'),

  ('Manteles negros sólos', 20000.00,
   'Manteles negros para todas las mesas',
   'https://lh3.googleusercontent.com/pw/AP1GczOSpOTKTwuEAckvaWRc8thYEivYe0el_Fno_l6-ylS331QQaBD7L8zRVPQ1BVBXGdCjdyFbinue3OMV6BtZXpndGSbE4AuCCH710iGesDuGLotzH3gHsirHRral9vmMs-x8pG1S-rrSV0odj9BLrCSV=w800-h749-s-no-gm?authuser=0'),

  ('Mesa extra', 5000.00,
   'Mesa extra para buffet',
   NULL),

  ('Silla extra', 300.00,
   'Silla plegable extra',
   NULL);
/*!40000 ALTER TABLE `opciones_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- CATÁLOGO DE ROLES DEL PERSONAL
-- =====================================================================
LOCK TABLES `catalogo_roles` WRITE;
/*!40000 ALTER TABLE `catalogo_roles` DISABLE KEYS */;
INSERT INTO `catalogo_roles` 
  (`id`, `nombre`, `descripcion`, `activo`, `creado_en`) 
VALUES 
  (1, 'Encargada', 'Responsable general del evento', 1, '2026-02-22 16:16:33'),
  (2, 'Cocinera', 'Preparación de alimentos', 1, '2026-02-22 16:16:33'),
  (3, 'Puerta', 'Recepción de invitados', 1, '2026-02-22 16:16:33'),
  (4, 'Mesera', 'Servicio de mesas', 1, '2026-02-22 16:16:33'),
  (5, 'Ayudante de cocina', 'Asistente en cocina', 1, '2026-02-22 16:16:33'),
  (6, 'Limpieza', 'Limpieza del salón', 1, '2026-02-22 16:16:33'),
  (7, 'Depiladora', 'Servicio de depilación', 1, '2026-02-22 16:16:33'),
  (8, 'Bartender', 'Manejo completo del Servicio de bar', 1, '2026-02-22 16:16:33'),
  (9, 'Sonido', 'Técnico de sonido', 1, '2026-02-22 16:16:33'),
  (10, 'DJ', 'Disc Jockey', 1, '2026-02-22 16:16:33'),
  (11, 'Seguridad', 'Personal de seguridad', 1, '2026-02-22 16:16:33');
/*!40000 ALTER TABLE `catalogo_roles` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- COSTOS DE PERSONAL POR VIGENCIA
-- =====================================================================
LOCK TABLES `costos_personal_vigencia` WRITE;
/*!40000 ALTER TABLE `costos_personal_vigencia` DISABLE KEYS */;
INSERT INTO `costos_personal_vigencia` 
  (`id`, `rol`, `fecha_de_vigencia`, `costo_por_hora`, `viaticos`) 
VALUES 
  (1, 'Encargada', '2025-08-01', 5000.00, 0.00),
  (2, 'Bartender', '2025-08-01', 5000.00, 0.00),
  (3, 'Cocinera', '2025-08-01', 3500.00, 0.00),
  (4, 'Puerta', '2025-08-01', 3500.00, 1000.00),
  (5, 'Ayudante de cocina', '2025-08-01', 3000.00, 0.00),
  (6, 'Mesera', '2025-08-01', 3000.00, 0.00),
  (7, 'Limpieza', '2025-09-01', 3500.00, 1200.00),
  (8, 'Sonido', '2025-08-01', 4000.00, 500.00),
  (9, 'DJ', '2025-08-01', 4500.00, 0.00),
  (10, 'Seguridad', '2025-08-01', 4000.00, 1000.00);
/*!40000 ALTER TABLE `costos_personal_vigencia` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- TARIFAS DE PERSONAL
-- =====================================================================
LOCK TABLES `personal_tarifas` WRITE;
/*!40000 ALTER TABLE `personal_tarifas` DISABLE KEYS */;
INSERT INTO `personal_tarifas` 
  (`id`, `nombre_rol`, `monto_por_hora`, `monto_fijo_evento`, `monto_minimo`, `vigente_desde`, `vigente_hasta`, `moneda`, `descripcion`, `activo`, `creado_en`, `actualizado_en`) 
VALUES 
  (1, 'DJ', 2500.00, 15000.00, 10000.00, '2025-01-01', NULL, 'ARS', 'DJ - Tarifa estándar', 1, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (2, 'Mesera', 1800.00, 8000.00, 6000.00, '2025-01-01', NULL, 'ARS', 'Mesera - Tarifa estándar', 1, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (3, 'Bartender', 2200.00, 12000.00, 8000.00, '2025-01-01', NULL, 'ARS', 'Bartender - Tarifa estándar', 1, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (4, 'DJ', 2500.00, 15000.00, 10000.00, '2025-01-01', NULL, 'ARS', 'DJ - Tarifa estándar', 1, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (5, 'Mesera', 1800.00, 8000.00, 6000.00, '2025-01-01', NULL, 'ARS', 'Mesera - Tarifa estándar', 1, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (6, 'Bartender', 2200.00, 12000.00, 8000.00, '2025-01-01', NULL, 'ARS', 'Bartender - Tarifa estándar', 1, '2026-02-22 16:16:33', '2026-02-22 16:16:33');
/*!40000 ALTER TABLE `personal_tarifas` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- PRECIOS DE SERVICIOS
-- =====================================================================
LOCK TABLES `precios_servicios` WRITE;
/*!40000 ALTER TABLE `precios_servicios` DISABLE KEYS */;
INSERT INTO `precios_servicios` 
  (`id`, `servicio_id`, `precio`, `vigente`, `vigente_desde`, `vigente_hasta`, `creado_en`, `actualizado_en`) 
VALUES 
  (1, 1, 4000.00, 1, '2025-08-01', NULL, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (2, 2, 3500.00, 1, '2025-08-01', NULL, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (3, 3, 2500.00, 1, '2025-08-01', NULL, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (4, 4, 1200.00, 1, '2025-08-01', NULL, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (5, 5, 3000.00, 1, '2025-08-01', NULL, '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (6, 6, 2800.00, 1, '2025-08-01', NULL, '2026-02-22 16:16:33', '2026-02-22 16:16:33');
/*!40000 ALTER TABLE `precios_servicios` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- MATRIZ DE PRECIOS POR TIPO DE EVENTO Y CANTIDAD DE PERSONAS
-- =====================================================================
LOCK TABLES `precios_vigencia` WRITE;
/*!40000 ALTER TABLE `precios_vigencia` DISABLE KEYS */;
INSERT INTO `precios_vigencia` 
  (`id`, `id_tipo_evento`, `cantidad_min`, `cantidad_max`, `precio_por_hora`, `vigente_desde`, `vigente_hasta`) 
VALUES 
  -- INFANTILES: 50K-75K segun cantidad
  (1, 'INFANTILES', 1, 40, 50000.00, '2025-08-01', NULL),
  (2, 'INFANTILES', 41, 50, 55000.00, '2025-08-01', NULL),
  (3, 'INFANTILES', 51, 60, 60000.00, '2025-08-01', NULL),
  (4, 'INFANTILES', 61, 70, 65000.00, '2025-08-01', NULL),
  (5, 'INFANTILES', 71, 80, 70000.00, '2025-08-01', NULL),
  (6, 'INFANTILES', 81, 90, 75000.00, '2025-08-01', NULL),
  (7, 'INFANTILES', 91, 100, 75000.00, '2025-08-01', NULL),
  (8, 'INFANTILES', 101, 110, 75000.00, '2025-08-01', NULL),
  
  -- INFORMALES: 30K-60K segun cantidad
  (9, 'INFORMALES', 1, 50, 30000.00, '2025-08-01', NULL),
  (10, 'INFORMALES', 51, 70, 40000.00, '2025-08-01', NULL),
  (11, 'INFORMALES', 71, 90, 50000.00, '2025-08-01', NULL),
  (12, 'INFORMALES', 91, 110, 60000.00, '2025-08-01', NULL),
  
  -- CON_SERVICIO_DE_MESA: 60K-140K segun cantidad
  (13, 'CON_SERVICIO_DE_MESA', 1, 40, 60000.00, '2025-08-01', NULL),
  (14, 'CON_SERVICIO_DE_MESA', 41, 60, 80000.00, '2025-08-01', NULL),
  (15, 'CON_SERVICIO_DE_MESA', 61, 80, 100000.00, '2025-08-01', NULL),
  (16, 'CON_SERVICIO_DE_MESA', 81, 100, 120000.00, '2025-08-01', NULL),
  (17, 'CON_SERVICIO_DE_MESA', 101, 120, 140000.00, '2025-08-01', NULL),
  
  -- BABY_SHOWERS: 50K-75K segun cantidad
  (18, 'BABY_SHOWERS', 1, 40, 50000.00, '2025-08-01', NULL),
  (19, 'BABY_SHOWERS', 41, 50, 55000.00, '2025-08-01', NULL),
  (20, 'BABY_SHOWERS', 51, 60, 60000.00, '2025-08-01', NULL),
  (21, 'BABY_SHOWERS', 61, 70, 65000.00, '2025-08-01', NULL),
  (22, 'BABY_SHOWERS', 71, 80, 70000.00, '2025-08-01', NULL),
  (23, 'BABY_SHOWERS', 81, 90, 75000.00, '2025-08-01', NULL),
  
  -- ADOLESCENTES: 50K-60K
  (24, 'ADOLESCENTES', 1, 40, 50000.00, '2025-11-01', NULL),
  (25, 'ADOLESCENTES', 41, 50, 55000.00, '2025-11-01', NULL),
  (26, 'ADOLESCENTES', 51, 60, 60000.00, '2025-11-01', NULL),
  
  -- FECHA_BANDAS: 120K fijo
  (27, 'FECHA_BANDAS', 1, 120, 120000.00, '2025-10-01', NULL);
/*!40000 ALTER TABLE `precios_vigencia` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- ROLES REQUERIDOS POR TIPO DE EVENTO
-- =====================================================================
LOCK TABLES `roles_por_evento` WRITE;
/*!40000 ALTER TABLE `roles_por_evento` DISABLE KEYS */;
INSERT INTO `roles_por_evento` 
  (`id`, `id_tipo_evento`, `rol_requerido`, `cantidad`, `min_personas`, `max_personas`) 
VALUES 
  -- INFANTILES
  (1, 'INFANTILES', 'Encargada', 1, 0, 120),
  (2, 'INFANTILES', 'Cocinera', 1, 0, 120),
  (3, 'INFANTILES', 'Puerta', 1, 0, 120),
  (4, 'INFANTILES', 'Mesera', 1, 51, 60),
  (5, 'INFANTILES', 'Mesera', 2, 61, 80),
  (6, 'INFANTILES', 'Mesera', 3, 81, 100),
  (7, 'INFANTILES', 'Mesera', 4, 101, 120),
  (8, 'INFANTILES', 'Ayudante de cocina', 1, 51, 80),
  (9, 'INFANTILES', 'Ayudante de cocina', 2, 81, 120),
  
  -- CON_SERVICIO_DE_MESA
  (10, 'CON_SERVICIO_DE_MESA', 'Encargada', 1, 0, 120),
  (11, 'CON_SERVICIO_DE_MESA', 'Cocinera', 1, 0, 120),
  (12, 'CON_SERVICIO_DE_MESA', 'Puerta', 1, 0, 120),
  (13, 'CON_SERVICIO_DE_MESA', 'Mesera', 1, 51, 60),
  (14, 'CON_SERVICIO_DE_MESA', 'Mesera', 2, 61, 80),
  (15, 'CON_SERVICIO_DE_MESA', 'Mesera', 3, 81, 100),
  (16, 'CON_SERVICIO_DE_MESA', 'Mesera', 4, 101, 120),
  (17, 'CON_SERVICIO_DE_MESA', 'Ayudante de cocina', 1, 51, 80),
  (18, 'CON_SERVICIO_DE_MESA', 'Ayudante de cocina', 2, 81, 120),
  
  -- BABY_SHOWERS
  (19, 'BABY_SHOWERS', 'Encargada', 1, 0, 120),
  (20, 'BABY_SHOWERS', 'Cocinera', 1, 0, 120),
  (21, 'BABY_SHOWERS', 'Puerta', 1, 0, 120),
  (22, 'BABY_SHOWERS', 'Mesera', 1, 51, 60),
  (23, 'BABY_SHOWERS', 'Mesera', 2, 61, 80),
  (24, 'BABY_SHOWERS', 'Mesera', 3, 81, 100),
  (25, 'BABY_SHOWERS', 'Mesera', 4, 101, 120),
  (26, 'BABY_SHOWERS', 'Ayudante de cocina', 1, 51, 80),
  (27, 'BABY_SHOWERS', 'Ayudante de cocina', 2, 81, 120),
  
  -- INFORMALES
  (28, 'INFORMALES', 'Encargada', 1, 0, 120),
  (29, 'INFORMALES', 'Puerta', 1, 0, 120),
  
  -- FECHA_BANDAS
  (30, 'FECHA_BANDAS', 'Bartender', 1, 0, 500),
  (31, 'FECHA_BANDAS', 'Puerta', 1, 0, 500),
  (32, 'FECHA_BANDAS', 'Sonido', 1, 0, 500);
/*!40000 ALTER TABLE `roles_por_evento` ENABLE KEYS */;
UNLOCK TABLES;


-- =====================================================================
-- CATÁLOGO DE INSTRUMENTOS MUSICALES
-- =====================================================================
LOCK TABLES `catalogo_instrumentos` WRITE;
/*!40000 ALTER TABLE `catalogo_instrumentos` DISABLE KEYS */;
INSERT INTO `catalogo_instrumentos` 
  (`id_instrumento`, `nombre`, `categoria`, `icono`) 
VALUES 
  -- Cuerdas (1-7)
  (1, 'Guitarra eléctrica', 'Cuerdas', 'fa-guitar'),
  (2, 'Guitarra acústica', 'Cuerdas', 'fa-guitar'),
  (3, 'Guitarra criolla', 'Cuerdas', 'fa-guitar'),
  (4, 'Bajo eléctrico', 'Cuerdas', 'fa-guitar'),
  (5, 'Bajo acústico', 'Cuerdas', 'fa-guitar'),
  (6, 'Violín', 'Cuerdas', 'fa-violin'),
  (7, 'Ukelele', 'Cuerdas', 'fa-guitar'),
  
  -- Percusión (8-13)
  (8, 'Batería', 'Percusión', 'fa-drum'),
  (9, 'Cajón peruano', 'Percusión', 'fa-drum'),
  (10, 'Congas', 'Percusión', 'fa-drum'),
  (11, 'Bongó', 'Percusión', 'fa-drum'),
  (12, 'Timbales', 'Percusión', 'fa-drum'),
  (13, 'Percusión menor', 'Percusión', 'fa-drum'),
  
  -- Teclados (14-17)
  (14, 'Teclado', 'Teclados', 'fa-keyboard'),
  (15, 'Piano', 'Teclados', 'fa-keyboard'),
  (16, 'Sintetizador', 'Teclados', 'fa-keyboard'),
  (17, 'Acordeón', 'Teclados', 'fa-keyboard'),
  
  -- Vientos (18-23)
  (18, 'Saxofón', 'Vientos', 'fa-wind'),
  (19, 'Trompeta', 'Vientos', 'fa-wind'),
  (20, 'Trombón', 'Vientos', 'fa-wind'),
  (21, 'Flauta traversa', 'Vientos', 'fa-wind'),
  (22, 'Clarinete', 'Vientos', 'fa-wind'),
  (23, 'Armónica', 'Vientos', 'fa-wind'),
  
  -- Voz (24-26)
  (24, 'Voz principal', 'Voz', 'fa-microphone'),
  (25, 'Coros', 'Voz', 'fa-microphone'),
  (26, 'Segunda voz', 'Voz', 'fa-microphone'),
  
  -- Electrónico (27-28)
  (27, 'DJ / Controlador', 'Electrónico', 'fa-compact-disc'),
  (28, 'Sampler', 'Electrónico', 'fa-sliders');
/*!40000 ALTER TABLE `catalogo_instrumentos` ENABLE KEYS */;
UNLOCK TABLES;


/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET @OLD_SQL_NOTES=@OLD_SQL_NOTES */;
