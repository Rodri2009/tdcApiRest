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
-- Dumping data for table `asistencias_talleres`
--

LOCK TABLES `asistencias_talleres` WRITE;
/*!40000 ALTER TABLE `asistencias_talleres` DISABLE KEYS */;
/*!40000 ALTER TABLE `asistencias_talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `bandas_artistas`
--

LOCK TABLES `bandas_artistas` WRITE;
/*!40000 ALTER TABLE `bandas_artistas` DISABLE KEYS */;
INSERT INTO `bandas_artistas` (`id_banda`, `nombre`, `genero_musical`, `bio`, `instagram`, `facebook`, `twitter`, `tiktok`, `web_oficial`, `youtube`, `spotify`, `otras_redes`, `logo_url`, `foto_prensa_url`, `contacto_rol`, `id_cliente`, `verificada`, `activa`, `creado_en`, `actualizado_en`) VALUES (1,'Reite','Rock / Tributo','Tributo oficial a La Renga','@reitebanda','https://www.facebook.com/reitebanda','@reitebanda',NULL,'https://www.reitebanda.com','https://www.youtube.com/c/ReiteBanda','https://open.spotify.com/artist/reite',NULL,'/uploads/bandas/logo_reite.jpg',NULL,'Manager',8,1,1,'2026-03-13 04:29:21','2026-03-18 01:31:13'),(2,'Pateando Bares','Rock Nacional','Rock nacional con trayectoria','@pateando.bares','https://www.facebook.com/pateandobaresoficial','@pateandooficial','@pateandooficial','https://www.pateandobares.com.ar','https://www.youtube.com/pateandobaresoficial','https://open.spotify.com/artist/pateandooficial',NULL,NULL,NULL,'Productor',9,1,1,'2026-03-13 04:29:21','2026-03-18 01:31:13'),(3,'Las Mentas','Rock Alternativo','Banda femenina de rock alternativo','@lasmentasbanda','https://www.facebook.com/lasmentasbanda','@lasmentas_rock','@lasmentasbanda','https://www.lasmentas.com.ar','https://www.youtube.com/lasmentasbanda','https://open.spotify.com/artist/lasmentas','https://www.lasmentas.com.ar','/uploads/bandas/logo_las_mentas.jpeg',NULL,'Vocalista/Manager',10,1,1,'2026-03-13 04:29:21','2026-03-18 01:31:13'),(4,'Cumbia Sudaka','Cumbia / Tropical','Banda telonera festiva','@cumbiasudaka','https://www.facebook.com/cumbiasudaka','@cumbiasudaka',NULL,NULL,'https://www.youtube.com/cumbiasudaka','https://open.spotify.com/artist/cumbiasudaka',NULL,NULL,NULL,'Líder',11,1,1,'2026-03-13 04:29:21','2026-03-18 01:31:13'),(5,'Horcas','Heavy Metal / Thrash Metal','Banda histórica del heavy metal argentino fundada en 1988 por Osvaldo Civile, ex guitarrista de V8. Referente del metal nacional con extensa discografía y giras por todo el país.','@horcasoficial',NULL,NULL,NULL,NULL,'https://www.youtube.com/@horcasoficial','https://open.spotify.com/artist/horcas',NULL,'/uploads/bandas/logo_horcas.png',NULL,NULL,6,1,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(6,'Superlógico','Rock / Tributo a Patricio Rey','Banda tributo a Patricio Rey y sus Redonditos de Ricota con fuerte presencia en el circuito rockero del conurbano y CABA.','@superlogicotributo',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(7,'Pier','Rock Nacional','Banda argentina de rock formada en los años 90, conocida por canciones populares dentro del rock barrial.','@pieroficial',NULL,NULL,NULL,NULL,'https://www.youtube.com/@pieroficial','https://open.spotify.com/artist/pier',NULL,NULL,NULL,NULL,6,1,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(8,'Rey Garufa','Rock / Tributo Redondos','Banda tributo a Patricio Rey y sus Redonditos de Ricota con fuerte presencia en el circuito de bares y festivales rockeros.','@reygarufatributo',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(9,'Willy Quiroga','Rock / Hard Rock','Proyecto solista de Willy Quiroga, histórico bajista y cantante de Vox Dei, uno de los pioneros del rock argentino.','@willyquirogaoficial',NULL,NULL,NULL,NULL,'https://www.youtube.com/@willyquiroga','https://open.spotify.com/artist/willyquiroga',NULL,NULL,NULL,NULL,6,1,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(10,'Nomade 73','Rock Nacional','Banda de rock barrial del conurbano bonaerense con influencias del rock clásico argentino.','@nomade73',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_nomade_73.jpeg',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(11,'Territorio Caníbal','Hardcore / Metal','Banda de hardcore metal del circuito under del Gran Buenos Aires con presentaciones frecuentes en festivales independientes.','@territoriocanibal',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_territorio_canibal.png',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(12,'Ojo Animal','Stoner Rock / Hard Rock','Banda de stoner rock del circuito under argentino con influencias del hard rock clásico.','@ojoanimalband',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(13,'Falsa Euforia','Punk','Proyecto independiente del conurbano bonaerense dentro de la escena alternativa.','@falsaeuforia',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_falsa_euforia.jpg',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(14,'Cronorock','Rock Nacional','Banda independiente de rock nacional con presentaciones en bares y festivales under.','@cronorock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_cronorock.jpeg',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(15,'Ratucha','Punk Rock','Banda punk del circuito under del conurbano bonaerense con fuerte presencia en festivales autogestionados.','@ratuchapunk',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(16,'La Monky','Rock / Funk Rock','Banda independiente del circuito rockero del conurbano con influencias funk y rock alternativo.','@lamonkybanda',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_la_monky.jpg',NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(17,'Raros Ratones','Rock Alternativo','Banda emergente de rock alternativo dentro de la escena under del Gran Buenos Aires.','@rarosratones',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-13 04:29:21','2026-03-18 01:20:40'),(18,'La Locomotora','Hard Rock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_la_locomotora.png',NULL,NULL,6,0,1,'2026-03-13 13:02:06','2026-03-18 01:20:40'),(19,'Chat Tuchat',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_chat_tuchat.png',NULL,NULL,6,0,1,'2026-03-13 13:11:11','2026-03-18 01:20:40'),(20,'Capitan',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_capitan.png',NULL,NULL,6,0,1,'2026-03-13 13:11:50','2026-03-18 01:20:40'),(21,'El Centésimo Mono',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_el_centesimo_mono.jpeg',NULL,NULL,6,0,1,'2026-03-13 13:15:16','2026-03-18 01:20:40'),(22,'Industria','Punk',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_industria.jpg',NULL,NULL,6,0,1,'2026-03-13 13:17:24','2026-03-18 01:20:40'),(23,'Guarilo',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_guarilo.png',NULL,NULL,6,0,1,'2026-03-13 14:21:54','2026-03-18 01:20:40'),(24,'Le Debes Plata a la Banda','Rock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_le_debes_plata_a_la_banda.jpeg',NULL,NULL,6,0,1,'2026-03-13 14:23:24','2026-03-18 01:20:40'),(25,'Tricota','Rock',NULL,'@rocktricota',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/bandas/logo_tricota.jpeg',NULL,NULL,6,0,1,'2026-03-17 23:26:31','2026-03-17 23:43:14'),(26,'Nueva banda de prueba','Rap',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,6,0,1,'2026-03-17 23:39:44','2026-03-17 23:43:14');
/*!40000 ALTER TABLE `bandas_artistas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `bandas_formacion`
--

LOCK TABLES `bandas_formacion` WRITE;
/*!40000 ALTER TABLE `bandas_formacion` DISABLE KEYS */;
INSERT INTO `bandas_formacion` (`id`, `id_banda`, `nombre_integrante`, `id_instrumento`, `es_lider`, `notas`) VALUES (1,3,NULL,7,0,NULL),(2,3,NULL,3,0,NULL),(3,3,NULL,5,0,NULL),(4,3,NULL,8,0,NULL),(5,3,NULL,1,0,NULL),(6,18,NULL,3,0,NULL),(7,18,NULL,5,0,NULL),(8,18,NULL,8,0,NULL),(9,18,NULL,1,0,NULL),(10,25,NULL,8,0,NULL),(11,25,NULL,5,0,NULL),(12,25,NULL,1,0,NULL),(13,25,NULL,3,0,NULL),(14,26,NULL,24,0,NULL);
/*!40000 ALTER TABLE `bandas_formacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `catalogo_instrumentos`
--

LOCK TABLES `catalogo_instrumentos` WRITE;
/*!40000 ALTER TABLE `catalogo_instrumentos` DISABLE KEYS */;
INSERT INTO `catalogo_instrumentos` (`id_instrumento`, `nombre`, `categoria`, `icono`) VALUES (1,'Voz','Voz','fa-microphone'),(2,'Guitarra Acústica','Cuerdas','fa-guitar'),(3,'Guitarra Eléctrica','Cuerdas','fa-guitar'),(4,'Bajo Acústico','Cuerdas',NULL),(5,'Bajo Eléctrico','Cuerdas',NULL),(6,'Teclados','Electrónico','fa-keyboard'),(7,'Piano','Electrónico',NULL),(8,'Batería','Percusión','fa-drum'),(9,'Percusión Latina','Percusión',NULL),(10,'Violín','Cuerdas',NULL),(11,'Cello','Cuerdas',NULL),(12,'Flauta','Vientos',NULL),(13,'Saxofón','Vientos',NULL),(14,'Trompeta','Vientos',NULL),(15,'Trombón','Vientos',NULL),(16,'Armónica','Vientos',NULL),(17,'Acordeón','Electrónico',NULL),(18,'Boongos','Percusión',NULL),(19,'Congas','Percusión',NULL),(20,'Djembe','Percusión',NULL),(21,'Caja China','Percusión',NULL),(22,'Shaker','Percusión',NULL),(23,'Pandero','Percusión',NULL),(24,'Arpa','Cuerdas',NULL);
/*!40000 ALTER TABLE `catalogo_instrumentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `catalogo_roles`
--

LOCK TABLES `catalogo_roles` WRITE;
/*!40000 ALTER TABLE `catalogo_roles` DISABLE KEYS */;
INSERT INTO `catalogo_roles` (`id`, `nombre`, `descripcion`, `activo`, `creado_en`) VALUES (1,'Encargada','Responsable general del evento',1,'2026-02-22 16:16:33'),(2,'Cocinera','Preparación de alimentos',1,'2026-02-22 16:16:33'),(3,'Puerta','Recepción de invitados',1,'2026-02-22 16:16:33'),(4,'Mesera','Servicio de mesas',1,'2026-02-22 16:16:33'),(5,'Ayudante de cocina','Asistente en cocina',1,'2026-02-22 16:16:33'),(6,'Limpieza','Limpieza del salón',1,'2026-02-22 16:16:33'),(7,'Depiladora','Servicio de depilación',1,'2026-02-22 16:16:33'),(8,'Bartender','Manejo completo del Servicio de bar',1,'2026-02-22 16:16:33'),(9,'Sonido','Técnico de sonido',1,'2026-02-22 16:16:33'),(10,'DJ','Disc Jockey',1,'2026-02-22 16:16:33'),(11,'Seguridad','Personal de seguridad',1,'2026-02-22 16:16:33');
/*!40000 ALTER TABLE `catalogo_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` (`id_cliente`, `id_usuario`, `nombre`, `apellido`, `telefono`, `email`, `notas`, `creado_por_id_usuario`, `activo`, `creado_en`, `actualizado_en`) VALUES (1,NULL,'Juan','Pérez','+5491111111','juan@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(2,NULL,'María','González','+5491111112','maria@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(3,NULL,'Pedro','López','+5491111113','pedro@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(4,NULL,'Ana','Rodríguez','+5491111114','ana@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(5,NULL,'Carlos','Martínez','+5491111115','carlos@test.com',NULL,1,1,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(6,2,'Rodrigo Villalba',NULL,NULL,'villalbarodrigo2009@gmail.com',NULL,2,1,'2026-03-17 23:43:07','2026-03-17 23:43:07'),(7,1,'Templo User',NULL,NULL,'temploclaypole@gmail.com',NULL,1,1,'2026-03-17 23:43:07','2026-03-17 23:43:07'),(8,NULL,'Juan','Reite','1155001122','reite.tributo@gmail.com','Rol en banda: Manager (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),(9,NULL,'Marco','Sández','1155003344','pateando.bares@gmail.com','Rol en banda: Productor (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),(10,NULL,'Sol','Rodríguez','1155005566','lasmentas@gmail.com','Rol en banda: Vocalista/Manager (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13'),(11,NULL,'Carlos','Mendoza','1144445566','cumbia.sudaka@gmail.com','Rol en banda: Líder (migrado desde bandas_artistas.contacto_*)',NULL,1,'2026-03-18 01:31:13','2026-03-18 01:31:13');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `configuracion`
--

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` (`Clave`, `Valor`) VALUES ('ANTICIPACION_MAXIMA_DIAS','90'),('ANTICIPACION_MINIMA_DIAS','3'),('DIRECCION','Liniers 465, Claypole, Buenos Aires'),('EMAIL_CONTACTO','contacto@eltemplodeclaypole.com'),('HORARIO_ATENCION','Lunes a Sábado 10:00 - 22:00'),('NOMBRE_NEGOCIO','El Templo de Claypole'),('TELEFONO','1155630357');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `configuracion_horarios`
--

LOCK TABLES `configuracion_horarios` WRITE;
/*!40000 ALTER TABLE `configuracion_horarios` DISABLE KEYS */;
INSERT INTO `configuracion_horarios` (`id`, `id_tipo_evento`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES (1,'INFANTILES','todos','12:00:00','23:00:00'),(2,'INFANTILES','todos','13:00:00','23:00:00'),(3,'INFANTILES','todos','14:00:00','23:00:00'),(4,'INFANTILES','todos','16:00:00','23:00:00'),(5,'INFANTILES','todos','17:00:00','23:00:00'),(6,'INFANTILES','todos','18:00:00','23:00:00'),(7,'INFORMALES','todos','09:00:00','23:00:00'),(8,'INFORMALES','todos','10:00:00','23:00:00'),(9,'INFORMALES','todos','11:00:00','23:00:00'),(10,'INFORMALES','todos','12:00:00','23:00:00'),(11,'INFORMALES','todos','13:00:00','23:00:00'),(12,'INFORMALES','todos','14:00:00','23:00:00'),(13,'INFORMALES','sabado','15:00:00','02:00:00'),(14,'INFORMALES','sabado','16:00:00','02:00:00'),(15,'INFORMALES','sabado','17:00:00','02:00:00'),(16,'INFORMALES','sabado','18:00:00','02:00:00'),(17,'INFORMALES','sabado','19:00:00','02:00:00'),(18,'INFORMALES','sabado','20:00:00','02:00:00'),(19,'INFORMALES','sabado','21:00:00','02:00:00'),(20,'INFORMALES','sabado','22:00:00','02:00:00'),(21,'CON_SERVICIO_DE_MESA','todos','09:00:00','23:00:00'),(22,'CON_SERVICIO_DE_MESA','todos','10:00:00','23:00:00'),(23,'CON_SERVICIO_DE_MESA','todos','11:00:00','23:00:00'),(24,'CON_SERVICIO_DE_MESA','todos','12:00:00','23:00:00'),(25,'CON_SERVICIO_DE_MESA','sabado','18:00:00','02:00:00'),(26,'CON_SERVICIO_DE_MESA','sabado','19:00:00','02:00:00'),(27,'CON_SERVICIO_DE_MESA','sabado','20:00:00','02:00:00'),(28,'CON_SERVICIO_DE_MESA','sabado','21:00:00','02:00:00'),(29,'BABY_SHOWERS','todos','12:00:00','23:00:00'),(30,'BABY_SHOWERS','todos','13:00:00','23:00:00'),(31,'BABY_SHOWERS','todos','14:00:00','23:00:00'),(32,'BABY_SHOWERS','todos','16:00:00','23:00:00'),(33,'BABY_SHOWERS','sabado','17:00:00','02:00:00'),(34,'BABY_SHOWERS','sabado','18:00:00','02:00:00'),(35,'ADOLESCENTES','todos','12:00:00','23:00:00'),(36,'ADOLESCENTES','todos','13:00:00','23:00:00'),(37,'ADOLESCENTES','todos','14:00:00','23:00:00'),(38,'ADOLESCENTES','todos','16:00:00','23:00:00'),(39,'ADOLESCENTES','sabado','17:00:00','02:00:00'),(40,'ADOLESCENTES','sabado','18:00:00','02:00:00'),(41,'FECHA_BANDAS','todos','12:00:00','23:00:00'),(42,'FECHA_BANDAS','sabado','21:00:00','02:00:00');
/*!40000 ALTER TABLE `configuracion_horarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `costos_personal_vigencia`
--

LOCK TABLES `costos_personal_vigencia` WRITE;
/*!40000 ALTER TABLE `costos_personal_vigencia` DISABLE KEYS */;
INSERT INTO `costos_personal_vigencia` (`id`, `rol`, `fecha_de_vigencia`, `costo_por_hora`, `viaticos`) VALUES (1,'Encargada','2025-08-01',5000.00,0.00),(2,'Bartender','2025-08-01',5000.00,0.00),(3,'Cocinera','2025-08-01',3500.00,0.00),(4,'Puerta','2025-08-01',3500.00,1000.00),(5,'Ayudante de cocina','2025-08-01',3000.00,0.00),(6,'Mesera','2025-08-01',3000.00,0.00),(7,'Limpieza','2025-09-01',3500.00,1200.00),(8,'Sonido','2025-08-01',4000.00,500.00),(9,'DJ','2025-08-01',4500.00,0.00),(10,'Seguridad','2025-08-01',4000.00,1000.00);
/*!40000 ALTER TABLE `costos_personal_vigencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `cupones`
--

LOCK TABLES `cupones` WRITE;
/*!40000 ALTER TABLE `cupones` DISABLE KEYS */;
/*!40000 ALTER TABLE `cupones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `eventos_bandas_invitadas`
--

LOCK TABLES `eventos_bandas_invitadas` WRITE;
/*!40000 ALTER TABLE `eventos_bandas_invitadas` DISABLE KEYS */;
/*!40000 ALTER TABLE `eventos_bandas_invitadas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `eventos_confirmados`
--

LOCK TABLES `eventos_confirmados` WRITE;
/*!40000 ALTER TABLE `eventos_confirmados` DISABLE KEYS */;
INSERT INTO `eventos_confirmados` (`id`, `id_solicitud`, `tipo_evento`, `tabla_origen`, `nombre_evento`, `descripcion`, `url_flyer`, `fecha_evento`, `hora_inicio`, `duracion_estimada`, `id_cliente`, `es_publico`, `activo`, `genero_musical`, `cantidad_personas`, `tipo_servicio`, `nombre_taller`, `confirmado_en`, `actualizado_en`, `cancelado_en`) VALUES (1,2,'ALQUILER_SALON','solicitudes_alquiler','Fiesta de 15 años - Luz','Fiesta de quince años con servicio completo de catering, meseras y sonido profesional.',NULL,'2026-03-22','16:00:00','6 horas',2,0,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(2,4,'BANDA','solicitudes_fechas_bandas','Reite - Tributo a La Renga','Show completo del tributo a La Renga. Viernes noche. Fecha propia confirmada.',NULL,'2026-03-30','22:00:00','3 horas',1,1,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(3,5,'BANDA','solicitudes_fechas_bandas','Las Mentas en Vivo','Show abierto al público de la banda Las Mentas. Rock alternativo de buena calidad.',NULL,'2026-04-10','20:00:00','2.5 horas',5,1,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(4,8,'TALLER','solicitudes_talleres','Taller de Masaje Descontracturante','Sesión grupal de masaje descontracturante. Técnicas relajantes y terapéuticas.',NULL,'2026-03-08','10:00:00','90 minutos',2,1,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL);
/*!40000 ALTER TABLE `eventos_confirmados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `eventos_lineup`
--

LOCK TABLES `eventos_lineup` WRITE;
/*!40000 ALTER TABLE `eventos_lineup` DISABLE KEYS */;
/*!40000 ALTER TABLE `eventos_lineup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `eventos_personal`
--

LOCK TABLES `eventos_personal` WRITE;
/*!40000 ALTER TABLE `eventos_personal` DISABLE KEYS */;
/*!40000 ALTER TABLE `eventos_personal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `inscripciones_talleres`
--

LOCK TABLES `inscripciones_talleres` WRITE;
/*!40000 ALTER TABLE `inscripciones_talleres` DISABLE KEYS */;
/*!40000 ALTER TABLE `inscripciones_talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `opciones_adicionales`
--

LOCK TABLES `opciones_adicionales` WRITE;
/*!40000 ALTER TABLE `opciones_adicionales` DISABLE KEYS */;
INSERT INTO `opciones_adicionales` (`id_opciones_adicionales`, `nombre`, `precio`, `descripcion`, `url_imagen`) VALUES (1,'Inflable Cocodrilo',30000.00,'Inflable con forma de cocodrilo de 4x7 metros con tobogan','https://lh3.googleusercontent.com/pw/AP1GczM9WbWMorMn_fPb7f9_uS7-IWAsKEj0LcCn8Zvi7U14_7Kjdjge28_RV50Gcu7wkinQk_W5mK5NFNXh1iFjv-Uq-EHjvQWigm3TcSlMvNhhM3ZOZMT05WkaWaxuL-QNciykkIuCmLe0YwQYRrFieHTl=w394-h231-s-no-gm?authuser=0'),(2,'Inflable Mickey/Minnie',25000.00,'Inflable de 4x4 metros con caras gigantes de Mickey y Minnie','https://lh3.googleusercontent.com/pw/AP1GczMQl1ffjotYB0j0jFCInMgBquqvsgAITDe31BuKk14RFS3Bky5eSfrTjuDJFDCqZ8bAkeVK1xqPFz3xzJBw8R_YXNyS6Zo0ZIytnwaHNIQCJvghvfhwP5xetCI7Xg2cVqFmbbDUuJ3Cv_-SHFU3BI6f=w340-h358-s-no-gm?authuser=0'),(3,'Inflable Princesa',22000.00,'Inflable temática Princesas de 3x3 metros','https://lh3.googleusercontent.com/pw/AP1GczOYtkKsvQOWJsscPoXvPKxmGWHFzXBUCnWMVr3jyPXvQLDPJFLKivYfqf0HP0DCFCiDZeuF_OHT2Dg7mY5gdOva0YQL94uS9aGQOhRviny_ZNoIPCAR-9p5x2gOXjrNYaAIzRnEKbOOqseXBmWgwfnT=w377-h360-s-no-gm?authuser=0'),(4,'Inflable Spiderman',22000.00,'Inflable temática Hombre Araña de 3x3 metros','https://lh3.googleusercontent.com/pw/AP1GczOlO48NaDkNnHM_ZPKJT-4eHH36bUYMJUZFlAObTvGgIgHy6H0hwaSbyxFJvAjmIrucr12rvG2FTpeLcezzfGBVUCmADUhhTYXZAUdUPw4bw2gdvjts1P-GOH4XPD3MrxLG3AfhHWlHtnk2IosfgBhl=w418-h349-s-no-gm?authuser=0'),(5,'Cama elástica',30000.00,'Cama elástica con red lateral para niños hasta 10 años','https://lh3.googleusercontent.com/pw/AP1GczMM-aZTEqkYM4KlsY5A79dD5IMy03IVXb0EgLUWVPlflvdfCikVlgkn3p6PVwELvS4qtBoD9HGf8LiIVAHNIuTzn3FxMxYcIecyqjeE1Ew-PZfl723Rt1kQGs-ClWpThLxG77uaRM153VQfVvD4O8fJ=w700-h933-s-no-gm?authuser=0'),(6,'Manteles negros con camino blanco',30000.00,'Manteles negros con camino blanco para todas las mesas','https://lh3.googleusercontent.com/pw/AP1GczPfoLiluF0pE9tFCtHRtuXpK0pFM3BQRZ97t81cE9aapbIAzlsJ5srLNeaJYfmI_2F247p2zH33ilH6oW3D-N_nM7BQKZL0CcrE49wNHZ1hQALYnGrsjMk3VsdwQ66In8Ub11R8bW8rD4Riyl6WJTjp=w999-h779-s-no-gm?authuser=0'),(7,'Manteles negros sólos',20000.00,'Manteles negros para todas las mesas','https://lh3.googleusercontent.com/pw/AP1GczOSpOTKTwuEAckvaWRc8thYEivYe0el_Fno_l6-ylS331QQaBD7L8zRVPQ1BVBXGdCjdyFbinue3OMV6BtZXpndGSbE4AuCCH710iGesDuGLotzH3gHsirHRral9vmMs-x8pG1S-rrSV0odj9BLrCSV=w800-h749-s-no-gm?authuser=0'),(8,'Decoración HBD Completa',390000.00,'Decoración temática Happy Birthday con globos y accesorios','https://via.placeholder.com/400?text=Decoracion+HBD'),(9,'Kit Números y Globos',950000.00,'Globos de números gigantes + decoraciones','https://via.placeholder.com/400?text=Globos+Numeros'),(10,'Decoración Boho',969000.00,'Decoración temática boho con arco de globos y mesas','https://via.placeholder.com/400?text=Decoracion+Boho'),(11,'Globos Comic (helio)',59000.00,'Pack de globos radionde con helio temático comic','https://via.placeholder.com/400?text=Globos+Comic'),(12,'Gazebo 3x5m',20000.00,'Carpa/Gazebo para sombra y ambientación','https://i.imgur.com/0FhGJ1S.png'),(13,'Sillas Plásticas (10 unidades)',15000.00,'Alquiler de 10 sillas plásticas para eventos','https://via.placeholder.com/400?text=Sillas+10pcs'),(14,'Toldo/Carpa 3x5m',20000.00,'Carpa para sombra de 3x5 metros','https://via.placeholder.com/400?text=Carpa+3x5m'),(15,'Cama Elástica (basica)',120000.00,'Cama elástica básica para niños','https://via.placeholder.com/400?text=Cama+Elastica'),(16,'Livings Infantiles',40000.00,'Juego de livings infantiles para eventos','https://i.imgur.com/GnYzLQJ.png'),(17,'Gazebo Decorativo',50000.00,'Gazebo para ambientación en fiestas','https://via.placeholder.com/400?text=Gazebo+Decorativo'),(18,'Set Globos Helio (30 unidades)',8000.00,'Set de 30 globos con helio para decoración','https://via.placeholder.com/400?text=Globos+Helio+30'),(19,'Centro de Mesa Elegante',10000.00,'Centro de mesa decorativo para eventos','https://via.placeholder.com/400?text=Centro+Mesa'),(20,'Luces LED Ambientación',12000.00,'Luces LED para ambientación de eventos','https://via.placeholder.com/400?text=Luces+LED');
/*!40000 ALTER TABLE `opciones_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `opciones_adicionales_x_tipo_evento`
--

LOCK TABLES `opciones_adicionales_x_tipo_evento` WRITE;
/*!40000 ALTER TABLE `opciones_adicionales_x_tipo_evento` DISABLE KEYS */;
INSERT INTO `opciones_adicionales_x_tipo_evento` (`id`, `id_opciones_adicionales`, `id_tipo_evento`, `precio_especifico`, `activo`) VALUES (1,1,'INFANTILES',NULL,1),(2,2,'INFANTILES',NULL,1),(3,3,'INFANTILES',NULL,1),(4,4,'INFANTILES',NULL,1),(5,5,'INFANTILES',NULL,1),(6,8,'INFANTILES',NULL,1),(7,4,'ADOLESCENTES',NULL,1),(8,5,'ADOLESCENTES',8000.00,1),(9,6,'ADOLESCENTES',5000.00,1),(10,7,'BABY_SHOWERS',15000.00,1),(11,8,'BABY_SHOWERS',4000.00,1),(12,9,'CON_SERVICIO_DE_MESA',12000.00,1),(13,10,'CON_SERVICIO_DE_MESA',6000.00,1),(14,11,'CON_SERVICIO_DE_MESA',20000.00,1),(15,2,'INFORMALES',5000.00,1),(16,3,'INFORMALES',3000.00,1),(17,4,'FECHA_BANDAS',NULL,1),(18,5,'FECHA_BANDAS',8000.00,1),(19,6,'FECHA_BANDAS',5000.00,1),(20,12,'FECHA_BANDAS',25000.00,1);
/*!40000 ALTER TABLE `opciones_adicionales_x_tipo_evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `opciones_duracion`
--

LOCK TABLES `opciones_duracion` WRITE;
/*!40000 ALTER TABLE `opciones_duracion` DISABLE KEYS */;
INSERT INTO `opciones_duracion` (`id`, `id_tipo_evento`, `duracion_horas`, `descripcion`) VALUES (1,'INFANTILES',3,'3 horas'),(2,'INFANTILES',4,'4 horas'),(3,'INFANTILES',5,'5 horas'),(4,'INFORMALES',4,'4 horas'),(5,'INFORMALES',6,'6 horas'),(6,'INFORMALES',8,'8 horas'),(7,'INFORMALES',10,'10 horas'),(8,'CON_SERVICIO_DE_MESA',4,'4 horas'),(9,'CON_SERVICIO_DE_MESA',6,'6 horas'),(10,'CON_SERVICIO_DE_MESA',8,'8 horas'),(11,'CON_SERVICIO_DE_MESA',10,'10 horas'),(12,'BABY_SHOWERS',3,'3 horas'),(13,'BABY_SHOWERS',4,'4 horas'),(14,'BABY_SHOWERS',5,'5 horas'),(15,'BABY_SHOWERS',6,'6 horas'),(16,'ADOLESCENTES',3,'3 horas'),(17,'ADOLESCENTES',4,'4 horas'),(18,'ADOLESCENTES',5,'5 horas'),(19,'FECHA_BANDAS',5,'5 horas'),(20,'FECHA_BANDAS',6,'6 horas'),(21,'FECHA_BANDAS',7,'7 horas'),(22,'FECHA_BANDAS',8,'8 horas');
/*!40000 ALTER TABLE `opciones_duracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `opciones_tipos`
--

LOCK TABLES `opciones_tipos` WRITE;
/*!40000 ALTER TABLE `opciones_tipos` DISABLE KEYS */;
INSERT INTO `opciones_tipos` (`id_tipo_evento`, `nombre_para_mostrar`, `descripcion`, `categoria`, `es_publico`, `permite_adicionales`, `monto_sena`, `deposito`) VALUES ('ADOLESCENTES','CUMPLEAÑOS PARA ADOLESCENTES   (de 13 a 17 años)','🎧 **CUMPLEAÑOS ADOLESCENTES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina con cocinera\n• Metegoles, Ping Pong, Pool, Jenga\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Música y juego de luces\n• 20 min previos para decoración\n\n❌ **NO INCLUYE:** Cancha de fútbol','ALQUILER_SALON',1,1,50000.00,80000.00),('BABY_SHOWERS','BABY SHOWERS / BAUTISMOS / COMUNIONES','👶 **BABY SHOWERS / BAUTISMOS / COMUNIONES**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina con cocinera\n• Inflable 3x3\n• Metegoles, Ping Pong, Pool\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Música y luces\n• Cancha (niños hasta 12)\n\n❌ **NO INCLUYE:** Meseras, animación, vajilla de metal','ALQUILER_SALON',1,1,50000.00,NULL),('CON_SERVICIO_DE_MESA','FIESTA de 15 / 18 / casamiento (SERVICIO COMPLETO)','🌟 **SERVICIO COMPLETO**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Cocinera y uso completo de cocina\n• Meseras según cantidad\n• Mesas, sillas y mantelería\n• Vajilla de cristal y cubiertos de metal\n• Sonido profesional PA JBL\n• Backline para bandas\n• Baño equipado\n\n❌ **NO INCLUYE:** DJ, decoración, cancha de fútbol','ALQUILER_SALON',1,0,80000.00,NULL),('DEPILACION','Depilación','🌸 **DEPILACIÓN**\n\nZonas: Piernas, Brazos, Cavado, Bozo, Axilas\nMétodo: Cera tibia descartable','SERVICIOS',1,0,NULL,NULL),('DEPILACION_DEFINITIVA','Depilación Definitiva','⚡ **DEPILACIÓN DEFINITIVA**','SERVICIOS',0,0,NULL,NULL),('ESTETICA','Estética','✨ **ESTÉTICA**\n\nTratamientos: Limpieza facial, Hidratación, Anti-age, Acné','SERVICIOS',1,0,NULL,NULL),('FECHA_BANDAS','Fecha para bandas en vivo','🎸 **FECHA PARA BANDAS**\n\n✅ **INCLUYE:**\n• Coordinación de bandas\n• Flyers y publicaciones\n• Encargada de puerta\n• Uso de cocina\n• Sonido profesional\n• Backline completo','FECHA_BANDAS',0,0,NULL,NULL),('INFANTILES','CUMPLE INFANTIL   (de 1 a 12 años - SERVICIO COMPLETO)','🎈 **CUMPLEAÑOS INFANTIL**\n\n✅ **INCLUYE:**\n• Encargada general y de puerta\n• Uso de cocina completa con cocinera\n• Inflable 3x3\n• Metegoles, Ping Pong, Pool y Jenga gigante\n• Mesas, sillas y mantelería\n• Utensilios descartables\n• Baño equipado\n• Música y juego de luces\n• Cancha de fútbol (niños hasta 12 años)\n• 20 min previos para decoración\n\n❌ **NO INCLUYE:** Bebidas, alimentos, animación, vajilla de cristal','ALQUILER_SALON',1,1,50000.00,NULL),('INFORMALES','JUNTADA / PARRILLADA INFORMAL PARA FAMILIA O AMIGOS (SERVICIO ECONÓMICO)','🎉 **SERVICIO ECONÓMICO**\n\n✅ **INCLUYE:**\n• Encargada/o general y control de puerta\n• Mesas y sillas\n• Uso de parrilla\n• Uso de bachas, mesadas, barra\n• Heladera y freezer\n• Baño equipado\n• Equipo de música\n• Metegoles, Ping Pong, Pool\n\n❌ **NO INCLUYE:** Horno, hornallas, cocinera, mantelería, vajilla','ALQUILER_SALON',1,1,50000.00,80000.00),('MASAJES','Masajes','💆 **MASAJES PROFESIONALES**\n\nTipos: Descontracturante, Relajante, Reflexología, Piedras calientes\nDuración: 45 a 90 min','SERVICIOS',1,0,NULL,NULL),('TALLER_ARTE','Arte y Manualidades','🎨 **TALLERES DE ARTE**\n\nPintura, Dibujo, Cerámica, Manualidades, Tejido','TALLERES_ACTIVIDADES',1,0,NULL,NULL),('TALLER_DANZA','Danza','💃 **DANZA**\n\nEstilos: Folklore, Tango, Contemporánea, Salsa, Bachata','TALLERES_ACTIVIDADES',1,0,NULL,NULL),('TALLER_MUSICA','Música','🎵 **MÚSICA**\n\nInstrumentos: Guitarra, Teclado, Batería, Canto, Vientos','TALLERES_ACTIVIDADES',1,0,NULL,NULL),('TALLER_YOGA','Yoga','🧘 **YOGA**\n\nEstilos: Hatha, Vinyasa, Restaurativo, Embarazadas','TALLERES_ACTIVIDADES',1,0,NULL,NULL);
/*!40000 ALTER TABLE `opciones_tipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `personal_disponible`
--

LOCK TABLES `personal_disponible` WRITE;
/*!40000 ALTER TABLE `personal_disponible` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_disponible` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `personal_pagos`
--

LOCK TABLES `personal_pagos` WRITE;
/*!40000 ALTER TABLE `personal_pagos` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_pagos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `personal_tarifas`
--

LOCK TABLES `personal_tarifas` WRITE;
/*!40000 ALTER TABLE `personal_tarifas` DISABLE KEYS */;
INSERT INTO `personal_tarifas` (`id`, `nombre_rol`, `monto_por_hora`, `monto_fijo_evento`, `monto_minimo`, `vigente_desde`, `vigente_hasta`, `moneda`, `descripcion`, `activo`, `creado_en`, `actualizado_en`) VALUES (1,'DJ',2500.00,15000.00,10000.00,'2025-01-01',NULL,'ARS','DJ - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(2,'Mesera',1800.00,8000.00,6000.00,'2025-01-01',NULL,'ARS','Mesera - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(3,'Bartender',2200.00,12000.00,8000.00,'2025-01-01',NULL,'ARS','Bartender - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(4,'DJ',2500.00,15000.00,10000.00,'2025-01-01',NULL,'ARS','DJ - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(5,'Mesera',1800.00,8000.00,6000.00,'2025-01-01',NULL,'ARS','Mesera - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(6,'Bartender',2200.00,12000.00,8000.00,'2025-01-01',NULL,'ARS','Bartender - Tarifa estándar',1,'2026-02-22 16:16:33','2026-02-22 16:16:33');
/*!40000 ALTER TABLE `personal_tarifas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `precios_servicios`
--

LOCK TABLES `precios_servicios` WRITE;
/*!40000 ALTER TABLE `precios_servicios` DISABLE KEYS */;
INSERT INTO `precios_servicios` (`id`, `servicio_id`, `precio`, `vigente`, `vigente_desde`, `vigente_hasta`, `creado_en`, `actualizado_en`) VALUES (1,1,4000.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(2,2,3500.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(3,3,2500.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(4,4,1200.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(5,5,3000.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(6,6,2800.00,1,'2025-08-01',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33');
/*!40000 ALTER TABLE `precios_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `precios_talleres`
--

LOCK TABLES `precios_talleres` WRITE;
/*!40000 ALTER TABLE `precios_talleres` DISABLE KEYS */;
/*!40000 ALTER TABLE `precios_talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `precios_vigencia`
--

LOCK TABLES `precios_vigencia` WRITE;
/*!40000 ALTER TABLE `precios_vigencia` DISABLE KEYS */;
INSERT INTO `precios_vigencia` (`id`, `id_tipo_evento`, `cantidad_min`, `cantidad_max`, `precio_por_hora`, `vigente_desde`, `vigente_hasta`) VALUES (1,'INFANTILES',1,40,50000.00,'2025-08-01',NULL),(2,'INFANTILES',41,50,55000.00,'2025-08-01',NULL),(3,'INFANTILES',51,60,60000.00,'2025-08-01',NULL),(4,'INFANTILES',61,70,65000.00,'2025-08-01',NULL),(5,'INFANTILES',71,80,70000.00,'2025-08-01',NULL),(6,'INFANTILES',81,90,75000.00,'2025-08-01',NULL),(9,'INFORMALES',1,30,20000.00,'2025-08-01',NULL),(10,'INFORMALES',31,40,30000.00,'2025-08-01',NULL),(11,'INFORMALES',41,50,40000.00,'2025-08-01',NULL),(12,'INFORMALES',51,60,50000.00,'2025-08-01',NULL),(13,'INFORMALES',61,70,65000.00,'2025-08-01',NULL),(14,'INFORMALES',71,80,80000.00,'2025-08-01',NULL),(15,'INFORMALES',81,90,95000.00,'2025-08-01',NULL),(16,'INFORMALES',91,100,110000.00,'2025-08-01',NULL),(17,'CON_SERVICIO_DE_MESA',1,40,100000.00,'2025-08-01',NULL),(18,'CON_SERVICIO_DE_MESA',41,60,150000.00,'2025-08-01',NULL),(19,'CON_SERVICIO_DE_MESA',61,80,200000.00,'2025-08-01',NULL),(20,'BABY_SHOWERS',1,40,50000.00,'2025-08-01',NULL),(21,'BABY_SHOWERS',41,50,55000.00,'2025-08-01',NULL),(22,'BABY_SHOWERS',51,60,60000.00,'2025-08-01',NULL),(23,'BABY_SHOWERS',61,70,65000.00,'2025-08-01',NULL),(24,'BABY_SHOWERS',71,80,70000.00,'2025-08-01',NULL),(25,'BABY_SHOWERS',81,90,75000.00,'2025-08-01',NULL),(26,'ADOLESCENTES',1,40,50000.00,'2025-11-01',NULL),(27,'ADOLESCENTES',41,50,55000.00,'2025-11-01',NULL),(28,'ADOLESCENTES',51,60,60000.00,'2025-11-01',NULL),(29,'FECHA_BANDAS',1,120,120000.00,'2025-10-01',NULL),(30,'INFANTILES',30,50,4000.00,'2026-01-01',NULL),(31,'INFANTILES',51,80,4500.00,'2026-01-01',NULL),(32,'BABY_SHOWERS',20,40,4000.00,'2026-01-01',NULL),(33,'BABY_SHOWERS',41,60,4500.00,'2026-01-01',NULL),(34,'CON_SERVICIO_DE_MESA',60,100,5000.00,'2026-01-01',NULL),(35,'CON_SERVICIO_DE_MESA',101,150,5500.00,'2026-01-01',NULL);
/*!40000 ALTER TABLE `precios_vigencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `profesionales_servicios`
--

LOCK TABLES `profesionales_servicios` WRITE;
/*!40000 ALTER TABLE `profesionales_servicios` DISABLE KEYS */;
/*!40000 ALTER TABLE `profesionales_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `roles_por_evento`
--

LOCK TABLES `roles_por_evento` WRITE;
/*!40000 ALTER TABLE `roles_por_evento` DISABLE KEYS */;
INSERT INTO `roles_por_evento` (`id`, `id_tipo_evento`, `rol_requerido`, `cantidad`, `min_personas`, `max_personas`) VALUES (1,'INFANTILES','Encargada',1,0,120),(2,'INFANTILES','Cocinera',1,0,120),(3,'INFANTILES','Puerta',1,0,120),(4,'INFANTILES','Mesera',1,51,60),(5,'INFANTILES','Mesera',2,61,80),(6,'INFANTILES','Mesera',3,81,100),(7,'INFANTILES','Mesera',4,101,120),(8,'INFANTILES','Ayudante de cocina',1,51,80),(9,'INFANTILES','Ayudante de cocina',2,81,120),(10,'CON_SERVICIO_DE_MESA','Encargada',1,0,120),(11,'CON_SERVICIO_DE_MESA','Cocinera',1,0,120),(12,'CON_SERVICIO_DE_MESA','Puerta',1,0,120),(13,'CON_SERVICIO_DE_MESA','Mesera',1,51,60),(14,'CON_SERVICIO_DE_MESA','Mesera',2,61,80),(15,'CON_SERVICIO_DE_MESA','Mesera',3,81,100),(16,'CON_SERVICIO_DE_MESA','Mesera',4,101,120),(17,'CON_SERVICIO_DE_MESA','Ayudante de cocina',1,51,80),(18,'CON_SERVICIO_DE_MESA','Ayudante de cocina',2,81,120),(19,'BABY_SHOWERS','Encargada',1,0,120),(20,'BABY_SHOWERS','Cocinera',1,0,120),(21,'BABY_SHOWERS','Puerta',1,0,120),(22,'BABY_SHOWERS','Mesera',1,51,60),(23,'BABY_SHOWERS','Mesera',2,61,80),(24,'BABY_SHOWERS','Mesera',3,81,100),(25,'BABY_SHOWERS','Mesera',4,101,120),(26,'BABY_SHOWERS','Ayudante de cocina',1,51,80),(27,'BABY_SHOWERS','Ayudante de cocina',2,81,120),(28,'INFORMALES','Encargada',1,0,120),(29,'INFORMALES','Puerta',1,0,120),(30,'FECHA_BANDAS','Bartender',1,0,500),(31,'FECHA_BANDAS','Puerta',1,0,500),(32,'FECHA_BANDAS','Sonido',1,0,500);
/*!40000 ALTER TABLE `roles_por_evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `servicios_catalogo`
--

LOCK TABLES `servicios_catalogo` WRITE;
/*!40000 ALTER TABLE `servicios_catalogo` DISABLE KEYS */;
INSERT INTO `servicios_catalogo` (`id`, `tipo_servicio_id`, `nombre`, `descripcion`, `duracion_minutos`, `activo`, `orden`, `creado_en`, `actualizado_en`) VALUES (1,'MASAJES','Masaje Descontracturante','Masaje profesional para aliviar tensiones',60,1,1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(2,'MASAJES','Masaje Relajante','Masaje relajante y terapéutico',90,1,2,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(3,'DEPILACION','Depilación Zona Específica','Servicio de depilación en zonas seleccionadas',45,1,3,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(4,'ESTETICA','Limpieza Facial','Tratamiento de limpieza facial profesional',60,1,4,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(5,'ESTETICA','Hidratación Facial','Tratamiento de hidratación intensiva',45,1,5,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(6,'OTROS','Servicio Adicional','Servicios varios adicionales',30,1,6,'2026-02-22 16:16:33','2026-02-22 16:16:33');
/*!40000 ALTER TABLE `servicios_catalogo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes`
--

LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
INSERT INTO `solicitudes` (`id_solicitud`, `categoria`, `id_cliente`, `id_usuario_creador`, `fecha_creacion`, `estado`, `es_publico`, `descripcion_corta`, `descripcion_larga`, `url_flyer`, `descripcion`, `actualizado_en`) VALUES (1,'ALQUILER',1,NULL,'2026-03-13 04:29:21','Solicitado',0,'Cumpleaños infantil 50 personas','Cumpleaños infantil para una niña de 8 años. Necesitamos inflable, servicio de cocinero y setup básico.',NULL,NULL,'2026-03-13 04:29:21'),(2,'ALQUILER',2,NULL,'2026-03-13 04:29:21','Confirmado',0,'Fiesta de 15 años - Servicio completo','Fiesta de 15 años. Contratamos servicio completo con meseras, bartender y sonido profesional.',NULL,NULL,'2026-03-13 04:29:21'),(3,'ALQUILER',3,NULL,'2026-03-13 04:29:21','Solicitado',0,'Baby shower 40 personas','Baby shower temático con 40 invitados. Necesitamos inflable de princesa y decoraciones.',NULL,NULL,'2026-03-13 04:29:21'),(4,'BANDAS',4,NULL,'2026-03-13 04:29:21','Confirmado',1,'Reite - Fecha Propia','Tributo a La Renga solicita fecha propia. Esperan público de 250 personas.',NULL,NULL,'2026-03-13 04:29:21'),(5,'BANDAS',5,NULL,'2026-03-13 04:29:21','Confirmado',1,'Las Mentas Show','Banda de rock femenino solicita fecha con formato de show abierto al público general.','/uploads/flyers/solicitud_5.jpg',NULL,'2026-03-13 04:29:31'),(6,'BANDAS',4,NULL,'2026-03-13 04:29:21','Solicitado',1,'Pateando Bares + Banda Telonera','Rock nacional solicita fecha compartida con banda telonera. Esperan 200 personas.','/uploads/flyers/solicitud_6.jpeg',NULL,'2026-03-18 13:40:40'),(7,'SERVICIOS',1,NULL,'2026-03-13 04:29:21','Solicitado',0,'Taller de Fotografía de Eventos','Taller teórico-práctico de fotografía profesional para eventos. 4 horas de instrucción.',NULL,NULL,'2026-03-13 04:29:21'),(8,'TALLERES',2,NULL,'2026-03-13 04:29:21','Confirmado',1,'Taller de Masaje Descontracturante','Sesión grupal de masaje descontracturante para empleados.',NULL,NULL,'2026-03-13 04:29:21');
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes_adicionales`
--

LOCK TABLES `solicitudes_adicionales` WRITE;
/*!40000 ALTER TABLE `solicitudes_adicionales` DISABLE KEYS */;
INSERT INTO `solicitudes_adicionales` (`id`, `id_solicitud_alquiler`, `adicional_nombre`, `adicional_precio`, `creado_en`) VALUES (1,2,'Mesa extra',5000.00,'2026-03-13 04:29:21'),(2,2,'Sillas extras (4)',1200.00,'2026-03-13 04:29:21'),(3,2,'Servicio de fotografía',8000.00,'2026-03-13 04:29:21'),(4,1,'Manteles personalizados',30000.00,'2026-03-13 04:29:21');
/*!40000 ALTER TABLE `solicitudes_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes_alquiler`
--

LOCK TABLES `solicitudes_alquiler` WRITE;
/*!40000 ALTER TABLE `solicitudes_alquiler` DISABLE KEYS */;
INSERT INTO `solicitudes_alquiler` (`id_solicitud_alquiler`, `id_solicitud`, `fecha_evento`, `hora_evento`, `duracion`, `id_tipo_evento`, `id_precio_vigencia`, `cantidad_personas`, `precio_basico`, `total_adicionales`, `monto_sena`, `monto_deposito`, `precio_final`, `comentarios`, `estado`, `creado_en`, `actualizado_en`) VALUES (1,1,'2026-03-15','14:00:00',240,'INFANTILES',1,45,55000.00,0.00,0.00,0.00,55000.00,'Incluye inflable cocodrilo y cocinera','Solicitado','2026-03-13 04:29:21','2026-03-13 04:29:21'),(2,2,'2026-03-22','18:00:00',360,'CON_SERVICIO_DE_MESA',4,80,80000.00,0.00,0.00,0.00,80000.00,'Servicio completo: meseras, bartender, sonido','Confirmado','2026-03-13 04:29:21','2026-03-13 04:29:21'),(3,3,'2026-03-28','12:00:00',180,'BABY_SHOWERS',3,35,50000.00,0.00,0.00,0.00,50000.00,'Inflable princesa y servicio básico','Solicitado','2026-03-13 04:29:21','2026-03-13 04:29:21');
/*!40000 ALTER TABLE `solicitudes_alquiler` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes_fechas_bandas`
--

LOCK TABLES `solicitudes_fechas_bandas` WRITE;
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` DISABLE KEYS */;
INSERT INTO `solicitudes_fechas_bandas` (`id_solicitud`, `id_banda`, `fecha_evento`, `hora_evento`, `duracion`, `descripcion`, `precio_basico`, `precio_final`, `precio_anticipada`, `precio_puerta`, `cantidad_bandas`, `expectativa_publico`, `bandas_json`, `estado`, `fecha_alternativa`, `notas_admin`, `id_evento_generado`, `creado_en`, `actualizado_en`) VALUES (4,1,'2026-03-30','22:00','3 horas','Tributo a La Renga - Fecha propia del artista',100000.00,120000.00,100000.00,120000.00,1,'250 personas','[{\"id_banda\":1,\"nombre\":\"Reite\",\"orden_show\":1,\"es_principal\":true}]','Confirmado',NULL,NULL,NULL,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(5,3,'2026-04-10','20:00','2.5 horas','Las Mentas en vivo - Show abierto al público',100000.00,120000.00,100000.00,120000.00,1,'180 personas','[{\"id_banda\":3,\"nombre\":\"Las Mentas\",\"orden_show\":1,\"es_principal\":true}]','Confirmado',NULL,NULL,NULL,'2026-03-13 04:29:21','2026-03-13 04:29:21'),(6,2,'2026-04-18','21:30','4 horas','Pateando Bares + banda telonera. Rock nacional en vivo.',120000.00,120000.00,100000.00,120000.00,2,'120','[{\"id_banda\":2,\"nombre\":\"Pateando Bares\",\"orden_show\":0,\"es_principal\":true},{\"id_banda\":4,\"nombre\":\"Cumbia Sudaka\",\"orden_show\":1,\"es_principal\":false}]','Solicitado',NULL,NULL,NULL,'2026-03-13 04:29:21','2026-03-18 13:40:40');
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes_personal`
--

LOCK TABLES `solicitudes_personal` WRITE;
/*!40000 ALTER TABLE `solicitudes_personal` DISABLE KEYS */;
/*!40000 ALTER TABLE `solicitudes_personal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes_servicios`
--

LOCK TABLES `solicitudes_servicios` WRITE;
/*!40000 ALTER TABLE `solicitudes_servicios` DISABLE KEYS */;
INSERT INTO `solicitudes_servicios` (`id_solicitud_servicio`, `id_solicitud`, `tipo_servicio`, `fecha_evento`, `hora_evento`, `duracion`, `precio`) VALUES (1,7,'Taller Educativo','2026-03-15','15:00','4 horas',3000.00);
/*!40000 ALTER TABLE `solicitudes_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `solicitudes_talleres`
--

LOCK TABLES `solicitudes_talleres` WRITE;
/*!40000 ALTER TABLE `solicitudes_talleres` DISABLE KEYS */;
INSERT INTO `solicitudes_talleres` (`id_solicitud_taller`, `id_solicitud`, `nombre_taller`, `fecha_evento`, `hora_evento`, `duracion`, `precio`) VALUES (1,8,'Masaje Descontracturante Grupal','2026-03-08','10:00','90 minutos',2500.00);
/*!40000 ALTER TABLE `solicitudes_talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `talleres`
--

LOCK TABLES `talleres` WRITE;
/*!40000 ALTER TABLE `talleres` DISABLE KEYS */;
/*!40000 ALTER TABLE `talleres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `talleristas`
--

LOCK TABLES `talleristas` WRITE;
/*!40000 ALTER TABLE `talleristas` DISABLE KEYS */;
/*!40000 ALTER TABLE `talleristas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `turnos_servicios`
--

LOCK TABLES `turnos_servicios` WRITE;
/*!40000 ALTER TABLE `turnos_servicios` DISABLE KEYS */;
/*!40000 ALTER TABLE `turnos_servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` (`id_usuario`, `email`, `password_hash`, `nombre`, `rol`, `activo`, `proveedor_oauth`, `id_oauth`, `token_oauth`, `foto_url`, `creado_en`, `actualizado_en`) VALUES (1,'temploclaypole@gmail.com','$2a$10$d3C9.uYqlJaofNGk3Nc0AuKm3KN9sWhIQhuZCv67j0F9Jc5VsMm2W','Templo User','staff',1,'google','107386203679475316318',NULL,'https://lh3.googleusercontent.com/a/ACg8ocK9dwZoBaeK4ng93n4rTE_TLWgqd-VSfex5hfKVObbt06w0oIHl=s96-c','2026-03-13 04:29:21','2026-03-13 12:25:56'),(2,'villalbarodrigo2009@gmail.com','$2a$10$xT4ERvVKWABJlrrYPsJXWOZHTVsZtYp1uCm52pM23iHbdmAUlHlyu','Rodrigo Villalba','admin',1,'google','117318714094755139695',NULL,'https://lh3.googleusercontent.com/a/ACg8ocJGyiIz4tnQI40z1wg81HbfIeiPnmIl49oegEjoq5aFm0k-951Emg=s96-c','2026-03-13 04:29:21','2026-03-18 12:23:51');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-18 15:33:37
