/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.25-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: tdc_db
-- ------------------------------------------------------
-- Server version10.6.25-MariaDB-ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- =============================================================================
-- DATOS TRANSACCIONALES - TABLA STRUCTURE DEFINIDA EN 01_schema.sql
-- =============================================================================
-- Estos archivos contienen datos de prueba para las tablas definidas en 01_schema.sql
-- =============================================================================

--
-- Dumping data for table `solicitudes`
--

LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
INSERT INTO `solicitudes` (`id_solicitud`, `categoria`, `id_cliente`, `id_usuario_creador`, `fecha_creacion`, `estado`, `es_publico`, `descripcion_corta`, `descripcion_larga`, `url_flyer`, `fecha_evento`, `hora_inicio`, `duracion_minutos`, `hora_fin`, `fecha_alternativa`, `actualizado_en`) VALUES
(4,'BANDAS',4,NULL,'2026-03-13 04:29:21','Confirmado',1,'Fecha Tributo','Fecha con bandas tributo, a jovenes pordioseros, a la renga y a los redondos','/uploads/flyers/solicitud_4.jpg','2026-05-09','21:00:00',390,'04:30:00',NULL,'2026-04-01 02:07:15'),
(5,'BANDAS',5,NULL,'2026-03-13 04:29:21','Confirmado',1,'Bandas de rock, produce Mati','2 bandas de rock','/uploads/flyers/solicitud_5.jpeg','2026-05-02','21:00:00',360,'04:00:00',NULL,'2026-04-01 02:39:32'),
(6,'BANDAS',4,NULL,'2026-03-13 04:29:21','Confirmado',1,'Termidor Fest, produce Seba','Bandas Metaleras con tributo a Judas.','/uploads/flyers/solicitud_6.jpeg','2026-04-18','21:00:00',450,'28:30:00',NULL,'2026-04-01 02:06:35'),
(7,'SERVICIOS',1,NULL,'2026-03-13 04:29:21','Solicitado',0,'Servicio de Fotografía para Eventos','Servicio de Fotografía para Eventos. 4 horas mínimo.',NULL,NULL,NULL,NULL,NULL,NULL,'2026-03-13 04:29:21'),
(8,'TALLERES',2,NULL,'2026-03-13 04:29:21','Confirmado',1,'Taller de Dibujo','Dibujos y arte en mesas.',NULL,'2026-04-22','10:00:00',90,NULL,NULL,'2026-03-13 04:29:21');
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;


/*
--
-- Dumping data for table `solicitudes_adicionales`
--

LOCK TABLES `solicitudes_adicionales` WRITE;
/*!40000 ALTER TABLE `solicitudes_adicionales` DISABLE KEYS */;
INSERT INTO `solicitudes_adicionales` (`id`, `id_solicitud_alquiler`, `adicional_nombre`, `adicional_precio`, `creado_en`) VALUES
(1,2,'Mesa extra',5000.00,'2026-03-13 04:29:21'),
(2,2,'Sillas extras (4)',1200.00,'2026-03-13 04:29:21'),
(3,2,'Servicio de fotografía',8000.00,'2026-03-13 04:29:21'),
(4,1,'Manteles personalizados',30000.00,'2026-03-13 04:29:21');
UNLOCK TABLES;
*/

--
-- Dumping data for table `solicitudes_fechas_bandas`
--

