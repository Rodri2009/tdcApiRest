/*
=============================================================================
TDC App - Test Data (Datos de Prueba Coherentes)
=============================================================================
CONTIENE: Datos transaccionales completos y relacionados
- Clientes con solicitudes de cada tipo
- Solicitudes padre con sus correspondientes registros en tablas hijas
- Cuando una solicitud está CONFIRMADA → crear evento_confirmado
- Datos de prueba en todas las capas
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
-- USUARIOS DEL SISTEMA
-- =====================================================================
LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` 
  (`id`, `email`, `password_hash`, `nombre`, `rol`, `activo`, `creado_en`) 
VALUES 
  (1, 'rodrigo@rodrigo', '$2b$10$7V0f1HNFpPJw0dEjDkJA8O4c5jYNZ5z5fKzMf5qW8R9z5K5zKzKzO', 
   'Rodrigo Admin', 'admin', 1, '2026-02-22 16:16:33');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- CLIENTES (Tabla Padre)
-- =====================================================================
LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` 
  (`id_cliente`, `nombre`, `telefono`, `email`, `notas`, `creado_en`, `actualizado_en`) 
VALUES 
  -- Clientes para solicitudes de alquiler
  (1, 'María García Smith', '1141234567', 'maria.garcia@gmail.com', 
   'Madre interesada en cumpleaño infantil', '2026-02-15 10:00:00', '2026-02-22 16:16:33'),

  (2, 'Carlos López Martínez', '1155556789', 'carlos.lopez@hotmail.com', 
   'Papá de quince años - Requiere servicio completo', '2026-02-16 14:15:00', '2026-02-22 16:16:33'),

  (3, 'Ana Martínez Rodríguez', '1155551111', 'ana.martinez@gmail.com', 
   'Baby shower - presupuesto moderado', '2026-02-17 11:45:00', '2026-02-22 16:16:33'),

  (4, 'Juan Pérez López', '1144442222', 'juan.perez@outlook.com', 
   'Asado informal con amigos', '2026-02-18 16:20:00', '2026-02-22 16:16:33'),

  -- Clientes/Bandas para solicitudes de fechas
  (5, 'Reite Band', '1155001122', 'reite.tributo@gmail.com', 
   'Tributo a La Renga - Solicitan fecha propia', '2026-02-19 13:00:00', '2026-02-22 16:16:33'),

  (6, 'Las Mentas', '1155005566', 'lasmentas@gmail.com', 
   'Banda de rock femenino - Solicitan fecha', '2026-02-19 10:30:00', '2026-02-22 16:16:33'),

  (7, 'Pateando Bares Oficial', '1155003344', 'pateando.bares@gmail.com', 
   'Banda rock nacional - Solicitan fecha compartida', '2026-02-20 14:20:00', '2026-02-22 16:16:33'),

  -- Cliente para solicitud de servicios
  (8, 'Taller de Fotografía', '1145678901', 'taller.foto@example.com', 
   'Instructor de fotografía de eventos', '2026-02-20 15:00:00', '2026-02-22 16:16:33'),

  -- Cliente para solicitud de talleres
  (9, 'Groupo Masaje Relajante', '1143334444', 'masajes@example.com', 
   'Profesionales de masajes y wellness', '2026-02-21 11:00:00', '2026-02-22 16:16:33');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES - TABLA PADRE
-- =====================================================================
LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
INSERT INTO `solicitudes` 
  (`id`, `categoria`, `estado`, `es_publico`, `descripcion_corta`, `descripcion_larga`, `id_cliente`, `fecha_creacion`) 
VALUES 
  -- SOLICITUDES DE ALQUILER (4 solicitudes)
  (1, 'ALQUILER', 'Solicitado', 0,
   'Cumpleaños infantil 50 personas',
   'Cumpleaños infantil para una niña de 8 años. Necesitamos inflable, servicio de cocinero y setup básico.',
   1, '2026-02-15 10:00:00'),

  (2, 'ALQUILER', 'Confirmado', 0,
   'Fiesta de 15 años - Servicio completo',
   'Fiesta de 15 años. Contratamos servicio completo con meseras, bartender y sonido profesional.',
   2, '2026-02-16 14:15:00'),

  (3, 'ALQUILER', 'Solicitado', 0,
   'Baby shower 40 personas',
   'Baby shower temático con 40 invitados. Necesitamos inflable de princesa y decoraciones.',
   3, '2026-02-17 11:45:00'),

  (4, 'ALQUILER', 'Pendiente', 0,
   'Asado informal 80 personas',
   'Asado informal con amigos. El cliente trae sus propios alimentos, nosotros proporcionamos ubicación y equipamiento.',
   4, '2026-02-18 16:20:00'),

  -- SOLICITUDES DE BANDAS (3 solicitudes)
  (5, 'BANDAS', 'Confirmado', 1,
   'Reite - Fecha Propia',
   'El tributo a La Renga solicita una fecha propia para realizar su show. Esperan público de 250 personas.',
   5, '2026-02-19 13:00:00'),

  (6, 'BANDAS', 'Confirmado', 1,
   'Las Mentas Show',
   'Banda de rock femenino solicita fecha con formato de show abierto al público general.',
   6, '2026-02-19 10:30:00'),

  (7, 'BANDAS', 'Solicitado', 1,
   'Pateando Bares + Banda Telonera',
   'Rock nacional solicita fecha compartida con banda telonera. Esperan 200 personas.',
   7, '2026-02-20 14:20:00'),

  -- SOLICITUD DE SERVICIOS
  (8, 'SERVICIOS', 'Solicitado', 0,
   'Taller de Fotografía de Eventos',
   'Taller teórico-práctico de fotografía profesional para eventos. 4 horas de instrucción.',
   8, '2026-02-20 15:00:00'),

  -- SOLICITUD DE TALLERES
  (9, 'TALLERES', 'Confirmado', 1,
   'Taller de Masaje Descontracturante',
   'Sesión grupal de masaje descontracturante para empleados. Incluye relajación y técnicas terapéuticas.',
   9, '2026-02-21 11:00:00');
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES DE ALQUILER - TABLA HIJA 1
-- =====================================================================
LOCK TABLES `solicitudes_alquiler` WRITE;
/*!40000 ALTER TABLE `solicitudes_alquiler` DISABLE KEYS */;
INSERT INTO `solicitudes_alquiler` 
  (`id_solicitud`, `tipo_servicio`, `fecha_evento`, `hora_evento`, `duracion`, `cantidad_de_personas`, 
   `precio_basico`, `precio_final`, `tipo_de_evento`, `descripcion`, `estado`) 
