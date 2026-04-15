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
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `asistencias_talleres`
--

DROP TABLE IF EXISTS `asistencias_talleres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `asistencias_talleres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `inscripcion_id` int(11) NOT NULL,
  `fecha_clase` date NOT NULL,
  `asistio` tinyint(1) DEFAULT 1,
  `notas` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inscripcion` (`inscripcion_id`),
  KEY `idx_fecha` (`fecha_clase`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asistencias_talleres`
--

LOCK TABLES `asistencias_talleres` WRITE;
/*!40000 ALTER TABLE `asistencias_talleres` DISABLE KEYS */;
/*!40000 ALTER TABLE `asistencias_talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bandas_artistas`
--

DROP TABLE IF EXISTS `bandas_artistas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bandas_artistas` (
  `id_banda` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL COMMENT 'Nombre de la banda o artista',
  `genero_musical` varchar(100) DEFAULT NULL COMMENT 'Rock, Jazz, Cumbia, etc.',
  `bio` text DEFAULT NULL COMMENT 'Biografía o descripción',
  `instagram` varchar(255) DEFAULT NULL,
  `facebook` varchar(255) DEFAULT NULL,
  `twitter` varchar(255) DEFAULT NULL,
  `tiktok` varchar(255) DEFAULT NULL,
  `web_oficial` varchar(500) DEFAULT NULL,
  `youtube` varchar(500) DEFAULT NULL COMMENT 'Canal o video destacado',
  `spotify` varchar(500) DEFAULT NULL COMMENT 'Perfil o playlist',
  `descripcion` text DEFAULT NULL COMMENT 'Descripción detallada o características de la banda',
  `logo_url` varchar(500) DEFAULT NULL COMMENT 'URL del logo subido',
  `foto_prensa_url` varchar(500) DEFAULT NULL COMMENT 'Foto de prensa',
  `contacto_rol` varchar(100) DEFAULT NULL COMMENT 'Manager, Líder, Prensa, etc.',
  `id_cliente` int(11) DEFAULT NULL COMMENT 'FK opcional a clientes.id_cliente si la banda se registró como cliente',
  `verificada` tinyint(1) DEFAULT 0 COMMENT '1=Verificada por admin',
  `activa` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_banda`),
  KEY `idx_nombre` (`nombre`),
  KEY `idx_genero` (`genero_musical`),
  KEY `idx_activa` (`activa`),
  KEY `idx_id_cliente` (`id_cliente`),
  CONSTRAINT `fk_bandas_artistas_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bandas_artistas`
--

LOCK TABLES `bandas_artistas` WRITE;
/*!40000 ALTER TABLE `bandas_artistas` DISABLE KEYS */;
INSERT INTO `bandas_artistas` VALUES (1,'Reite','Rock / Tributo','Tributo oficial a La Renga','@reitebanda','https://www.facebook.com/reitebanda','@reitebanda',NULL,'https://www.reitebanda.com','https://www.youtube.com/c/ReiteBanda','https://open.spotify.com/artist/reite',NULL,'/uploads/bandas/logo_reite.jpg',NULL,'Manager',8,1,1,'2026-03-13 04:29:21','2026-03-18 01:31:13'),(2,'Pateando Bares','Rock Nacional','Rock nacional con trayectoria','@pateando.bares','https://www.facebook.com/pateandobaresoficial','@pateandooficial','@pateandooficial','https://www.pateandobares.com.ar','https://www.youtube.com/pateandobaresoficial','https://open.spotify.com/artist/pateandooficial',NULL,NULL,NULL,'Productor',9,1,1,'2026-03-13 04:29:21','2026-03-18 01:31:13'),(3,'Las Mentas','Rock Alternativo','Banda femenina de rock alternativo','@lasmentasbanda','https://www.facebook.com/lasmentasbanda','@lasmentas_rock','@lasmentasbanda','https://www.lasmentas.com.ar','https://www.youtube.com/lasmentasbanda','https://open.spotify.com/artist/lasmentas',NULL,'/uploads/bandas/logo_las_mentas.jpeg',NULL,'Vocalista/Manager',10,1,1,'2026-03-13 04:29:21','2026-03-18 01:31:13'),(4,'Cumbia Sudaka','Cumbia / Tropical','Banda telonera festiva','@cumbiasudaka','https://www.facebook.com/cumbiasudaka','@cumbiasudaka',NULL,NULL,'https://www.youtube.com/cumbiasudaka','https://open.spotify.com/artist/cumbiasudaka',NULL,NULL,NULL,'Líder',11,1,1,'2026-03-13 04:29:21','2026-03-18 01:31:13'),(5,'Horcas','Heavy Metal / Thrash Metal','Banda histórica del heavy metal argentino fundada en 1988 por Osvaldo Civile, ex guitarrista de V8. Referente del metal nacional con extensa discografía y giras por todo el país.','@horcasoficial',NULL,NULL,NULL,NULL,'https://www.youtube.com/@horcasoficial','https://open.spotify.com/artist/horcas',NULL,'/uploads/bandas/logo_horcas.png',NULL,NULL,6,1,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(6,'Superlógico','Rock / Tributo a Patricio Rey','Banda tributo a Patricio Rey y sus Redonditos de Ricota con fuerte presencia en el circuito rockero del conurbano y CABA.','@superlogicotributo',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_superlogico.jpeg',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-27 15:12:51'),(7,'Pier','Rock Nacional','Banda argentina de rock formada en los años 90, conocida por canciones populares dentro del rock barrial.','@pieroficial',NULL,NULL,NULL,NULL,'https://www.youtube.com/@pieroficial','https://open.spotify.com/artist/pier',NULL,NULL,NULL,NULL,6,1,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(8,'Rey Garufa','Rock / Tributo Redondos','Banda tributo a Patricio Rey y sus Redonditos de Ricota con fuerte presencia en el circuito de bares y festivales rockeros.','@reygarufatributo',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(9,'Willy Quiroga','Rock / Hard Rock','Proyecto solista de Willy Quiroga, histórico bajista y cantante de Vox Dei, uno de los pioneros del rock argentino.','@willyquirogaoficial',NULL,NULL,NULL,NULL,'https://www.youtube.com/@willyquiroga','https://open.spotify.com/artist/willyquiroga',NULL,NULL,NULL,NULL,6,1,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(10,'Nomade 73','Rock Nacional','Banda de rock barrial del conurbano bonaerense con influencias del rock clásico argentino.','@nomade73',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_nomade_73.jpeg',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(11,'Territorio Caníbal','Hardcore / Metal','Banda de hardcore metal del circuito under del Gran Buenos Aires con presentaciones frecuentes en festivales independientes.','@territoriocanibal',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_territorio_canibal.png',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(12,'Ojo Animal','Stoner Rock / Hard Rock','Banda de stoner rock del circuito under argentino con influencias del hard rock clásico.','@ojoanimalband',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(13,'Falsa Euforia','Punk','Proyecto independiente del conurbano bonaerense dentro de la escena alternativa.','@falsaeuforia',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_falsa_euforia.jpg',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(14,'Cronorock','Rock Nacional','Banda independiente de rock nacional con presentaciones en bares y festivales under.','@cronorock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_cronorock.jpeg',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(15,'Ratucha','Punk Rock','Banda punk del circuito under del conurbano bonaerense con fuerte presencia en festivales autogestionados.','@ratuchapunk',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(16,'La Monky','Rock / Funk Rock','Banda independiente del circuito rockero del conurbano con influencias funk y rock alternativo.','@lamonkybanda',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_la_monky.jpg',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(17,'Raros Ratones','Rock Alternativo','Banda emergente de rock alternativo dentro de la escena under del Gran Buenos Aires.','@rarosratones',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(18,'La Locomotora','Hard Rock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_la_locomotora.png',NULL,NULL,6,0,1,'2026-03-13 13:02:06','2026-03-18 01:20:40'),(19,'Chat Tuchat',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_chat_tuchat.png',NULL,NULL,6,0,1,'2026-03-13 13:11:11','2026-03-18 01:20:40'),(20,'Capitan',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_capitan.png',NULL,NULL,6,0,1,'2026-03-13 13:11:50','2026-03-18 01:20:40'),(21,'El Centésimo Mono',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_el_centesimo_mono.jpeg',NULL,NULL,6,0,1,'2026-03-13 13:15:16','2026-03-18 01:20:40'),(22,'Industria','Punk',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_industria.jpg',NULL,NULL,6,0,1,'2026-03-13 13:17:24','2026-03-18 01:20:40'),(23,'Guarilo',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_guarilo.png',NULL,NULL,6,0,1,'2026-03-13 14:21:54','2026-03-18 01:20:40'),(24,'Le Debes Plata a la Banda','Rock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_le_debes_plata_a_la_banda.jpeg',NULL,NULL,6,0,1,'2026-03-13 14:23:24','2026-03-18 01:20:40'),(25,'Tricota','Rock',NULL,'@rocktricota',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_tricota.jpeg',NULL,NULL,6,0,1,'2026-03-17 23:26:31','2026-03-17 23:43:14'),(26,'Nueva banda de prueba','Rap',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-17 23:39:44','2026-03-17 23:43:14'),(27,'Defensores de la fe','Metal',NULL,'@defensoresdelafe.ok',NULL,NULL,NULL,NULL,NULL,NULL,'Banda metal tributo a Judas Priest','/uploads/bandas/logo_defensores_de_la_fe.jpg',NULL,NULL,NULL,0,1,'2026-03-26 19:21:55','2026-03-27 15:12:51'),(29,'India Madre','Metal',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,1,'2026-03-26 19:24:53','2026-03-26 19:24:53'),(32,'Psycophobia','Thrash Metal',NULL,'@psycophobia_thrash',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_psycophobia.png',NULL,NULL,NULL,0,1,'2026-03-26 19:41:14','2026-03-27 15:12:51'),(33,'KorGue','Metal Punk',NULL,'@korgue_metalpunk',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_korgue.png',NULL,NULL,NULL,0,1,'2026-03-26 19:44:06','2026-03-27 15:12:51');
/*!40000 ALTER TABLE `bandas_artistas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bandas_formacion`
--

DROP TABLE IF EXISTS `bandas_formacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bandas_formacion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_banda` int(11) NOT NULL,
  `nombre_integrante` varchar(255) DEFAULT NULL COMMENT 'Nombre del músico (opcional)',
  `id_instrumento` int(11) NOT NULL COMMENT 'FK a catalogo_instrumentos',
  `es_lider` tinyint(1) DEFAULT 0 COMMENT '1=Es el líder/frontman',
  `notas` varchar(255) DEFAULT NULL COMMENT 'Ej: Guitarra rítmica, Segunda voz',
  PRIMARY KEY (`id`),
  KEY `idx_banda` (`id_banda`),
  KEY `idx_instrumento` (`id_instrumento`),
  CONSTRAINT `bandas_formacion_ibfk_1` FOREIGN KEY (`id_banda`) REFERENCES `bandas_artistas` (`id_banda`) ON DELETE CASCADE,
  CONSTRAINT `bandas_formacion_ibfk_2` FOREIGN KEY (`id_instrumento`) REFERENCES `catalogo_instrumentos` (`id_instrumento`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bandas_formacion`
--

LOCK TABLES `bandas_formacion` WRITE;
/*!40000 ALTER TABLE `bandas_formacion` DISABLE KEYS */;
INSERT INTO `bandas_formacion` VALUES (1,3,NULL,7,0,NULL),(2,3,NULL,3,0,NULL),(3,3,NULL,5,0,NULL),(4,3,NULL,8,0,NULL),(5,3,NULL,1,0,NULL),(6,18,NULL,3,0,NULL),(7,18,NULL,5,0,NULL),(8,18,NULL,8,0,NULL),(9,18,NULL,1,0,NULL),(10,25,NULL,8,0,NULL),(11,25,NULL,5,0,NULL),(12,25,NULL,1,0,NULL),(13,25,NULL,3,0,NULL),(14,26,NULL,24,0,NULL);
/*!40000 ALTER TABLE `bandas_formacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalogo_instrumentos`
--

DROP TABLE IF EXISTS `catalogo_instrumentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalogo_instrumentos` (
  `id_instrumento` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `categoria` varchar(50) DEFAULT NULL COMMENT 'Cuerdas, Percusión, Vientos, Electrónico, Voz',
  `icono` varchar(50) DEFAULT NULL COMMENT 'Nombre del icono (fa-guitar, etc.)',
  PRIMARY KEY (`id_instrumento`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalogo_instrumentos`
--

LOCK TABLES `catalogo_instrumentos` WRITE;
/*!40000 ALTER TABLE `catalogo_instrumentos` DISABLE KEYS */;
INSERT INTO `catalogo_instrumentos` VALUES (1,'Voz','Voz','fa-microphone'),(2,'Guitarra Acústica','Cuerdas','fa-guitar'),(3,'Guitarra Eléctrica','Cuerdas','fa-guitar'),(4,'Bajo Acústico','Cuerdas',NULL),(5,'Bajo Eléctrico','Cuerdas',NULL),(6,'Teclados','Electrónico','fa-keyboard'),(7,'Piano','Electrónico',NULL),(8,'Batería','Percusión','fa-drum'),(9,'Percusión Latina','Percusión',NULL),(10,'Violín','Cuerdas',NULL),(11,'Cello','Cuerdas',NULL),(12,'Flauta','Vientos',NULL),(13,'Saxofón','Vientos',NULL),(14,'Trompeta','Vientos',NULL),(15,'Trombón','Vientos',NULL),(16,'Armónica','Vientos',NULL),(17,'Acordeón','Electrónico',NULL),(18,'Boongos','Percusión',NULL),(19,'Congas','Percusión',NULL),(20,'Djembe','Percusión',NULL),(21,'Caja China','Percusión',NULL),(22,'Shaker','Percusión',NULL),(23,'Pandero','Percusión',NULL),(24,'Arpa','Cuerdas',NULL);
/*!40000 ALTER TABLE `catalogo_instrumentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalogo_roles`
--

DROP TABLE IF EXISTS `catalogo_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalogo_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalogo_roles`
--

LOCK TABLES `catalogo_roles` WRITE;
/*!40000 ALTER TABLE `catalogo_roles` DISABLE KEYS */;
INSERT INTO `catalogo_roles` VALUES (1,'Encargada','Responsable general del evento',1,'2026-02-22 16:16:33'),(2,'Cocinera','Preparación de alimentos',1,'2026-02-22 16:16:33'),(3,'Puerta','Recepción de invitados',1,'2026-02-22 16:16:33'),(4,'Mesera','Servicio de mesas',1,'2026-02-22 16:16:33'),(5,'Ayudante de cocina','Asistente en cocina',1,'2026-02-22 16:16:33'),(6,'Limpieza','Limpieza del salón',1,'2026-02-22 16:16:33'),(7,'Depiladora','Servicio de depilación',1,'2026-02-22 16:16:33'),(8,'Bartender','Manejo completo del Servicio de bar',1,'2026-02-22 16:16:33'),(9,'Sonido','Técnico de sonido',1,'2026-02-22 16:16:33'),(10,'DJ','Disc Jockey',1,'2026-02-22 16:16:33'),(11,'Seguridad','Personal de seguridad',1,'2026-02-22 16:16:33');
/*!40000 ALTER TABLE `catalogo_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id_cliente` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) DEFAULT NULL COMMENT 'FK a usuarios.id_usuario - NULL si creado por staff sin usuario asignado',
  `nombre` varchar(255) DEFAULT NULL,
  `apellido` varchar(255) DEFAULT NULL COMMENT 'Separado del nombre para facilitar búsquedas',
  `telefono` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL COMMENT 'Copia de usuarios.email para queries rápidas',
  `notas` text DEFAULT NULL,
  `creado_por_id_usuario` int(11) DEFAULT NULL COMMENT 'ID del usuario admin/staff que lo creó. NULL = el cliente se registró solo',
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `uk_id_usuario` (`id_usuario`),
  KEY `idx_email` (`email`),
  KEY `idx_activo` (`activo`),
  KEY `fk_clientes_creado_por` (`creado_por_id_usuario`),
  CONSTRAINT `fk_clientes_creado_por` FOREIGN KEY (`creado_por_id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_clientes_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Clientes con relación 1:1 a usuarios';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,NULL,'Juan','Pérez','+5491111111','juan@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(2,NULL,'María','González','+5491111112','maria@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(3,NULL,'Pedro','López','+5491111113','pedro@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(4,NULL,'Ana','Rodríguez','+5491111114','ana@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(5,NULL,'Carlos','Martínez','+5491111115','carlos@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(6,2,'Rodrigo Villalba',NULL,NULL,'villalbarodrigo2009@gmail.com',NULL,2,1,'2026-03-17 23:43:07','2026-03-17 23:43:07'),(7,1,'Templo User',NULL,NULL,'temploclaypole@gmail.com',NULL,1,1,'2026-03-17 23:43:07','2026-03-17 23:43:07'),(8,NULL,'Juan','Reite','1155001122','reite.tributo@gmail.com','Rol en banda: Manager (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),(9,NULL,'Marco','Sández','1155003344','pateando.bares@gmail.com','Rol en banda: Productor (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),(10,NULL,'Sol','Rodríguez','1155005566','lasmentas@gmail.com','Rol en banda: Vocalista/Manager (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),(11,NULL,'Carlos','Mendoza','1144445566','cumbia.sudaka@gmail.com','Rol en banda: Líder (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion`
--

DROP TABLE IF EXISTS `configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion` (
  `Clave` varchar(100) NOT NULL,
  `Valor` text DEFAULT NULL,
  PRIMARY KEY (`Clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion`
--

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` VALUES ('ANTICIPACION_MAXIMA_DIAS','90'),('ANTICIPACION_MINIMA_DIAS','3'),('DIRECCION','Liniers 465, Claypole, Buenos Aires'),('EMAIL_CONTACTO','contacto@eltemplodeclaypole.com'),('HORARIO_ATENCION','Lunes a Sábado 10:00 - 22:00'),('NOMBRE_NEGOCIO','El Templo de Claypole'),('TELEFONO','1155630357');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_horarios`
--

DROP TABLE IF EXISTS `configuracion_horarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_horarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_tipo_evento` varchar(255) NOT NULL,
  `dia_semana` varchar(20) NOT NULL COMMENT 'todos, lunes, martes, ..., sabado, domingo',
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_evento_dia_hora` (`id_tipo_evento`,`dia_semana`,`hora_inicio`),
  KEY `idx_tipo_evento` (`id_tipo_evento`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_horarios`
--

LOCK TABLES `configuracion_horarios` WRITE;
/*!40000 ALTER TABLE `configuracion_horarios` DISABLE KEYS */;
INSERT INTO `configuracion_horarios` VALUES (1,'INFANTILES','todos','12:00:00','23:00:00'),(2,'INFANTILES','todos','13:00:00','23:00:00'),(3,'INFANTILES','todos','14:00:00','23:00:00'),(4,'INFANTILES','todos','16:00:00','23:00:00'),(5,'INFANTILES','todos','17:00:00','23:00:00'),(6,'INFANTILES','todos','18:00:00','23:00:00'),(7,'INFORMALES','todos','09:00:00','23:00:00'),(8,'INFORMALES','todos','10:00:00','23:00:00'),(9,'INFORMALES','todos','11:00:00','23:00:00'),(10,'INFORMALES','todos','12:00:00','23:00:00'),(11,'INFORMALES','todos','13:00:00','23:00:00'),(12,'INFORMALES','todos','14:00:00','23:00:00'),(13,'INFORMALES','sabado','15:00:00','02:00:00'),(14,'INFORMALES','sabado','16:00:00','02:00:00'),(15,'INFORMALES','sabado','17:00:00','02:00:00'),(16,'INFORMALES','sabado','18:00:00','02:00:00'),(17,'INFORMALES','sabado','19:00:00','02:00:00'),(18,'INFORMALES','sabado','20:00:00','02:00:00'),(19,'INFORMALES','sabado','21:00:00','02:00:00'),(20,'INFORMALES','sabado','22:00:00','02:00:00'),(21,'CON_SERVICIO_DE_MESA','todos','09:00:00','23:00:00'),(22,'CON_SERVICIO_DE_MESA','todos','10:00:00','23:00:00'),(23,'CON_SERVICIO_DE_MESA','todos','11:00:00','23:00:00'),(24,'CON_SERVICIO_DE_MESA','todos','12:00:00','23:00:00'),(25,'CON_SERVICIO_DE_MESA','sabado','18:00:00','02:00:00'),(26,'CON_SERVICIO_DE_MESA','sabado','19:00:00','02:00:00'),(27,'CON_SERVICIO_DE_MESA','sabado','20:00:00','02:00:00'),(28,'CON_SERVICIO_DE_MESA','sabado','21:00:00','02:00:00'),(29,'BABY_SHOWERS','todos','12:00:00','23:00:00'),(30,'BABY_SHOWERS','todos','13:00:00','23:00:00'),(31,'BABY_SHOWERS','todos','14:00:00','23:00:00'),(32,'BABY_SHOWERS','todos','16:00:00','23:00:00'),(33,'BABY_SHOWERS','sabado','17:00:00','02:00:00'),(34,'BABY_SHOWERS','sabado','18:00:00','02:00:00'),(35,'ADOLESCENTES','todos','12:00:00','23:00:00'),(36,'ADOLESCENTES','todos','13:00:00','23:00:00'),(37,'ADOLESCENTES','todos','14:00:00','23:00:00'),(38,'ADOLESCENTES','todos','16:00:00','23:00:00'),(39,'ADOLESCENTES','sabado','17:00:00','02:00:00'),(40,'ADOLESCENTES','sabado','18:00:00','02:00:00'),(41,'FECHA_BANDAS','todos','12:00:00','23:00:00'),(42,'FECHA_BANDAS','sabado','21:00:00','02:00:00');
/*!40000 ALTER TABLE `configuracion_horarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `costos_personal_vigencia`
--

DROP TABLE IF EXISTS `costos_personal_vigencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `costos_personal_vigencia` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rol` varchar(100) NOT NULL,
  `fecha_de_vigencia` date NOT NULL,
  `costo_por_hora` decimal(10,2) NOT NULL,
  `viaticos` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rol_vigencia` (`rol`,`fecha_de_vigencia`),
  KEY `idx_rol` (`rol`),
  KEY `idx_vigencia` (`fecha_de_vigencia`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `costos_personal_vigencia`
--

LOCK TABLES `costos_personal_vigencia` WRITE;
/*!40000 ALTER TABLE `costos_personal_vigencia` DISABLE KEYS */;
INSERT INTO `costos_personal_vigencia` VALUES (1,'Encargada','2025-08-01',5000.00,0.00),(2,'Bartender','2025-08-01',5000.00,0.00),(3,'Cocinera','2025-08-01',3500.00,0.00),(4,'Puerta','2025-08-01',3500.00,1000.00),(5,'Ayudante de cocina','2025-08-01',3000.00,0.00),(6,'Mesera','2025-08-01',3000.00,0.00),(7,'Limpieza','2025-09-01',3500.00,1200.00),(8,'Sonido','2025-08-01',4000.00,500.00),(9,'DJ','2025-08-01',4500.00,0.00),(10,'Seguridad','2025-08-01',4000.00,1000.00);
/*!40000 ALTER TABLE `costos_personal_vigencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cupones`
--

DROP TABLE IF EXISTS `cupones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cupones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `tipo_descuento` enum('PORCENTAJE','MONTO_FIJO') NOT NULL,
  `valor_fijo` decimal(10,2) DEFAULT NULL,
  `porcentaje_descuento` decimal(5,2) DEFAULT NULL,
  `usos_maximos` int(11) DEFAULT NULL COMMENT 'NULL = ilimitado',
  `usos_actuales` int(11) DEFAULT 0,
  `fecha_expiracion` date DEFAULT NULL COMMENT 'NULL = no expira',
  `activo` tinyint(1) DEFAULT 1,
  `aplica_a` enum('TODAS','ANTICIPADA','PUERTA') DEFAULT 'TODAS',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cupones`
--

LOCK TABLES `cupones` WRITE;
/*!40000 ALTER TABLE `cupones` DISABLE KEYS */;
/*!40000 ALTER TABLE `cupones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos_bandas_invitadas`
--

DROP TABLE IF EXISTS `eventos_bandas_invitadas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos_bandas_invitadas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_evento` int(11) NOT NULL,
  `id_banda` int(11) DEFAULT NULL COMMENT 'FK si la banda existe en catálogo',
  `nombre_banda` varchar(255) NOT NULL,
  `orden` tinyint(4) DEFAULT 1 COMMENT 'Orden de invitada: 1, 2 o 3',
  PRIMARY KEY (`id`),
  KEY `idx_evento` (`id_evento`),
  KEY `idx_banda` (`id_banda`),
  CONSTRAINT `eventos_bandas_invitadas_ibfk_1` FOREIGN KEY (`id_evento`) REFERENCES `eventos_confirmados` (`id`) ON DELETE CASCADE,
  CONSTRAINT `eventos_bandas_invitadas_ibfk_2` FOREIGN KEY (`id_banda`) REFERENCES `bandas_artistas` (`id_banda`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos_bandas_invitadas`
--

LOCK TABLES `eventos_bandas_invitadas` WRITE;
/*!40000 ALTER TABLE `eventos_bandas_invitadas` DISABLE KEYS */;
/*!40000 ALTER TABLE `eventos_bandas_invitadas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos_confirmados`
--

DROP TABLE IF EXISTS `eventos_confirmados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos_confirmados` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud` int(11) NOT NULL COMMENT 'FK a solicitudes.id_solicitud',
  `tipo_evento` enum('ALQUILER_SALON','BANDA','SERVICIO','TALLER') NOT NULL,
  `tabla_origen` varchar(50) NOT NULL COMMENT 'solicitudes_alquiler, solicitudes_bandas, solicitudes_servicios, solicitudes_talleres',
  `nombre_evento` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `url_flyer` varchar(500) DEFAULT NULL COMMENT 'URL del flyer/promocional',
  `fecha_evento` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `duracion_estimada` varchar(100) DEFAULT NULL,
  `id_cliente` int(11) DEFAULT NULL COMMENT 'FK a clientes.id_cliente',
  `es_publico` tinyint(1) DEFAULT 0 COMMENT '1=Visible en agenda pública',
  `activo` tinyint(1) DEFAULT 1 COMMENT '1=Vigente, 0=Cancelado o archivado',
  `genero_musical` varchar(255) DEFAULT NULL COMMENT 'Solo para BANDA',
  `cantidad_personas` int(11) DEFAULT NULL COMMENT 'Solo para ALQUILER_SALON/BANDA',
  `tipo_servicio` varchar(255) DEFAULT NULL COMMENT 'Solo para SERVICIO',
  `nombre_taller` varchar(255) DEFAULT NULL COMMENT 'Solo para TALLER',
  `confirmado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `cancelado_en` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_solicitud_tipo` (`id_solicitud`,`tipo_evento`),
  KEY `idx_tipo_evento` (`tipo_evento`),
  KEY `idx_fecha` (`fecha_evento`),
  KEY `idx_es_publico` (`es_publico`),
  KEY `idx_activo` (`activo`),
  KEY `idx_id_solicitud` (`id_solicitud`),
  KEY `idx_id_cliente` (`id_cliente`),
  CONSTRAINT `fk_eventos_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE SET NULL,
  CONSTRAINT `fk_eventos_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes` (`id_solicitud`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Eventos confirmados unificados';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos_confirmados`
--

LOCK TABLES `eventos_confirmados` WRITE;
/*!40000 ALTER TABLE `eventos_confirmados` DISABLE KEYS */;
INSERT INTO `eventos_confirmados` VALUES (1,2,'ALQUILER_SALON','solicitudes_alquiler','Fiesta de 15 años - Luz','Fiesta de quince años con servicio completo de catering, meseras y sonido profesional.',NULL,'2026-03-22','16:00:00','6 horas',2,0,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(2,4,'BANDA','solicitudes_fechas_bandas','Reite - Tributo a La Renga','Show completo del tributo a La Renga. Viernes noche. Fecha propia confirmada.',NULL,'2026-03-30','22:00:00','3 horas',1,1,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(3,5,'BANDA','solicitudes_fechas_bandas','Las Mentas en Vivo','Show abierto al público de la banda Las Mentas. Rock alternativo de buena calidad.',NULL,'2026-04-10','20:00:00','2.5 horas',5,1,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(4,8,'TALLER','solicitudes_talleres','Taller de Masaje Descontracturante','Sesión grupal de masaje descontracturante. Técnicas relajantes y terapéuticas.',NULL,'2026-03-08','10:00:00','90 minutos',2,1,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(5,6,'BANDA','solicitudes_fechas_bandas','Pateando Bares','Rock nacional solicita fecha compartida con banda telonera. Esperan 200 personas.',NULL,'2026-04-18','21:30:00','4 horas',4,1,1,'Pateando Bares',3,NULL,NULL,'2026-03-27 18:44:36','2026-03-27 18:44:36',NULL);
/*!40000 ALTER TABLE `eventos_confirmados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos_lineup`
--

DROP TABLE IF EXISTS `eventos_lineup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos_lineup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_evento_confirmado` int(11) NOT NULL,
  `id_banda` int(11) DEFAULT NULL COMMENT 'FK a bandas_artistas (NULL si es solo nombre)',
  `nombre_banda` varchar(255) NOT NULL COMMENT 'Nombre (redundante si id_banda existe, necesario si no)',
  `orden_show` int(11) NOT NULL DEFAULT 0 COMMENT '0=telonero, 1, 2..., último=principal',
  `es_principal` tinyint(1) DEFAULT 0 COMMENT '1=Banda principal (cierra)',
  `es_solicitante` tinyint(1) DEFAULT 0 COMMENT '1=Es quien solicitó la fecha',
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `duracion_minutos` int(11) DEFAULT NULL,
  `estado` enum('invitada','confirmada','cancelada') DEFAULT 'invitada',
  `notas` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_evento_confirmado` (`id_evento_confirmado`),
  KEY `idx_banda` (`id_banda`),
  KEY `idx_orden` (`id_evento_confirmado`,`orden_show`),
  CONSTRAINT `eventos_lineup_ibfk_1` FOREIGN KEY (`id_evento_confirmado`) REFERENCES `eventos_confirmados` (`id`) ON DELETE CASCADE,
  CONSTRAINT `eventos_lineup_ibfk_2` FOREIGN KEY (`id_banda`) REFERENCES `bandas_artistas` (`id_banda`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos_lineup`
--

LOCK TABLES `eventos_lineup` WRITE;
/*!40000 ALTER TABLE `eventos_lineup` DISABLE KEYS */;
INSERT INTO `eventos_lineup` VALUES (1,5,2,'Pateando Bares',99,1,1,NULL,NULL,NULL,'confirmada',NULL);
/*!40000 ALTER TABLE `eventos_lineup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos_personal`
--

DROP TABLE IF EXISTS `eventos_personal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos_personal` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_evento` int(11) NOT NULL,
  `id_personal` varchar(50) DEFAULT NULL,
  `rol` varchar(100) NOT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_evento` (`id_evento`),
  CONSTRAINT `eventos_personal_ibfk_1` FOREIGN KEY (`id_evento`) REFERENCES `eventos_confirmados` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos_personal`
--

LOCK TABLES `eventos_personal` WRITE;
/*!40000 ALTER TABLE `eventos_personal` DISABLE KEYS */;
/*!40000 ALTER TABLE `eventos_personal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inscripciones_talleres`
--

DROP TABLE IF EXISTS `inscripciones_talleres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inscripciones_talleres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `taller_id` int(11) NOT NULL,
  `precio_id` int(11) DEFAULT NULL COMMENT 'FK a precios_talleres.id',
  `alumno_nombre` varchar(255) NOT NULL,
  `alumno_telefono` varchar(50) DEFAULT NULL,
  `alumno_email` varchar(255) DEFAULT NULL,
  `modalidad` enum('clase_suelta','paquete') DEFAULT 'clase_suelta',
  `clases_restantes` int(11) DEFAULT NULL,
  `monto_pagado` decimal(10,2) DEFAULT 0.00,
  `fecha_inscripcion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_vencimiento` date DEFAULT NULL,
  `estado` enum('activa','inactiva','suspendida','finalizada') DEFAULT 'activa',
  PRIMARY KEY (`id`),
  KEY `idx_taller` (`taller_id`),
  KEY `idx_precio` (`precio_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_alumno_email` (`alumno_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inscripciones_talleres`
--

LOCK TABLES `inscripciones_talleres` WRITE;
/*!40000 ALTER TABLE `inscripciones_talleres` DISABLE KEYS */;
/*!40000 ALTER TABLE `inscripciones_talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opciones_adicionales`
--

DROP TABLE IF EXISTS `opciones_adicionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones_adicionales` (
  `id_opciones_adicionales` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL COMMENT 'Nombre único del adicional',
  `precio` decimal(10,2) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `url_imagen` text DEFAULT NULL,
  PRIMARY KEY (`id_opciones_adicionales`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opciones_adicionales`
--

LOCK TABLES `opciones_adicionales` WRITE;
/*!40000 ALTER TABLE `opciones_adicionales` DISABLE KEYS */;
INSERT INTO `opciones_adicionales` VALUES (1,'Inflable Cocodrilo',30000.00,'Inflable con forma de cocodrilo de 4x7 metros con tobogan','https://lh3.googleusercontent.com/pw/AP1GczM9WbWMorMn_fPb7f9_uS7-IWAsKEj0LcCn8Zvi7U14_7Kjdjge28_RV50Gcu7wkinQk_W5mK5NFNXh1iFjv-Uq-EHjvQWigm3TcSlMvNhhM3ZOZMT05WkaWaxuL-QNciykkIuCmLe0YwQYRrFieHTl=w394-h231-s-no-gm?authuser=0'),(2,'Inflable Mickey/Minnie',25000.00,'Inflable de 4x4 metros con caras gigantes de Mickey y Minnie','https://lh3.googleusercontent.com/pw/AP1GczMQl1ffjotYB0j0jFCInMgBquqvsgAITDe31BuKk14RFS3Bky5eSfrTjuDJFDCqZ8bAkeVK1xqPFz3xzJBw8R_YXNyS6Zo0ZIytnwaHNIQCJvghvfhwP5xetCI7Xg2cVqFmbbDUuJ3Cv_-SHFU3BI6f=w340-h358-s-no-gm?authuser=0'),(3,'Inflable Princesa',22000.00,'Inflable temática Princesas de 3x3 metros','https://lh3.googleusercontent.com/pw/AP1GczOYtkKsvQOWJsscPoXvPKxmGWHFzXBUCnWMVr3jyPXvQLDPJFLKivYfqf0HP0DCFCiDZeuF_OHT2Dg7mY5gdOva0YQL94uS9aGQOhRviny_ZNoIPCAR-9p5x2gOXjrNYaAIzRnEKbOOqseXBmWgwfnT=w377-h360-s-no-gm?authuser=0'),(4,'Inflable Spiderman',22000.00,'Inflable temática Hombre Araña de 3x3 metros','https://lh3.googleusercontent.com/pw/AP1GczOlO48NaDkNnHM_ZPKJT-4eHH36bUYMJUZFlAObTvGgIgHy6H0hwaSbyxFJvAjmIrucr12rvG2FTpeLcezzfGBVUCmADUhhTYXZAUdUPw4bw2gdvjts1P-GOH4XPD3MrxLG3AfhHWlHtnk2IosfgBhl=w418-h349-s-no-gm?authuser=0'),(5,'Cama elástica',30000.00,'Cama elástica con red lateral para niños hasta 10 años','https://lh3.googleusercontent.com/pw/AP1GczMM-aZTEqkYM4KlsY5A79dD5IMy03IVXb0EgLUWVPlflvdfCikVlgkn3p6PVwELvS4qtBoD9HGf8LiIVAHNIuTzn3FxMxYcIecyqjeE1Ew-PZfl723Rt1kQGs-ClWpThLxG77uaRM153VQfVvD4O8fJ=w700-h933-s-no-gm?authuser=0'),(6,'Manteles negros con camino blanco',30000.00,'Manteles negros con camino blanco para todas las mesas','https://lh3.googleusercontent.com/pw/AP1GczPfoLiluF0pE9tFCtHRtuXpK0pFM3BQRZ97t81cE9aapbIAzlsJ5srLNeaJYfmI_2F247p2zH33ilH6oW3D-N_nM7BQKZL0CcrE49wNHZ1hQALYnGrsjMk3VsdwQ66In8Ub11R8bW8rD4Riyl6WJTjp=w999-h779-s-no-gm?authuser=0'),(7,'Manteles negros sólos',20000.00,'Manteles negros para todas las mesas','https://lh3.googleusercontent.com/pw/AP1GczOSpOTKTwuEAckvaWRc8thYEivYe0el_Fno_l6-ylS331QQaBD7L8zRVPQ1BVBXGdCjdyFbinue3OMV6BtZXpndGSbE4AuCCH710iGesDuGLotzH3gHsirHRral9vmMs-x8pG1S-rrSV0odj9BLrCSV=w800-h749-s-no-gm?authuser=0'),(8,'Decoración HBD Completa',390000.00,'Decoración temática Happy Birthday con globos y accesorios','https://via.placeholder.com/400?text=Decoracion+HBD'),(9,'Kit Números y Globos',950000.00,'Globos de números gigantes + decoraciones','https://via.placeholder.com/400?text=Globos+Numeros'),(10,'Decoración Boho',969000.00,'Decoración temática boho con arco de globos y mesas','https://via.placeholder.com/400?text=Decoracion+Boho'),(11,'Globos Comic (helio)',59000.00,'Pack de globos radionde con helio temático comic','https://via.placeholder.com/400?text=Globos+Comic'),(12,'Gazebo 3x5m',20000.00,'Carpa/Gazebo para sombra y ambientación','https://i.imgur.com/0FhGJ1S.png'),(13,'Sillas Plásticas (10 unidades)',15000.00,'Alquiler de 10 sillas plásticas para eventos','https://via.placeholder.com/400?text=Sillas+10pcs'),(14,'Toldo/Carpa 3x5m',20000.00,'Carpa para sombra de 3x5 metros','https://via.placeholder.com/400?text=Carpa+3x5m'),(15,'Cama Elástica (basica)',120000.00,'Cama elástica básica para niños','https://via.placeholder.com/400?text=Cama+Elastica'),(16,'Livings Infantiles',40000.00,'Juego de livings infantiles para eventos','https://i.imgur.com/GnYzLQJ.png'),(17,'Gazebo Decorativo',50000.00,'Gazebo para ambientación en fiestas','https://via.placeholder.com/400?text=Gazebo+Decorativo'),(18,'Set Globos Helio (30 unidades)',8000.00,'Set de 30 globos con helio para decoración','https://via.placeholder.com/400?text=Globos+Helio+30'),(19,'Centro de Mesa Elegante',10000.00,'Centro de mesa decorativo para eventos','https://via.placeholder.com/400?text=Centro+Mesa'),(20,'Luces LED Ambientación',12000.00,'Luces LED para ambientación de eventos','https://via.placeholder.com/400?text=Luces+LED');
/*!40000 ALTER TABLE `opciones_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opciones_adicionales_x_tipo_evento`
--

DROP TABLE IF EXISTS `opciones_adicionales_x_tipo_evento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones_adicionales_x_tipo_evento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_opciones_adicionales` int(11) NOT NULL COMMENT 'FK a opciones_adicionales.id_opciones_adicionales',
  `id_tipo_evento` varchar(255) NOT NULL COMMENT 'FK a opciones_tipos.id_tipo_evento',
  `precio_especifico` decimal(10,2) DEFAULT NULL COMMENT 'NULL = usar precio de opciones_adicionales',
  `activo` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_adicional_tipo` (`id_opciones_adicionales`,`id_tipo_evento`),
  KEY `idx_tipo_evento` (`id_tipo_evento`),
  KEY `idx_adicional` (`id_opciones_adicionales`),
  CONSTRAINT `opciones_adicionales_x_tipo_evento_ibfk_1` FOREIGN KEY (`id_opciones_adicionales`) REFERENCES `opciones_adicionales` (`id_opciones_adicionales`) ON DELETE CASCADE,
  CONSTRAINT `opciones_adicionales_x_tipo_evento_ibfk_2` FOREIGN KEY (`id_tipo_evento`) REFERENCES `opciones_tipos` (`id_tipo_evento`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Relación N:N entre adicionales y tipos de eventos';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opciones_adicionales_x_tipo_evento`
--

LOCK TABLES `opciones_adicionales_x_tipo_evento` WRITE;
/*!40000 ALTER TABLE `opciones_adicionales_x_tipo_evento` DISABLE KEYS */;
INSERT INTO `opciones_adicionales_x_tipo_evento` VALUES (1,1,'INFANTILES',NULL,1),(2,2,'INFANTILES',NULL,1),(3,3,'INFANTILES',NULL,1),(4,4,'INFANTILES',NULL,1),(5,5,'INFANTILES',NULL,1),(6,8,'INFANTILES',NULL,1),(7,4,'ADOLESCENTES',NULL,1),(8,5,'ADOLESCENTES',8000.00,1),(9,6,'ADOLESCENTES',5000.00,1),(10,7,'BABY_SHOWERS',15000.00,1),(11,8,'BABY_SHOWERS',4000.00,1),(12,9,'CON_SERVICIO_DE_MESA',12000.00,1),(13,10,'CON_SERVICIO_DE_MESA',6000.00,1),(14,11,'CON_SERVICIO_DE_MESA',20000.00,1),(15,2,'INFORMALES',5000.00,1),(16,3,'INFORMALES',3000.00,1),(17,4,'FECHA_BANDAS',NULL,1),(18,5,'FECHA_BANDAS',8000.00,1),(19,6,'FECHA_BANDAS',5000.00,1),(20,12,'FECHA_BANDAS',25000.00,1);
/*!40000 ALTER TABLE `opciones_adicionales_x_tipo_evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opciones_duracion`
--

DROP TABLE IF EXISTS `opciones_duracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones_duracion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_tipo_evento` varchar(255) NOT NULL,
  `duracion_horas` int(11) NOT NULL,
  `descripcion` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_evento_duracion` (`id_tipo_evento`,`duracion_horas`),
  KEY `idx_tipo_evento` (`id_tipo_evento`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opciones_duracion`
--

LOCK TABLES `opciones_duracion` WRITE;
/*!40000 ALTER TABLE `opciones_duracion` DISABLE KEYS */;
INSERT INTO `opciones_duracion` VALUES (1,'INFANTILES',3,'3 horas'),(2,'INFANTILES',4,'4 horas'),(3,'INFANTILES',5,'5 horas'),(4,'INFORMALES',4,'4 horas'),(5,'INFORMALES',6,'6 horas'),(6,'INFORMALES',8,'8 horas'),(7,'INFORMALES',10,'10 horas'),(8,'CON_SERVICIO_DE_MESA',4,'4 horas'),(9,'CON_SERVICIO_DE_MESA',6,'6 horas'),(10,'CON_SERVICIO_DE_MESA',8,'8 horas'),(11,'CON_SERVICIO_DE_MESA',10,'10 horas'),(12,'BABY_SHOWERS',3,'3 horas'),(13,'BABY_SHOWERS',4,'4 horas'),(14,'BABY_SHOWERS',5,'5 horas'),(15,'BABY_SHOWERS',6,'6 horas'),(16,'ADOLESCENTES',3,'3 horas'),(17,'ADOLESCENTES',4,'4 horas'),(18,'ADOLESCENTES',5,'5 horas'),(19,'FECHA_BANDAS',5,'5 horas'),(20,'FECHA_BANDAS',6,'6 horas'),(21,'FECHA_BANDAS',7,'7 horas'),(22,'FECHA_BANDAS',8,'8 horas');
/*!40000 ALTER TABLE `opciones_duracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opciones_tipos`
--

DROP TABLE IF EXISTS `opciones_tipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones_tipos` (
  `id_tipo_evento` varchar(255) NOT NULL COMMENT 'ID del tipo/subtipo: INFANTILES, FECHA_BANDAS, etc.',
  `nombre_para_mostrar` varchar(255) NOT NULL COMMENT 'Nombre amigable para UI',
  `descripcion` text DEFAULT NULL COMMENT 'Descripción detallada del tipo de evento',
  `categoria` varchar(50) NOT NULL COMMENT 'ALQUILER_SALON, FECHA_BANDAS, TALLERES_ACTIVIDADES, SERVICIOS',
  `es_publico` tinyint(1) DEFAULT 1 COMMENT '1=Visible para clientes, 0=Solo admin',
  `permite_adicionales` tinyint(1) DEFAULT 1 COMMENT '1=Permite agregar servicios/adicionales, 0=No permite',
  `monto_sena` decimal(10,2) DEFAULT NULL COMMENT 'Monto de seña requerido',
  `deposito` decimal(10,2) DEFAULT NULL COMMENT 'Depósito de garantía',
  PRIMARY KEY (`id_tipo_evento`),
  KEY `idx_categoria` (`categoria`),
  KEY `idx_es_publico` (`es_publico`),
  KEY `idx_permite_adicionales` (`permite_adicionales`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opciones_tipos`
--

LOCK TABLES `opciones_tipos` WRITE;
/*!40000 ALTER TABLE `opciones_tipos` DISABLE KEYS */;
INSERT INTO `opciones_tipos` VALUES ('ADOLESCENTES','CUMPLEAÑOS PARA ADOLESCENTES   (de 13 a 17 años)','🎧 **CUMPLEAÑOS ADOLESCENTES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina con cocinera\n• Metegoles, Ping Pong, Pool, Jenga\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Música y juego de luces\n• 20 min previos para decoración\n\n❌ **NO INCLUYE:** Cancha de fútbol','ALQUILER_SALON',1,1,50000.00,80000.00),('BABY_SHOWERS','BABY SHOWERS / BAUTISMOS / COMUNIONES','👶 **BABY SHOWERS / BAUTISMOS / COMUNIONES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina con cocinera\n• Inflable 3x3\n• Metegoles, Ping Pong, Pool\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Música y luces\n• Cancha (niños hasta 12)\n\n❌ **NO INCLUYE:** Meseras, animación, vajilla de metal','ALQUILER_SALON',1,1,50000.00,NULL),('CON_SERVICIO_DE_MESA','FIESTA de 15 / 18 / casamiento (SERVICIO COMPLETO)','🌟 **SERVICIO COMPLETO**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Cocinera y uso completo de cocina\n• Meseras según cantidad\n• Mesas, sillas y mantelería\n• Vajilla de cristal y cubiertos de metal\n• Sonido profesional PA JBL\n• Backline para bandas\n• Baño equipado\n\n❌ **NO INCLUYE:** DJ, decoración, cancha de fútbol','ALQUILER_SALON',1,0,80000.00,NULL),('DEPILACION','Depilación','🌸 **DEPILACIÓN**\n\nZonas: Piernas, Brazos, Cavado, Bozo, Axilas\nMétodo: Cera tibia descartable','SERVICIOS',1,0,NULL,NULL),('DEPILACION_DEFINITIVA','Depilación Definitiva','⚡ **DEPILACIÓN DEFINITIVA**','SERVICIOS',0,0,NULL,NULL),('ESTETICA','Estética','✨ **ESTÉTICA**\n\nTratamientos: Limpieza facial, Hidratación, Anti-age, Acné','SERVICIOS',1,0,NULL,NULL),('FECHA_BANDAS','Fecha para bandas en vivo','🎸 **FECHA PARA BANDAS**\n\n✅ **INCLUYE:**\n• Coordinación de bandas\n• Flyers y publicaciones\n• Encargada de puerta\n• Uso de cocina\n• Sonido profesional\n• Backline completo','FECHA_BANDAS',0,0,NULL,NULL),('INFANTILES','CUMPLE INFANTIL   (de 1 a 12 años - SERVICIO COMPLETO)','🎈 **CUMPLEAÑOS INFANTIL**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina completa con cocinera\n• Inflable 3x3\n• Metegoles, Ping Pong, Pool y Jenga gigante\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Baño equipado\n• Música y juego de luces\n• Cancha de fútbol (niños hasta 12 años)\n• 20 min previos para decoración\n\n❌ **NO INCLUYE:** Bebidas, alimentos, animación, vajilla de cristal','ALQUILER_SALON',1,1,50000.00,NULL),('INFORMALES','JUNTADA / PARRILLADA INFORMAL PARA FAMILIA O AMIGOS (SERVICIO ECONÓMICO)','🎉 **SERVICIO ECONÓMICO**\n\n✅ **INCLUYE:**\n• Encargada/o general y control de puerta\n• Mesas y sillas\n• Uso de parrilla\n• Uso de bachas, mesadas, barra\n• Heladera y freezer\n• Baño equipado\n• Equipo de música\n• Metegoles, Ping Pong, Pool\n\n❌ **NO INCLUYE:** Horno, hornallas, cocinera, mantelería, vajilla','ALQUILER_SALON',1,1,50000.00,80000.00),('MASAJES','Masajes','💆 **MASAJES PROFESIONALES**\n\nTipos: Descontracturante, Relajante, Reflexología, Piedras calientes\nDuración: 45 a 90 min','SERVICIOS',1,0,NULL,NULL),('TALLER_ARTE','Arte y Manualidades','🎨 **TALLERES DE ARTE**\n\nPintura, Dibujo, Cerámica, Manualidades, Tejido','TALLERES_ACTIVIDADES',1,0,NULL,NULL),('TALLER_DANZA','Danza','💃 **DANZA**\n\nEstilos: Folklore, Tango, Contemporánea, Salsa, Bachata','TALLERES_ACTIVIDADES',1,0,NULL,NULL),('TALLER_MUSICA','Música','🎵 **MÚSICA**\n\nInstrumentos: Guitarra, Teclado, Batería, Canto, Vientos','TALLERES_ACTIVIDADES',1,0,NULL,NULL),('TALLER_YOGA','Yoga','🧘 **YOGA**\n\nEstilos: Hatha, Vinyasa, Restaurativo, Embarazadas','TALLERES_ACTIVIDADES',1,0,NULL,NULL);
/*!40000 ALTER TABLE `opciones_tipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_disponible`
--

DROP TABLE IF EXISTS `personal_disponible`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_disponible` (
  `id_personal` varchar(50) NOT NULL,
  `nombre_completo` varchar(255) NOT NULL,
  `rol` varchar(255) NOT NULL COMMENT 'Roles separados por coma: Encargada,Puerta,Cocinera',
  `celular` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `cvu_alias` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_personal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_disponible`
--

LOCK TABLES `personal_disponible` WRITE;
/*!40000 ALTER TABLE `personal_disponible` DISABLE KEYS */;
INSERT INTO `personal_disponible` VALUES ('pers-001','Laura Méndez','Encargada','1134567890',1,'laura.mendez.mp'),('pers-002','Carlos Vega','DJ,Sonido','1145678901',1,'carlosvega.dj'),('pers-003','Daniela Rojas','Cocinera,Ayudante de cocina','1156789012',1,'daniela.rojas'),('pers-004','Martín Sosa','Seguridad,Puerta','1167890123',1,NULL),('pers-005','Valentina Cruz','Mesera,Bartender','1178901234',1,'valen.cruz.alias'),('pers-006','Florencia Gil','Limpieza','1189012345',0,NULL);
/*!40000 ALTER TABLE `personal_disponible` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_pagos`
--

DROP TABLE IF EXISTS `personal_pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_pagos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_personal` varchar(50) NOT NULL COMMENT 'ID del empleado',
  `id_solicitud` int(11) DEFAULT NULL COMMENT 'ID del evento/solicitud (opcional)',
  `monto_acordado` decimal(10,2) NOT NULL COMMENT 'Monto acordado para este trabajo',
  `monto_pagado` decimal(10,2) DEFAULT 0.00 COMMENT 'Monto realmente pagado',
  `fecha_trabajo` date DEFAULT NULL COMMENT 'Fecha en que se realizó el trabajo',
  `fecha_pago` date DEFAULT NULL COMMENT 'Fecha en que se realizó el pago',
  `metodo_pago` varchar(50) DEFAULT 'efectivo' COMMENT 'efectivo, transferencia, cheque, etc.',
  `comprobante` varchar(255) DEFAULT NULL COMMENT 'Número de comprobante o referencia',
  `estado` enum('pendiente','parcial','pagado') DEFAULT 'pendiente' COMMENT 'Estado del pago',
  `descripcion` text DEFAULT NULL COMMENT 'Descripción del trabajo realizado',
  `notas` text DEFAULT NULL COMMENT 'Notas adicionales',
  `creado_por` int(11) DEFAULT NULL COMMENT 'ID del usuario que creó el registro',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_personal` (`id_personal`),
  KEY `idx_solicitud` (`id_solicitud`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_trabajo` (`fecha_trabajo`),
  KEY `idx_fecha_pago` (`fecha_pago`),
  KEY `idx_metodo_pago` (`metodo_pago`),
  KEY `idx_creado_por` (`creado_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pagos realizados al personal';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_pagos`
--

LOCK TABLES `personal_pagos` WRITE;
/*!40000 ALTER TABLE `personal_pagos` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_pagos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_tarifas`
--

DROP TABLE IF EXISTS `personal_tarifas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_tarifas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(100) NOT NULL COMMENT 'Nombre del rol (DJ, Mesera, etc.)',
  `monto_por_hora` decimal(10,2) DEFAULT NULL COMMENT 'Tarifa por hora trabajada',
  `monto_fijo_evento` decimal(10,2) DEFAULT NULL COMMENT 'Tarifa fija por evento completo',
  `monto_minimo` decimal(10,2) DEFAULT NULL COMMENT 'Monto mínimo garantizado',
  `vigente_desde` date NOT NULL COMMENT 'Fecha desde cuando es válida esta tarifa',
  `vigente_hasta` date DEFAULT NULL COMMENT 'Fecha hasta cuando es válida (NULL = indefinida)',
  `moneda` varchar(3) DEFAULT 'ARS' COMMENT 'Moneda (ARS, USD, EUR)',
  `descripcion` text DEFAULT NULL COMMENT 'Descripción de la tarifa',
  `activo` tinyint(1) DEFAULT 1 COMMENT 'Si la tarifa está activa',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_rol` (`nombre_rol`),
  KEY `idx_vigencia` (`vigente_desde`,`vigente_hasta`),
  KEY `idx_activo` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tarifas por rol';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_tarifas`
--

LOCK TABLES `personal_tarifas` WRITE;
/*!40000 ALTER TABLE `personal_tarifas` DISABLE KEYS */;
INSERT INTO `personal_tarifas` VALUES (1,'DJ',2500.00,15000.00,10000.00,'2025-01-01',NULL,'ARS','DJ - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(2,'Mesera',1800.00,8000.00,6000.00,'2025-01-01',NULL,'ARS','Mesera - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(3,'Bartender',2200.00,12000.00,8000.00,'2025-01-01',NULL,'ARS','Bartender - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(4,'DJ',2500.00,15000.00,10000.00,'2025-01-01',NULL,'ARS','DJ - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(5,'Mesera',1800.00,8000.00,6000.00,'2025-01-01',NULL,'ARS','Mesera - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(6,'Bartender',2200.00,12000.00,8000.00,'2025-01-01',NULL,'ARS','Bartender - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33');
/*!40000 ALTER TABLE `personal_tarifas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `precios_servicios`
--

DROP TABLE IF EXISTS `precios_servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `precios_servicios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `servicio_id` int(11) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `vigente` tinyint(1) DEFAULT 1,
  `vigente_desde` date NOT NULL,
  `vigente_hasta` date DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `servicio_id` (`servicio_id`),
  CONSTRAINT `precios_servicios_ibfk_1` FOREIGN KEY (`servicio_id`) REFERENCES `servicios_catalogo` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `precios_servicios`
--

LOCK TABLES `precios_servicios` WRITE;
/*!40000 ALTER TABLE `precios_servicios` DISABLE KEYS */;
INSERT INTO `precios_servicios` VALUES (1,1,4000.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(2,2,3500.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(3,3,2500.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(4,4,1200.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(5,5,3000.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(6,6,2800.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33');
/*!40000 ALTER TABLE `precios_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `precios_talleres`
--

DROP TABLE IF EXISTS `precios_talleres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `precios_talleres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_taller_id` varchar(255) DEFAULT NULL COMMENT 'FK a opciones_tipos.id_tipo_evento (opcional si es por taller específico)',
  `taller_id` int(11) DEFAULT NULL COMMENT 'FK a talleres.id (opcional si es por tipo)',
  `modalidad` enum('clase_suelta','paquete') DEFAULT 'clase_suelta',
  `cantidad_clases` int(11) DEFAULT NULL COMMENT 'Para paquetes',
  `precio` decimal(10,2) NOT NULL,
  `vigente_desde` date NOT NULL,
  `vigente_hasta` date DEFAULT NULL,
  `vigente` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_tipo` (`tipo_taller_id`),
  KEY `idx_taller` (`taller_id`),
  KEY `idx_vigente` (`vigente`),
  KEY `idx_vigencia` (`vigente_desde`,`vigente_hasta`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `precios_talleres`
--

LOCK TABLES `precios_talleres` WRITE;
/*!40000 ALTER TABLE `precios_talleres` DISABLE KEYS */;
INSERT INTO `precios_talleres` VALUES (1,NULL,1,'clase_suelta',1,3500.00,'2026-01-01',NULL,1),(2,NULL,1,'paquete',4,12000.00,'2026-01-01',NULL,1),(3,NULL,1,'paquete',8,22000.00,'2026-01-01',NULL,1),(4,NULL,2,'clase_suelta',1,3500.00,'2026-01-01',NULL,1),(5,NULL,2,'paquete',4,12000.00,'2026-01-01',NULL,1),(6,NULL,3,'clase_suelta',1,4000.00,'2026-01-01',NULL,1),(7,NULL,3,'paquete',4,14000.00,'2026-01-01',NULL,1),(8,NULL,3,'paquete',8,26000.00,'2026-01-01',NULL,1),(9,NULL,4,'clase_suelta',1,2500.00,'2026-01-01',NULL,1),(10,NULL,4,'paquete',4,9000.00,'2026-01-01',NULL,1),(11,NULL,4,'paquete',8,16500.00,'2026-01-01',NULL,1),(12,NULL,5,'clase_suelta',1,2800.00,'2026-01-01',NULL,1),(13,NULL,5,'paquete',4,10000.00,'2026-01-01',NULL,1),(14,NULL,6,'clase_suelta',1,5000.00,'2026-01-01',NULL,1),(15,NULL,6,'paquete',4,18000.00,'2026-01-01',NULL,1);
/*!40000 ALTER TABLE `precios_talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `precios_vigencia`
--

DROP TABLE IF EXISTS `precios_vigencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `precios_vigencia` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_tipo_evento` varchar(255) NOT NULL COMMENT 'Referencia a opciones_tipos.id_tipo_evento',
  `cantidad_min` int(11) NOT NULL DEFAULT 1 COMMENT 'Cantidad mínima de personas',
  `cantidad_max` int(11) NOT NULL COMMENT 'Cantidad máxima de personas',
  `precio_por_hora` decimal(10,2) NOT NULL COMMENT 'Precio base por hora',
  `vigente_desde` date NOT NULL,
  `vigente_hasta` date DEFAULT NULL COMMENT 'NULL = vigente actualmente',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_precio` (`id_tipo_evento`,`cantidad_min`,`cantidad_max`,`vigente_desde`),
  KEY `idx_tipo_evento` (`id_tipo_evento`),
  KEY `idx_vigencia` (`vigente_desde`,`vigente_hasta`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `precios_vigencia`
--

LOCK TABLES `precios_vigencia` WRITE;
/*!40000 ALTER TABLE `precios_vigencia` DISABLE KEYS */;
INSERT INTO `precios_vigencia` VALUES (1,'INFANTILES',1,40,50000.00,'2025-08-01',NULL),(2,'INFANTILES',41,50,55000.00,'2025-08-01',NULL),(3,'INFANTILES',51,60,60000.00,'2025-08-01',NULL),(4,'INFANTILES',61,70,65000.00,'2025-08-01',NULL),(5,'INFANTILES',71,80,70000.00,'2025-08-01',NULL),(6,'INFANTILES',81,90,75000.00,'2025-08-01',NULL),(9,'INFORMALES',1,30,20000.00,'2025-08-01',NULL),(10,'INFORMALES',31,40,30000.00,'2025-08-01',NULL),(11,'INFORMALES',41,50,40000.00,'2025-08-01',NULL),(12,'INFORMALES',51,60,50000.00,'2025-08-01',NULL),(13,'INFORMALES',61,70,65000.00,'2025-08-01',NULL),(14,'INFORMALES',71,80,80000.00,'2025-08-01',NULL),(15,'INFORMALES',81,90,95000.00,'2025-08-01',NULL),(16,'INFORMALES',91,100,110000.00,'2025-08-01',NULL),(17,'CON_SERVICIO_DE_MESA',1,40,100000.00,'2025-08-01',NULL),(18,'CON_SERVICIO_DE_MESA',41,60,150000.00,'2025-08-01',NULL),(19,'CON_SERVICIO_DE_MESA',61,80,200000.00,'2025-08-01',NULL),(20,'BABY_SHOWERS',1,40,50000.00,'2025-08-01',NULL),(21,'BABY_SHOWERS',41,50,55000.00,'2025-08-01',NULL),(22,'BABY_SHOWERS',51,60,60000.00,'2025-08-01',NULL),(23,'BABY_SHOWERS',61,70,65000.00,'2025-08-01',NULL),(24,'BABY_SHOWERS',71,80,70000.00,'2025-08-01',NULL),(25,'BABY_SHOWERS',81,90,75000.00,'2025-08-01',NULL),(26,'ADOLESCENTES',1,40,50000.00,'2025-11-01',NULL),(27,'ADOLESCENTES',41,50,55000.00,'2025-11-01',NULL),(28,'ADOLESCENTES',51,60,60000.00,'2025-11-01',NULL),(29,'FECHA_BANDAS',1,120,120000.00,'2025-10-01',NULL),(30,'INFANTILES',30,50,4000.00,'2026-01-01',NULL),(31,'INFANTILES',51,80,4500.00,'2026-01-01',NULL),(32,'BABY_SHOWERS',20,40,4000.00,'2026-01-01',NULL),(33,'BABY_SHOWERS',41,60,4500.00,'2026-01-01',NULL),(34,'CON_SERVICIO_DE_MESA',60,100,5000.00,'2026-01-01',NULL),(35,'CON_SERVICIO_DE_MESA',101,150,5500.00,'2026-01-01',NULL);
/*!40000 ALTER TABLE `precios_vigencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profesionales_servicios`
--

DROP TABLE IF EXISTS `profesionales_servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `profesionales_servicios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `especialidad` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `id_cliente` int(11) DEFAULT NULL,
  `dias_trabaja` varchar(255) DEFAULT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_profesionales_cliente_id` (`id_cliente`),
  CONSTRAINT `fk_profesionales_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profesionales_servicios`
--

LOCK TABLES `profesionales_servicios` WRITE;
/*!40000 ALTER TABLE `profesionales_servicios` DISABLE KEYS */;
/*!40000 ALTER TABLE `profesionales_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles_por_evento`
--

DROP TABLE IF EXISTS `roles_por_evento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles_por_evento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_tipo_evento` varchar(255) NOT NULL,
  `rol_requerido` varchar(100) NOT NULL,
  `cantidad` int(11) DEFAULT 1,
  `min_personas` int(11) NOT NULL DEFAULT 0,
  `max_personas` int(11) NOT NULL DEFAULT 120,
  PRIMARY KEY (`id`),
  KEY `idx_tipo_evento` (`id_tipo_evento`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles_por_evento`
--

LOCK TABLES `roles_por_evento` WRITE;
/*!40000 ALTER TABLE `roles_por_evento` DISABLE KEYS */;
INSERT INTO `roles_por_evento` VALUES (1,'INFANTILES','Encargada',1,0,120),(2,'INFANTILES','Cocinera',1,0,120),(3,'INFANTILES','Puerta',1,0,120),(4,'INFANTILES','Mesera',1,51,60),(5,'INFANTILES','Mesera',2,61,80),(6,'INFANTILES','Mesera',3,81,100),(7,'INFANTILES','Mesera',4,101,120),(8,'INFANTILES','Ayudante de cocina',1,51,80),(9,'INFANTILES','Ayudante de cocina',2,81,120),(10,'CON_SERVICIO_DE_MESA','Encargada',1,0,120),(11,'CON_SERVICIO_DE_MESA','Cocinera',1,0,120),(12,'CON_SERVICIO_DE_MESA','Puerta',1,0,120),(13,'CON_SERVICIO_DE_MESA','Mesera',1,51,60),(14,'CON_SERVICIO_DE_MESA','Mesera',2,61,80),(15,'CON_SERVICIO_DE_MESA','Mesera',3,81,100),(16,'CON_SERVICIO_DE_MESA','Mesera',4,101,120),(17,'CON_SERVICIO_DE_MESA','Ayudante de cocina',1,51,80),(18,'CON_SERVICIO_DE_MESA','Ayudante de cocina',2,81,120),(19,'BABY_SHOWERS','Encargada',1,0,120),(20,'BABY_SHOWERS','Cocinera',1,0,120),(21,'BABY_SHOWERS','Puerta',1,0,120),(22,'BABY_SHOWERS','Mesera',1,51,60),(23,'BABY_SHOWERS','Mesera',2,61,80),(24,'BABY_SHOWERS','Mesera',3,81,100),(25,'BABY_SHOWERS','Mesera',4,101,120),(26,'BABY_SHOWERS','Ayudante de cocina',1,51,80),(27,'BABY_SHOWERS','Ayudante de cocina',2,81,120),(28,'INFORMALES','Encargada',1,0,120),(29,'INFORMALES','Puerta',1,0,120),(30,'FECHA_BANDAS','Bartender',1,0,500),(31,'FECHA_BANDAS','Puerta',1,0,500),(32,'FECHA_BANDAS','Sonido',1,0,500);
/*!40000 ALTER TABLE `roles_por_evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servicios_catalogo`
--

DROP TABLE IF EXISTS `servicios_catalogo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios_catalogo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_servicio_id` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `duracion_minutos` int(11) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `orden` int(11) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicios_catalogo`
--

LOCK TABLES `servicios_catalogo` WRITE;
/*!40000 ALTER TABLE `servicios_catalogo` DISABLE KEYS */;
INSERT INTO `servicios_catalogo` VALUES (1,'MASAJES','Masaje Descontracturante','Masaje profesional para aliviar tensiones',60,1,1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(2,'MASAJES','Masaje Relajante','Masaje relajante y terapéutico',90,1,2,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(3,'DEPILACION','Depilación Zona Específica','Servicio de depilación en zonas seleccionadas',45,1,3,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(4,'ESTETICA','Limpieza Facial','Tratamiento de limpieza facial profesional',60,1,4,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(5,'ESTETICA','Hidratación Facial','Tratamiento de hidratación intensiva',45,1,5,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(6,'OTROS','Servicio Adicional','Servicios varios adicionales',30,1,6,'2026-02-22 16:16:33','2026-02-22 16:16:33');
/*!40000 ALTER TABLE `servicios_catalogo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes`
--

DROP TABLE IF EXISTS `solicitudes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes` (
  `id_solicitud` int(11) NOT NULL AUTO_INCREMENT,
  `categoria` enum('ALQUILER','BANDA','BANDAS','SERVICIOS','TALLERES') NOT NULL,
  `id_cliente` int(11) NOT NULL COMMENT 'FK a clientes.id_cliente',
  `id_usuario_creador` int(11) DEFAULT NULL COMMENT 'FK a usuarios.id_usuario - quién creó (admin/staff o el cliente)',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` varchar(50) DEFAULT 'Solicitado',
  `es_publico` tinyint(1) DEFAULT 0 COMMENT 'Visibilidad pública de la solicitud',
  `descripcion_corta` varchar(255) DEFAULT NULL,
  `descripcion_larga` text DEFAULT NULL,
  `url_flyer` mediumtext DEFAULT NULL COMMENT 'URL del flyer/cartel/promocional',
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_solicitud`),
  KEY `idx_categoria` (`categoria`),
  KEY `idx_estado` (`estado`),
  KEY `idx_es_publico` (`es_publico`),
  KEY `idx_cliente_id` (`id_cliente`),
  KEY `idx_usuario_creador` (`id_usuario_creador`),
  CONSTRAINT `fk_solicitudes_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_solicitudes_usuario_creador` FOREIGN KEY (`id_usuario_creador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes`
--

LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
INSERT INTO `solicitudes` VALUES (1,'ALQUILER',1,NULL,'2026-03-13 04:29:21','Solicitado',0,'Cumpleaños infantil 50 personas','Cumpleaños infantil para una niña de 8 años. Necesitamos inflable, servicio de cocinero y setup básico.',NULL,'2026-03-13 04:29:21'),(2,'ALQUILER',2,NULL,'2026-03-13 04:29:21','Confirmado',0,'Fiesta de 15 años - Servicio completo','Fiesta de 15 años. Contratamos servicio completo con meseras, bartender y sonido profesional.',NULL,'2026-03-13 04:29:21'),(3,'ALQUILER',3,NULL,'2026-03-13 04:29:21','Solicitado',0,'Baby shower 40 personas','Baby shower temático con 40 invitados. Necesitamos inflable de princesa y decoraciones.',NULL,'2026-03-13 04:29:21'),(4,'BANDAS',4,NULL,'2026-03-13 04:29:21','Confirmado',1,'Reite - Fecha Propia','Tributo a La Renga solicita fecha propia. Esperan público de 250 personas.',NULL,'2026-03-13 04:29:21'),(5,'BANDAS',5,NULL,'2026-03-13 04:29:21','Confirmado',1,'Las Mentas Show','Banda de rock femenino solicita fecha con formato de show abierto al público general.','/uploads/flyers/solicitud_5.jpg','2026-03-13 04:29:31'),(6,'BANDAS',4,NULL,'2026-03-13 04:29:21','Confirmado',1,'Termidor Fest','Rock nacional solicita fecha compartida con banda telonera. Esperan 200 personas.','/uploads/flyers/solicitud_6.jpeg','2026-03-27 18:44:36'),(7,'SERVICIOS',1,NULL,'2026-03-13 04:29:21','Solicitado',0,'Taller de Fotografía de Eventos','Taller teórico-práctico de fotografía profesional para eventos. 4 horas de instrucción.',NULL,'2026-03-13 04:29:21'),(8,'TALLERES',2,NULL,'2026-03-13 04:29:21','Confirmado',1,'Taller de Masaje Descontracturante','Sesión grupal de masaje descontracturante para empleados.',NULL,'2026-03-13 04:29:21');
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_adicionales`
--

DROP TABLE IF EXISTS `solicitudes_adicionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_adicionales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud_alquiler` int(11) NOT NULL COMMENT 'FK a solicitudes_alquiler.id_solicitud_alquiler',
  `adicional_nombre` varchar(255) NOT NULL,
  `adicional_precio` decimal(10,2) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_solicitudes_adicionales_alquiler_id` (`id_solicitud_alquiler`),
  CONSTRAINT `fk_solicitudes_adicionales_alquiler` FOREIGN KEY (`id_solicitud_alquiler`) REFERENCES `solicitudes_alquiler` (`id_solicitud_alquiler`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_adicionales`
--

LOCK TABLES `solicitudes_adicionales` WRITE;
/*!40000 ALTER TABLE `solicitudes_adicionales` DISABLE KEYS */;
INSERT INTO `solicitudes_adicionales` VALUES (1,2,'Mesa extra',5000.00,'2026-03-13 04:29:21'),(2,2,'Sillas extras (4)',1200.00,'2026-03-13 04:29:21'),(3,2,'Servicio de fotografía',8000.00,'2026-03-13 04:29:21'),(4,1,'Manteles personalizados',30000.00,'2026-03-13 04:29:21');
/*!40000 ALTER TABLE `solicitudes_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_alquiler`
--

DROP TABLE IF EXISTS `solicitudes_alquiler`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_alquiler` (
  `id_solicitud_alquiler` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Identificador único del registro de alquiler',
  `id_solicitud` int(11) NOT NULL COMMENT 'FK a solicitudes.id_solicitud - Referencia a solicitud padre (1:1)',
  `fecha_evento` date NOT NULL COMMENT 'Fecha del evento (ej: 2026-03-15)',
  `hora_evento` time NOT NULL COMMENT 'Hora de inicio del evento - CAMBIO: TEXT→TIME (ej: 14:30:00)',
  `duracion` int(11) NOT NULL COMMENT 'Duración del evento en minutos - CAMBIO: VARCHAR→INT (ej: 240 = 4 horas)',
  `id_tipo_evento` varchar(255) NOT NULL COMMENT 'FK a opciones_tipos.id_tipo_evento (ej: INFANTILES, ADOLESCENTES, CON_SERVICIO_DE_MESA, BABY_SHOWERS)',
  `id_precio_vigencia` int(11) DEFAULT NULL COMMENT 'NUEVO FK: precios_vigencia.id - Permite obtener cantidad_min, cantidad_max y precio_por_hora. NULL si no se puede determinar el rango',
  `cantidad_personas` int(11) DEFAULT NULL COMMENT 'Cantidad de personas para el evento (deducida de id_precio_vigencia). Se denormaliza aquí para facilitar queries y búsqueda rápida',
  `precio_basico` decimal(10,2) DEFAULT NULL COMMENT 'Precio base = precio_por_hora × duracion_horas. Capturado en momento de solicitud',
  `total_adicionales` decimal(10,2) DEFAULT 0.00 COMMENT 'NUEVO: Suma total de precios de adicionales seleccionados. Se actualiza en guardarAdicionales()',
  `monto_sena` decimal(10,2) DEFAULT 0.00 COMMENT 'NUEVO: Monto de seña (adelanto) requerido según opciones_tipos',
  `monto_deposito` decimal(10,2) DEFAULT 0.00 COMMENT 'NUEVO: Monto de depósito de garantía según opciones_tipos',
  `precio_final` decimal(10,2) GENERATED ALWAYS AS (`precio_basico` + coalesce(`total_adicionales`,0) + coalesce(`monto_sena`,0) + coalesce(`monto_deposito`,0)) STORED COMMENT 'NUEVO GENERADO: precio_basico + total_adicionales + monto_sena + monto_deposito (calculado automáticamente)',
  `comentarios` text DEFAULT NULL COMMENT 'CAMBIO: Renombrado de descripcion. Comentarios/detalles del cliente capturados en campo "¿Algo más?" durante solicitud o finalización',
  PRIMARY KEY (`id_solicitud_alquiler`),
  KEY `idx_id_tipo_evento` (`id_tipo_evento`),
  KEY `idx_id_precio_vigencia` (`id_precio_vigencia`),
  KEY `idx_id_solicitud` (`id_solicitud`),
  CONSTRAINT `fk_solicitudes_alquiler_precio_vigencia` FOREIGN KEY (`id_precio_vigencia`) REFERENCES `precios_vigencia` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_solicitudes_alquiler_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes` (`id_solicitud`) ON DELETE CASCADE,
  CONSTRAINT `fk_solicitudes_alquiler_tipo_evento` FOREIGN KEY (`id_tipo_evento`) REFERENCES `opciones_tipos` (`id_tipo_evento`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Detalles específicos de solicitudes de alquiler de salones. Normalizado con FKs a opciones_tipos y precios_vigencia. Refactorización 28/02/2026';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_alquiler`
--

LOCK TABLES `solicitudes_alquiler` WRITE;
/*!40000 ALTER TABLE `solicitudes_alquiler` DISABLE KEYS */;
INSERT INTO `solicitudes_alquiler` VALUES (1,1,'2026-03-15','14:00:00',240,'INFANTILES',1,45,55000.00,0.00,0.00,0.00,55000.00,'Incluye inflable cocodrilo y cocinera'),(2,2,'2026-03-22','18:00:00',360,'CON_SERVICIO_DE_MESA',4,80,80000.00,0.00,0.00,0.00,80000.00,'Servicio completo: meseras, bartender, sonido'),(3,3,'2026-03-28','12:00:00',180,'BABY_SHOWERS',3,35,50000.00,0.00,0.00,0.00,50000.00,'Inflable princesa y servicio básico');
/*!40000 ALTER TABLE `solicitudes_alquiler` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_fechas_bandas`
--

DROP TABLE IF EXISTS `solicitudes_fechas_bandas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_fechas_bandas` (
  `id_solicitud` int(11) NOT NULL COMMENT 'FK a solicitudes.id_solicitud',
  `id_banda` int(11) DEFAULT NULL COMMENT 'FK opcional a bandas_artistas: si el solicitante es una banda conocida, o para referencia a la banda principal',
  `fecha_evento` date DEFAULT NULL,
  `hora_evento` varchar(20) DEFAULT NULL,
  `duracion` varchar(100) DEFAULT NULL,
  `precio_basico` decimal(10,2) DEFAULT NULL,
  `precio_final` decimal(10,2) DEFAULT NULL,
  `precio_anticipada` decimal(10,2) DEFAULT NULL COMMENT 'Precio de venta anticipada',
  `precio_puerta` decimal(10,2) DEFAULT NULL COMMENT 'Precio de puerta / venta en puerta',
  `cantidad_bandas` int(11) DEFAULT 1,
  `expectativa_publico` varchar(100) DEFAULT NULL COMMENT 'Traducido en la UI como aforo_maximo; máximo templo 150 personas',
  `bandas_json` longtext DEFAULT NULL COMMENT 'JSON array de bandas: [{id_banda, nombre, orden_show, es_principal}] - ÚNICA FUENTE DE VERDAD',
  `fecha_alternativa` date DEFAULT NULL,
  `notas_admin` text DEFAULT NULL,
  `id_evento_generado` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_solicitud`),
  KEY `idx_fecha` (`fecha_evento`),
  KEY `idx_banda` (`id_banda`),
  CONSTRAINT `solicitudes_fechas_bandas_ibfk_1` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes` (`id_solicitud`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_fechas_bandas_ibfk_2` FOREIGN KEY (`id_banda`) REFERENCES `bandas_artistas` (`id_banda`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Solicitudes de fechas/shows para bandas (3NF)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_fechas_bandas`
--

LOCK TABLES `solicitudes_fechas_bandas` WRITE;
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` DISABLE KEYS */;
INSERT INTO `solicitudes_fechas_bandas` VALUES (4,1,'2026-03-30','22:00','3 horas',100000.00,120000.00,100000.00,120000.00,1,'250 personas','[{\"id_banda\":1,\"nombre\":\"Reite\",\"orden_show\":1,\"es_principal\":true}]',NULL,NULL,NULL),(5,3,'2026-04-10','20:00','2.5 horas',100000.00,120000.00,100000.00,120000.00,1,'180 personas','[{\"id_banda\":3,\"nombre\":\"Las Mentas\",\"orden_show\":1,\"es_principal\":true}]',NULL,NULL,NULL),(6,2,'2026-04-18','21:30','4 horas',120000.00,120000.00,100000.00,120000.00,3,'120','[{\"id_banda\":29,\"nombre\":\"India Madre\",\"orden_show\":0,\"es_principal\":true},{\"id_banda\":33,\"nombre\":\"KorGue\",\"orden_show\":1,\"es_principal\":false},{\"id_banda\":27,\"nombre\":\"Defensores de la fe\",\"orden_show\":2,\"es_principal\":false}]',NULL,NULL,5);
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_personal`
--

DROP TABLE IF EXISTS `solicitudes_personal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_personal` (
  `id_solicitud_personal` int(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud` int(11) NOT NULL,
  `id_personal` varchar(50) DEFAULT NULL,
  `rol_requerido` varchar(100) NOT NULL,
  `estado` varchar(50) DEFAULT 'asignado' COMMENT 'asignado, confirmado, cancelado',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_solicitud_personal`),
  KEY `idx_solicitud` (`id_solicitud`),
  KEY `idx_personal` (`id_personal`),
  CONSTRAINT `solicitudes_personal_ibfk_1` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes` (`id_solicitud`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Asignaciones de personal a solicitudes antes de confirmarse como eventos';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_personal`
--

LOCK TABLES `solicitudes_personal` WRITE;
/*!40000 ALTER TABLE `solicitudes_personal` DISABLE KEYS */;
/*!40000 ALTER TABLE `solicitudes_personal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_servicios`
--

DROP TABLE IF EXISTS `solicitudes_servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_servicios` (
  `id_solicitud_servicio` int(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud` int(11) NOT NULL COMMENT 'FK a solicitudes.id_solicitud',
  `tipo_servicio` varchar(255) DEFAULT NULL,
  `fecha_evento` date DEFAULT NULL,
  `hora_evento` varchar(20) DEFAULT NULL,
  `duracion` varchar(100) DEFAULT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_solicitud_servicio`),
  KEY `fk_solicitudes_servicios_solicitud` (`id_solicitud`),
  CONSTRAINT `fk_solicitudes_servicios_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes` (`id_solicitud`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Solicitudes de servicios';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_servicios`
--

LOCK TABLES `solicitudes_servicios` WRITE;
/*!40000 ALTER TABLE `solicitudes_servicios` DISABLE KEYS */;
INSERT INTO `solicitudes_servicios` VALUES (1,7,'Taller Educativo','2026-03-15','15:00','4 horas',3000.00);
/*!40000 ALTER TABLE `solicitudes_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_talleres`
--

DROP TABLE IF EXISTS `solicitudes_talleres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_talleres` (
  `id_solicitud_taller` int(11) NOT NULL AUTO_INCREMENT,
  `id_solicitud` int(11) NOT NULL COMMENT 'FK a solicitudes.id_solicitud',
  `nombre_taller` varchar(255) DEFAULT NULL,
  `fecha_evento` date DEFAULT NULL,
  `hora_evento` varchar(20) DEFAULT NULL,
  `duracion` varchar(100) DEFAULT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_solicitud_taller`),
  KEY `fk_solicitudes_talleres_solicitud` (`id_solicitud`),
  CONSTRAINT `fk_solicitudes_talleres_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes` (`id_solicitud`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Solicitudes de talleres';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_talleres`
--

LOCK TABLES `solicitudes_talleres` WRITE;
/*!40000 ALTER TABLE `solicitudes_talleres` DISABLE KEYS */;
INSERT INTO `solicitudes_talleres` VALUES (1,8,'Masaje Descontracturante Grupal','2026-03-08','10:00','90 minutos',2500.00);
/*!40000 ALTER TABLE `solicitudes_talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `talleres`
--

DROP TABLE IF EXISTS `talleres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `talleres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_taller_id` varchar(255) NOT NULL COMMENT 'FK a opciones_tipos.id_tipo_evento',
  `tallerista_id` int(11) DEFAULT NULL COMMENT 'FK a talleristas.id',
  `id_cliente` int(11) DEFAULT NULL COMMENT 'FK a clientes.id_cliente',
  `nombre` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `dia_semana` varchar(20) DEFAULT NULL COMMENT 'lunes, martes, etc.',
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `duracion_minutos` int(11) DEFAULT 60,
  `cupo_maximo` int(11) DEFAULT 15,
  `cupo_minimo` int(11) DEFAULT 3,
  `ubicacion` varchar(255) DEFAULT 'Salón TDC',
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tipo` (`tipo_taller_id`),
  KEY `idx_tallerista` (`tallerista_id`),
  KEY `idx_activo` (`activo`),
  KEY `idx_dia` (`dia_semana`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `talleres`
--

LOCK TABLES `talleres` WRITE;
/*!40000 ALTER TABLE `talleres` DISABLE KEYS */;
INSERT INTO `talleres` VALUES (1,'TALLER_DANZA',1,NULL,'Danza Contemporánea','Clases de danza contemporánea para adultos. Trabajo corporal, improvisación y técnica.','martes','19:00:00','20:30:00',90,12,4,'Salón TDC',1,'2026-03-18 18:42:25'),(2,'TALLER_DANZA',1,NULL,'Flamenco Inicial','Introducción al flamenco. Palmas, zapateado y movimiento de brazos. Apto para principiantes.','jueves','18:00:00','19:30:00',90,10,3,'Salón TDC',1,'2026-03-18 18:42:25'),(3,'TALLER_MUSICA',2,NULL,'Guitarra para Adultos','Guitarra popular y clásica para adultos. Lectura de cifrado y partituras básicas.','lunes','17:00:00','18:00:00',60,8,3,'Salón TDC',1,'2026-03-18 18:42:25'),(4,'TALLER_YOGA',3,NULL,'Hatha Yoga','Práctica de Hatha Yoga combinando posturas (asanas), respiración y relajación profunda.','miercoles','09:00:00','10:00:00',60,15,4,'Salón TDC',1,'2026-03-18 18:42:25'),(5,'TALLER_YOGA',3,NULL,'Yoga y Meditación','Sesión de Vinyasa Yoga fluido seguida de meditación guiada de 20 minutos.','sabado','10:00:00','11:30:00',90,15,4,'Salón TDC',1,'2026-03-18 18:42:25'),(6,'TALLER_ARTE',4,NULL,'Pintura y Técnicas Mixtas','Exploración libre con acrílicos, acuarelas y collage. Todas las edades.','viernes','16:00:00','18:00:00',120,10,3,'Salón TDC',1,'2026-03-18 18:42:25');
/*!40000 ALTER TABLE `talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `talleristas`
--

DROP TABLE IF EXISTS `talleristas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `talleristas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `especialidad` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `instagram` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_activo` (`activo`),
  KEY `idx_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `talleristas`
--

LOCK TABLES `talleristas` WRITE;
/*!40000 ALTER TABLE `talleristas` DISABLE KEYS */;
INSERT INTO `talleristas` VALUES (1,'Sofía Herrera','Danza contemporánea y flamenco','Bailarina y docente con 10 años de experiencia en danza contemporánea y flamenco. Formada en el IUNA.','1123456789','sofia.herrera@mail.com','@sofiaherrera.danza',1,'2026-03-18 18:42:12'),(2,'Marcos Delgado','Guitarra y teoría musical','Músico egresado del Conservatorio Municipal. Docente de guitarra clásica y popular desde 2015.','1134567890','marcos.delgado@mail.com','@marcosdelgado.musica',1,'2026-03-18 18:42:12'),(3,'Valeria Ríos','Yoga y meditación','Instructora certificada de Hatha y Vinyasa Yoga. Facilitadora de mindfulness y meditación guiada.','1145678901','valeria.rios@mail.com','@valeria.yoga',1,'2026-03-18 18:42:12'),(4,'Tomás Ferreira','Artes plásticas y manualidades','Artista plástico y docente. Trabaja con pintura, collage, arcilla y técnicas mixtas para todas las edades.','1156789012','tomas.ferreira@mail.com','@tomasferreira.arte',1,'2026-03-18 18:42:12');
/*!40000 ALTER TABLE `talleristas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_evento` int(11) NOT NULL,
  `nombre_comprador` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `cantidad` int(11) DEFAULT 1,
  `tipo_precio` enum('ANTICIPADA','PUERTA') DEFAULT 'ANTICIPADA',
  `total` decimal(10,2) NOT NULL,
  `codigo_cupon` varchar(50) DEFAULT NULL,
  `descuento_aplicado` decimal(10,2) DEFAULT 0.00,
  `codigo_confirmacion` varchar(20) NOT NULL,
  `estado` enum('pendiente','pagado','utilizado','cancelado') DEFAULT 'pendiente',
  `comprado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_confirmacion` (`codigo_confirmacion`),
  KEY `idx_evento` (`id_evento`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`id_evento`) REFERENCES `eventos_confirmados` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turnos_servicios`
--

DROP TABLE IF EXISTS `turnos_servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `turnos_servicios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `profesional_id` int(11) NOT NULL,
  `servicio_id` int(11) NOT NULL,
  `precio_id` int(11) DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `cliente_nombre` varchar(255) DEFAULT NULL,
  `cliente_telefono` varchar(20) DEFAULT NULL,
  `cliente_email` varchar(255) DEFAULT NULL,
  `monto` decimal(10,2) DEFAULT NULL,
  `pagado` tinyint(1) DEFAULT 0,
  `metodo_pago` varchar(50) DEFAULT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `profesional_id` (`profesional_id`),
  KEY `servicio_id` (`servicio_id`),
  KEY `precio_id` (`precio_id`),
  CONSTRAINT `turnos_servicios_ibfk_1` FOREIGN KEY (`profesional_id`) REFERENCES `profesionales_servicios` (`id`),
  CONSTRAINT `turnos_servicios_ibfk_2` FOREIGN KEY (`servicio_id`) REFERENCES `servicios_catalogo` (`id`),
  CONSTRAINT `turnos_servicios_ibfk_3` FOREIGN KEY (`precio_id`) REFERENCES `precios_servicios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turnos_servicios`
--

LOCK TABLES `turnos_servicios` WRITE;
/*!40000 ALTER TABLE `turnos_servicios` DISABLE KEYS */;
/*!40000 ALTER TABLE `turnos_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL COMMENT 'NULL si se registró vía OAuth',
  `nombre` varchar(255) DEFAULT NULL,
  `rol` enum('admin','staff','staff_readonly','cliente') DEFAULT 'cliente',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `proveedor_oauth` varchar(50) DEFAULT NULL COMMENT 'google, facebook, instagram',
  `id_oauth` varchar(500) DEFAULT NULL COMMENT 'ID único del proveedor',
  `token_oauth` varchar(1000) DEFAULT NULL COMMENT 'Token para futuras acciones',
  `foto_url` varchar(500) DEFAULT NULL COMMENT 'Foto de perfil del OAuth',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uk_oauth` (`proveedor_oauth`,`id_oauth`),
  KEY `idx_email` (`email`),
  KEY `idx_oauth` (`proveedor_oauth`,`id_oauth`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Usuarios del sistema con soporte OAuth';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'temploclaypole@gmail.com','$2a$10$d3C9.uYqlJaofNGk3Nc0AuKm3KN9sWhIQhuZCv67j0F9Jc5VsMm2W','Templo User','staff',1,'google','107386203679475316318',NULL,'https://lh3.googleusercontent.com/a/ACg8ocK9dwZoBaeK4ng93n4rTE_TLWgqd-VSfex5hfKVObbt06w0oIHl=s96-c','2026-03-13 04:29:21','2026-03-13 12:25:56'),(2,'villalbarodrigo2009@gmail.com','$2a$10$xT4ERvVKWABJlrrYPsJXWOZHTVsZtYp1uCm52pM23iHbdmAUlHlyu','Rodrigo Villalba','admin',1,'google','117318714094755139695',NULL,'https://lh3.googleusercontent.com/a/ACg8ocJGyiIz4tnQI40z1wg81HbfIeiPnmIl49oegEjoq5aFm0k-951Emg=s96-c','2026-03-13 04:29:21','2026-03-18 12:23:51');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-27 18:52:30