LOCK TABLES `solicitudes_fechas_bandas` WRITE;
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` DISABLE KEYS */;
INSERT INTO `solicitudes_fechas_bandas` (`id_solicitud`, `id_banda`, `precio_basico`, `precio_final`, `precio_anticipada`, `precio_puerta`, `cantidad_bandas`, `expectativa_publico`, `bandas_json`, `fecha_alternativa`, `notas_admin`, `id_evento_generado`) VALUES
(4,1,100000.00,120000.00,8000.00,15000.00,3,'200','[{"id_banda":36,"nombre":"Pánico","orden_show":0,"es_principal":true,"hora_inicio":"23:00"},{"id_banda":1,"nombre":"Reite","orden_show":1,"es_principal":false,"hora_inicio":"00:30"},{"id_banda":35,"nombre":"Cruz Diablo","orden_show":2,"es_principal":false,"hora_inicio":"02:00"}]',NULL,NULL,NULL),
(5,3,100000.00,120000.00,7000.00,7000.00,4,'200','[{"id_banda":34,"nombre":"Clasicos Matados","orden_show":0,"es_principal":true,"hora_inicio":"23:00"},{"id_banda":24,"nombre":"Le Debes Plata a la Banda","orden_show":1,"es_principal":false,"hora_inicio":"12:00"},{"id_banda":39,"nombre":"Descanso Eterno","orden_show":2,"es_principal":false,"hora_inicio":"01:00"},{"id_banda":10,"nombre":"Nomade 73","orden_show":3,"es_principal":false,"hora_inicio":"03:00"}]',NULL,NULL,NULL),
(6,2,120000.00,120000.00,5000.00,5000.00,3,'200','[{"id_banda":29,"nombre":"India Madre","orden_show":0,"es_principal":true,"hora_inicio":"22:00"},{"id_banda":33,"nombre":"KorGue","orden_show":1,"es_principal":false,"hora_inicio":"23:00"},{"id_banda":27,"nombre":"Defensores de la fe","orden_show":2,"es_principal":false,"hora_inicio":"12:00"}]',NULL,NULL,5);
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` (`id_cliente`, `id_usuario`, `nombre`, `apellido`, `telefono`, `email`, `notas`, `creado_por_id_usuario`, `activo`, `creado_en`, `actualizado_en`) VALUES

  (1,NULL,'Juan','Pérez','+5491111111','juan@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),
  (2,NULL,'María','González','+5491111112','maria@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),
  (3,NULL,'Pedro','López','+5491111113','pedro@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),
  (4,NULL,'Rodrigo','Villalba','1122757887','villalbarodrigo2009@gmail.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),
  (5,NULL,'Carlos','Martínez','+5491111115','carlos@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),
  (6,NULL,'Bruno',NULL,NULL,NULL,NULL,NULL,1,'2026-03-17 23:43:07','2026-03-17 23:43:07'),
  (7,1,'Templo','User',NULL,'temploclaypole@gmail.com',NULL,1,1,'2026-03-17 23:43:07','2026-03-17 23:43:07'),
  (8,NULL,'Lucho','Reite','1155001122',NULL,'Rol en banda: Manager (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),
  (9,NULL,'Marco','Sández','1155003344','pateando.bares@gmail.com','Rol en banda: Productor (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),
  (10,NULL,'Sol','Rodríguez','1155005566','lasmentas@gmail.com','Rol en banda: Vocalista/Manager (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),
  (11,NULL,'Carlos','Mendoza','1144445566','cumbia.sudaka@gmail.com','Rol en banda: Líder (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),
  (12,NULL,'Test','Binlog',NULL,'test@binlog.com',NULL,NULL,1,'2026-03-31 17:09:25','2026-03-31 17:09:25'),
  (13,NULL,'Seba',NULL,NULL,NULL,NULL,NULL,1,'2026-03-31 17:11:03','2026-03-31 17:11:03');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes_servicios`
--

LOCK TABLES `solicitudes_servicios` WRITE;
/*!40000 ALTER TABLE `solicitudes_servicios` DISABLE KEYS */;
INSERT INTO `solicitudes_servicios` (`id_solicitud_servicio`, `id_solicitud`, `tipo_servicio`, `fecha_evento`, `hora_evento`, `precio`) VALUES

  (1,7,'Taller Educativo','2026-03-15','15:00:00',3000.00);
/*!40000 ALTER TABLE `solicitudes_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes_talleres`
--

LOCK TABLES `solicitudes_talleres` WRITE;
/*!40000 ALTER TABLE `solicitudes_talleres` DISABLE KEYS */;
INSERT INTO `solicitudes_talleres` (`id_solicitud_taller`, `id_solicitud`, `nombre_taller`, `fecha_evento`, `hora_evento`, `precio`) VALUES

  (1,8,'Masaje Descontracturante Grupal','2026-04-22','10:00:00',2500.00);
/*!40000 ALTER TABLE `solicitudes_talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `turnos_servicios`
--

LOCK TABLES `turnos_servicios` WRITE;
/*!40000 ALTER TABLE `turnos_servicios` DISABLE KEYS */;
/*!40000 ALTER TABLE `turnos_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes`
--

LOCK TABLES `eventos_confirmados` WRITE;
/*!40000 ALTER TABLE `eventos_confirmados` DISABLE KEYS */;
INSERT INTO `eventos_confirmados` (`id`, `id_solicitud`, `tipo_evento`, `tabla_origen`, `nombre_evento`, `descripcion_corta`, `descripcion`, `fecha_evento`, `hora_inicio`, `duracion_minutos`, `url_flyer`, `es_publico`, `activo`, `id_cliente`, `confirmado_en`) VALUES
(1,4,'BANDA','solicitudes_fechas_bandas','Fecha Tributo','Fecha con bandas tributo, a jovenes pordioseros, a la renga y a los redondos','Fecha con bandas tributo, a jovenes pordioseros, a la renga y a los redondos','2026-05-09','21:00:00',390,'/uploads/flyers/solicitud_4.jpg',1,1,4,'2026-04-01 02:07:15'),
(2,5,'BANDA','solicitudes_fechas_bandas','Bandas de rock, produce Mati','2 bandas de rock','2 bandas de rock','2026-05-02','21:00:00',360,'/uploads/flyers/solicitud_5.jpeg',1,1,5,'2026-04-01 02:39:32'),
(3,6,'BANDA','solicitudes_fechas_bandas','Termidor Fest, produce Seba','Bandas Metaleras con tributo a Judas.','Bandas Metaleras con tributo a Judas.','2026-04-18','21:00:00',450,'/uploads/flyers/solicitud_6.jpeg',1,1,4,'2026-04-01 02:06:35'),
(4,8,'TALLER','solicitudes_talleres','Taller de Dibujo','Dibujos y arte en mesas.','Dibujos y arte en mesas.','2026-04-22','10:00:00',90,NULL,1,1,2,'2026-03-13 04:29:21');
/*!40000 ALTER TABLE `eventos_confirmados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `eventos_lineup`
--

LOCK TABLES `eventos_lineup` WRITE;
/*!40000 ALTER TABLE `eventos_lineup` DISABLE KEYS */;
INSERT INTO `eventos_lineup` (`id_evento_confirmado`, `id_banda`, `nombre_banda`, `orden_show`, `es_principal`, `es_solicitante`, `hora_inicio`, `hora_fin`, `duracion_minutos`, `estado`) VALUES
-- Evento 1: Fecha Tributo (Solicitud 4)
(1,36,'Pánico',0,1,1,'23:00:00','00:30:00',90,'confirmada'),
(1,1,'Reite',1,0,0,'00:30:00','02:00:00',90,'confirmada'),
(1,35,'Cruz Diablo',2,0,0,'02:00:00','04:30:00',150,'confirmada'),
-- Evento 2: Bandas de rock, produce Mati (Solicitud 5)
(2,34,'Clasicos Matados',0,1,1,'23:00:00','00:30:00',90,'confirmada'),
(2,24,'Le Debes Plata a la Banda',1,0,0,'00:30:00','01:00:00',30,'confirmada'),
(2,39,'Descanso Eterno',2,0,0,'01:00:00','03:00:00',120,'confirmada'),
(2,10,'Nomade 73',3,0,0,'03:00:00','04:00:00',60,'confirmada'),
-- Evento 3: Termidor Fest (Solicitud 6)
(3,29,'India Madre',0,1,1,'22:00:00','23:00:00',60,'confirmada'),
(3,33,'KorGue',1,0,0,'23:00:00','12:00:00',780,'confirmada'),
(3,27,'Defensores de la fe',2,0,0,'12:00:00','13:30:00',90,'confirmada');
/*!40000 ALTER TABLE `eventos_lineup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` (`id_usuario`, `email`, `password_hash`, `nombre`, `rol`, `activo`, `proveedor_oauth`, `id_oauth`, `token_oauth`, `foto_url`, `creado_en`, `actualizado_en`) VALUES

  (1,'temploclaypole@gmail.com','$2a$10$d3C9.uYqlJaofNGk3Nc0AuKm3KN9sWhIQhuZCv67j0F9Jc5VsMm2W','Templo User','staff',1,'google','107386203679475316318',NULL,'https://lh3.googleusercontent.com/a/ACg8ocK9dwZoBaeK4ng93n4rTE_TLWgqd-VSfex5hfKVObbt06w0oIHl=s96-c','2026-03-13 04:29:21','2026-03-13 12:25:56'),
  (2,'villalbarodrigo2009@gmail.com','$2a$10$xT4ERvVKWABJlrrYPsJXWOZHTVsZtYp1uCm52pM23iHbdmAUlHlyu','Rodrigo Villalba','admin',1,'google','117318714094755139695',NULL,'https://lh3.googleusercontent.com/a/ACg8ocJGyiIz4tnQI40z1wg81HbfIeiPnmIl49oegEjoq5aFm0k-951Emg=s96-c','2026-03-13 04:29:21','2026-03-18 12:23:51');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40101 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-10  2:52:36