VALUES 
  -- Solicitud 1: Cumpleaños infantil (SOLICITADO - sin evento_confirmado)
  (1, 'Cumpleaños infantil', '2026-03-15', '14:00', '4 horas', '50 personas',
   55000.00, 220000.00, 'INFANTILES', 
   'Incluye inflable cocodrilo, cocinera y servicio básico', 'Solicitado'),

  -- Solicitud 2: Fiesta de 15 (CONFIRMADO - genera evento_confirmado)
  (2, 'Fiesta de 15 años', '2026-03-22', '16:00', '6 horas', '60 personas',
   80000.00, 480000.00, 'CON_SERVICIO_DE_MESA',
   'Servicio completo: 2 meseras, bartender, cocinera, sonido profesional', 'Confirmado'),

  -- Solicitud 3: Baby shower (SOLICITADO - sin evento_confirmado)
  (3, 'Baby shower', '2026-03-28', '12:00', '3 horas', '40 personas',
   50000.00, 150000.00, 'BABY_SHOWERS',
   'Inflable princesa, servicio básico de cocinera', 'Solicitado'),

  -- Solicitud 4: Asado informal (PENDIENTE - sin evento_confirmado)
  (4, 'Asado informal', '2026-04-05', '18:00', '5 horas', '80 personas',
   40000.00, 200000.00, 'INFORMALES',
   'Cliente proporciona alimentos, nosotros ubicación y equipamiento básico', 'Pendiente');
