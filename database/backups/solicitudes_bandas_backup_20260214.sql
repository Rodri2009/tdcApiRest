/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.24-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: tdc_db
-- ------------------------------------------------------
-- Server version	10.6.24-MariaDB-ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `solicitudes_bandas`
--

DROP TABLE IF EXISTS `solicitudes_bandas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_bandas` (
  `id_solicitud` int(11) NOT NULL COMMENT 'FK a solicitudes.id - NO es AUTO_INCREMENT',
  `tipo_de_evento` varchar(50) NOT NULL DEFAULT 'FECHA_BANDAS',
  `tipo_servicio` varchar(255) DEFAULT NULL,
  `fecha_hora` datetime DEFAULT NULL,
  `fecha_evento` date DEFAULT NULL,
  `hora_evento` varchar(20) DEFAULT NULL,
  `duracion` varchar(100) DEFAULT NULL,
  `cantidad_de_personas` varchar(100) DEFAULT NULL,
  `precio_basico` decimal(10,2) DEFAULT NULL,
  `precio_final` decimal(10,2) DEFAULT NULL,
  `nombre_completo` varchar(255) DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` varchar(50) DEFAULT 'Solicitado',
  `fingerprintid` varchar(255) DEFAULT NULL,
  `id_banda` int(11) DEFAULT NULL COMMENT 'FK si la banda ya existe en catálogo',
  `genero_musical` varchar(100) DEFAULT NULL,
  `formacion_json` text DEFAULT NULL COMMENT 'JSON con instrumentos: [{instrumento, cantidad, notas}]',
  `instagram` varchar(255) DEFAULT NULL,
  `facebook` varchar(255) DEFAULT NULL,
  `youtube` varchar(500) DEFAULT NULL,
  `spotify` varchar(500) DEFAULT NULL,
  `otras_redes` text DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `contacto_rol` varchar(100) DEFAULT NULL,
  `fecha_alternativa` date DEFAULT NULL,
  `invitadas_json` text DEFAULT NULL COMMENT 'JSON: [{nombre, id_banda?, confirmada}]',
  `cantidad_bandas` int(11) DEFAULT 1,
  `precio_puerta_propuesto` decimal(10,2) DEFAULT NULL,
  `expectativa_publico` varchar(100) DEFAULT NULL,
  `notas_admin` text DEFAULT NULL,
  `id_evento_generado` int(11) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_solicitud`),
  KEY `idx_tipo` (`tipo_de_evento`),
  KEY `idx_fecha` (`fecha_evento`),
  KEY `idx_estado` (`estado`),
  KEY `idx_banda` (`id_banda`),
  CONSTRAINT `solicitudes_bandas_ibfk_1` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_bandas_ibfk_2` FOREIGN KEY (`id_banda`) REFERENCES `bandas_artistas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_bandas`
--

LOCK TABLES `solicitudes_bandas` WRITE;
/*!40000 ALTER TABLE `solicitudes_bandas` DISABLE KEYS */;
INSERT INTO `solicitudes_bandas` VALUES (7,'FECHA_BANDAS',NULL,'2026-02-14 19:50:09','2025-12-20','21:00','5 horas','150',3000.00,NULL,NULL,NULL,NULL,'Gran noche de rock nacional con Tributo a La Renga','Confirmado',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,'2026-02-14 19:50:09','2026-02-14 19:50:09'),(8,'FECHA_BANDAS',NULL,'2026-02-14 19:50:09','2025-12-21','20:00','5 horas','100',2500.00,NULL,NULL,NULL,NULL,'Noche de jazz con los mejores músicos de la zona sur','Confirmado',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,'2026-02-14 19:50:09','2026-02-14 19:50:09'),(9,'FECHA_BANDAS',NULL,'2026-02-14 19:50:09','2025-12-28','22:00','6 horas','180',2000.00,NULL,NULL,NULL,NULL,'La mejor cumbia para cerrar el año bailando!','Confirmado',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,'2026-02-14 19:50:09','2026-02-14 19:50:09'),(10,'FECHA_BANDAS',NULL,'2026-02-14 19:50:09','2026-03-15','20:00','4 horas','120',2800.00,NULL,NULL,NULL,NULL,'Noche de rock con bandas emergentes','Pendiente',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,'2026-02-14 19:50:09','2026-02-14 19:50:09'),(11,'FECHA_BANDAS',NULL,'2026-02-14 19:50:09','2026-04-10','21:00','3 horas','200',3500.00,NULL,NULL,NULL,NULL,'Tributo a las mejores bandas de rock','Confirmado',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,'2026-02-14 19:50:09','2026-02-14 19:50:09');
/*!40000 ALTER TABLE `solicitudes_bandas` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-14 20:23:10
