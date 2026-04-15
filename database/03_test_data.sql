/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.25-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: tdc_db
-- ------------------------------------------------------
-- Server version	10.6.25-MariaDB-ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `eventos_confirmados`
--

LOCK TABLES `eventos_confirmados` WRITE;
/*!40000 ALTER TABLE `eventos_confirmados` DISABLE KEYS */;
INSERT INTO `eventos_confirmados` (`id`, `id_solicitud`, `tipo_evento`, `tabla_origen`, `nombre_evento`, `descripcion_corta`, `descripcion`, `fecha_evento`, `hora_inicio`, `duracion_minutos`, `url_flyer`, `es_publico`, `activo`, `id_cliente`, `confirmado_en`, `actualizado_en`, `cancelado_en`) VALUES (1,2,'ALQUILER_SALON','solicitudes_alquiler','Fiesta de 15 años - Luz',NULL,'Fiesta de quince años con servicio completo de catering, meseras y sonido profesional.','2026-03-22','16:00:00',360,NULL,0,1,2,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(2,4,'BANDA','solicitudes_fechas_bandas','Fecha Tributo','Fecha Tributo','Show completo del tributo a La Renga. Viernes noche. Fecha propia confirmada.','2026-05-09','22:00:00',390,'/uploads/flyers/solicitud_4.jpg',1,1,1,'2026-02-22 14:00:00','2026-04-01 02:07:15',NULL),(3,5,'BANDA','solicitudes_fechas_bandas','Bandas tributo e invitadas','Bandas tributo e invitadas','Show abierto al público de la banda Las Mentas. Rock alternativo de buena calidad.','2026-04-11','21:00:00',1080,'/uploads/flyers/solicitud_5.jpeg',1,1,5,'2026-02-22 14:00:00','2026-04-01 02:39:32',NULL),(4,8,'TALLER','solicitudes_talleres','Taller de Masaje Descontracturante',NULL,'Sesión grupal de masaje descontracturante. Técnicas relajantes y terapéuticas.','2026-03-08','10:00:00',90,'/uploads/flyers/solicitud_4.jpg',1,1,2,'2026-02-22 14:00:00','2026-04-01 00:43:58',NULL),(5,6,'BANDA','solicitudes_fechas_bandas','Termidor Fest','Termidor Fest','Termidor Fest','2026-04-18','21:00:00',450,'/uploads/flyers/solicitud_6.jpeg',1,1,4,'2026-03-29 20:12:24','2026-04-01 02:06:35',NULL);
/*!40000 ALTER TABLE `eventos_confirmados` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-10  2:52:36