/*!40000 ALTER TABLE `solicitudes_alquiler` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES DE FECHAS DE BANDAS - TABLA HIJA 2
-- =====================================================================
LOCK TABLES `solicitudes_fechas_bandas` WRITE;
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` DISABLE KEYS */;
INSERT INTO `solicitudes_fechas_bandas` 
  (`id_solicitud`, `id_banda`, `fecha_evento`, `hora_evento`, `duracion`, `descripcion`, 
   `precio_basico`, `precio_final`, `precio_anticipada`, `precio_puerta`, `cantidad_bandas`, 
   `expectativa_publico`, `bandas_json`, `estado`, `notas_admin`, `creado_en`, `actualizado_en`) 
VALUES 
  -- Solicitud 5: Reite - Fecha Propia (CONFIRMADO)
  (5, 1, '2026-03-30', '22:00', '3 horas',
   'Tributo a La Renga - Fecha propia del artista',
   100000.00, 120000.00, 100000.00, 120000.00, 1, '250 personas',
   '[{"id_banda":1,"nombre":"Reite","orden_show":1,"es_principal":true}]',
   'Confirmado', 'Confirmada el 2026-02-22. Show viernes noche', '2026-02-19 13:00:00', '2026-02-22 14:00:00'),

  -- Solicitud 6: Las Mentas (CONFIRMADO)
  (6, 3, '2026-04-10', '20:00', '2.5 horas',
   'Las Mentas en vivo - Show abierto al público',
   100000.00, 120000.00, 100000.00, 120000.00, 1, '180 personas',
   '[{"id_banda":3,"nombre":"Las Mentas","orden_show":1,"es_principal":true}]',
   'Confirmado', 'Viernes noche. Banda femenina de rock alternativo', '2026-02-19 10:30:00', '2026-02-22 14:00:00'),

  -- Solicitud 7: Pateando Bares (SOLICITADO - sin evento_confirmado)
  (7, 2, '2026-04-18', '21:30', '4 horas',
   'Pateando Bares + banda telonera. Rock nacional en vivo.',
   120000.00, 120000.00, 100000.00, 120000.00, 2, '220 personas',
   '[{"id_banda":2,"nombre":"Pateando Bares","orden_show":1,"es_principal":true},{"id_banda":4,"nombre":"Cumbia Sudaka","orden_show":2,"es_principal":false}]',
   'Solicitado', 'Solicitado por artista. A confirmar con productor', '2026-02-20 14:20:00', '2026-02-20 14:20:00');
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES DE SERVICIOS - TABLA HIJA 3
-- =====================================================================
LOCK TABLES `solicitudes_servicios` WRITE;
/*!40000 ALTER TABLE `solicitudes_servicios` DISABLE KEYS */;
INSERT INTO `solicitudes_servicios` 
  (`id_solicitud`, `tipo_servicio`, `fecha_evento`, `hora_evento`, `duracion`, `precio`) 
VALUES 
  -- Solicitud 8: Taller de Fotografía (SOLICITADO)
  (8, 'Taller Educativo', '2026-03-15', '15:00', '4 horas', 3000.00);
/*!40000 ALTER TABLE `solicitudes_servicios` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES DE TALLERES - TABLA HIJA 4
-- =====================================================================
LOCK TABLES `solicitudes_talleres` WRITE;
/*!40000 ALTER TABLE `solicitudes_talleres` DISABLE KEYS */;
INSERT INTO `solicitudes_talleres` 
  (`id_solicitud`, `nombre_taller`, `fecha_evento`, `hora_evento`, `duracion`, `precio`) 
VALUES 
  -- Solicitud 9: Masaje Descontracturante (CONFIRMADO)
  (9, 'Masaje Descontracturante Grupal', '2026-03-08', '10:00', '90 minutos', 2500.00);
/*!40000 ALTER TABLE `solicitudes_talleres` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES ADICIONALES (Extras contratados)
-- =====================================================================
LOCK TABLES `solicitudes_adicionales` WRITE;
/*!40000 ALTER TABLE `solicitudes_adicionales` DISABLE KEYS */;
INSERT INTO `solicitudes_adicionales` 
  (`id_solicitud`, `adicional_nombre`, `adicional_precio`) 
VALUES 
  -- Solicitud 2 contrató: Mesa extra y 4 sillas
  (2, 'Mesa extra', 5000.00),
  (2, 'Silla extra', 300.00),
  (2, 'Silla extra', 300.00),
  (2, 'Silla extra', 300.00),
  (2, 'Silla extra', 300.00),

  -- Solicitud 1 contrató: Inflable cocodrilo (ya incluido en precio)
  (1, 'Manteles negros con camino blanco', 30000.00);
/*!40000 ALTER TABLE `solicitudes_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- EVENTOS CONFIRMADOS (Generados cuando solicitud estado = Confirmado)
-- =====================================================================
LOCK TABLES `eventos_confirmados` WRITE;
/*!40000 ALTER TABLE `eventos_confirmados` DISABLE KEYS */;
INSERT INTO `eventos_confirmados` 
  (`id`, `id_solicitud`, `tipo_evento`, `tabla_origen`, `nombre_evento`, `descripcion`, 
   `fecha_evento`, `hora_inicio`, `duracion_estimada`, `id_cliente`, `es_publico`, `confirmado_en`) 
VALUES 
  -- Evento 1: Fiesta de 15 años (de solicitud 2)
  (1, 2, 'ALQUILER_SALON', 'solicitudes_alquiler', 
   'Fiesta de 15 años - Luz', 
   'Fiesta de quince años con servicio completo de catering, meseras y sonido profesional.',
   '2026-03-22', '16:00:00', '6 horas', 2, 0, '2026-02-22 14:00:00'),

  -- Evento 2: Reite - Fecha Propia (de solicitud 5)
  (2, 5, 'BANDA', 'solicitudes_fechas_bandas',
   'Reite - Tributo a La Renga',
   'Show completo del tributo a La Renga. Viernes noche. Fecha propia confirmada.',
   '2026-03-30', '22:00:00', '3 horas', 5, 1, '2026-02-22 14:00:00'),

  -- Evento 3: Las Mentas Show (de solicitud 6)
  (3, 6, 'BANDA', 'solicitudes_fechas_bandas',
   'Las Mentas en Vivo - Rock Femenino',
   'Show abierto al público de la banda Las Mentas. Rock alternativo de buena calidad.',
   '2026-04-10', '20:00:00', '2.5 horas', 6, 1, '2026-02-22 14:00:00'),

  -- Evento 4: Taller de Masaje (de solicitud 9)
  (4, 9, 'TALLER', 'solicitudes_talleres',
   'Taller de Masaje Descontracturante',
   'Sesión grupal de masaje descontracturante. Técnicas relajantes y terapéuticas.',
   '2026-03-08', '10:00:00', '90 minutos', 9, 1, '2026-02-22 14:00:00');
/*!40000 ALTER TABLE `eventos_confirmados` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- EVENTOS BANDAS INVITADAS (Relación many-to-many futura)
-- =====================================================================
LOCK TABLES `eventos_bandas_invitadas` WRITE;
/*!40000 ALTER TABLE `eventos_bandas_invitadas` DISABLE KEYS */;
-- Tabla lista para futuras bandas invitadas
/*!40000 ALTER TABLE `eventos_bandas_invitadas` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- PERSONAL ASIGNADO A EVENTOS
-- =====================================================================
LOCK TABLES `eventos_personal` WRITE;
/*!40000 ALTER TABLE `eventos_personal` DISABLE KEYS */;
-- Datos listos para asignaciones de personal confirmadas
/*!40000 ALTER TABLE `eventos_personal` ENABLE KEYS */;
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40101 SET SQL_NOTES=@OLD_SQL_NOTES */;
