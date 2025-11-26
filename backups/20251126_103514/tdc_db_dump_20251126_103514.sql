/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.23-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: tdc_db
-- ------------------------------------------------------
-- Server version	10.6.23-MariaDB-ubu2204

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
-- Table structure for table `configuracion`
--

DROP TABLE IF EXISTS `configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion` (
  `clave` varchar(255) NOT NULL,
  `valor` text DEFAULT NULL,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion`
--

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` VALUES ('emailDestino','temploclaypole@gmail.com');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_horarios`
--

DROP TABLE IF EXISTS `configuracion_horarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_horarios` (
  `id_de_evento` varchar(255) DEFAULT NULL,
  `hora_de_inicio` varchar(20) DEFAULT NULL,
  `tipo_de_dia` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_horarios`
--

LOCK TABLES `configuracion_horarios` WRITE;
/*!40000 ALTER TABLE `configuracion_horarios` DISABLE KEYS */;
INSERT INTO `configuracion_horarios` VALUES ('INFANTILES','12:00hs','Todos'),('INFANTILES','13:00hs','Todos'),('INFANTILES','14:00hs','Todos'),('INFANTILES','16:00hs','Todos'),('INFANTILES','17:00hs','Todos'),('INFANTILES','18:00hs','Todos'),('INFORMALES','09:00hs','Todos'),('INFORMALES','10:00hs','Todos'),('INFORMALES','11:00hs','Todos'),('INFORMALES','12:00hs','Todos'),('INFORMALES','13:00hs','Todos'),('INFORMALES','14:00hs','Todos'),('INFORMALES','15:00hs','Sabado'),('INFORMALES','16:00hs','Sabado'),('INFORMALES','17:00hs','Sabado'),('INFORMALES','18:00hs','Sabado'),('INFORMALES','19:00hs','Sabado'),('INFORMALES','20:00hs','Sabado'),('INFORMALES','21:00hs','Sabado'),('INFORMALES','22:00hs','Sabado'),('CON_SERVICIO_DE_MESA','09:00hs','Todos'),('CON_SERVICIO_DE_MESA','10:00hs','Todos'),('CON_SERVICIO_DE_MESA','11:00hs','Todos'),('CON_SERVICIO_DE_MESA','12:00hs','Todos'),('CON_SERVICIO_DE_MESA','18:00hs','Sabado'),('CON_SERVICIO_DE_MESA','19:00hs','Sabado'),('CON_SERVICIO_DE_MESA','20:00hs','Sabado'),('CON_SERVICIO_DE_MESA','21:00hs','Sabado'),('SIN_SERVICIO_DE_MESA','09:00hs','Todos'),('SIN_SERVICIO_DE_MESA','10:00hs','Todos'),('SIN_SERVICIO_DE_MESA','11:00hs','Todos'),('SIN_SERVICIO_DE_MESA','12:00hs','Todos'),('SIN_SERVICIO_DE_MESA','18:00hs','Sabado'),('SIN_SERVICIO_DE_MESA','19:00hs','Sabado'),('SIN_SERVICIO_DE_MESA','20:00hs','Sabado'),('SIN_SERVICIO_DE_MESA','21:00hs','Sabado'),('BABY_SHOWERS','12:00hs','Todos'),('BABY_SHOWERS','13:00hs','Todos'),('BABY_SHOWERS','14:00hs','Todos'),('BABY_SHOWERS','16:00hs','Todos'),('BABY_SHOWERS','17:00hs','Sabado'),('BABY_SHOWERS','18:00hs','Sabado'),('ADOLESCENTES','12:00hs','Todos'),('ADOLESCENTES','13:00hs','Todos'),('ADOLESCENTES','14:00hs','Todos'),('ADOLESCENTES','16:00hs','Todos'),('ADOLESCENTES','17:00hs','Sabado'),('ADOLESCENTES','18:00hs','Sabado'),('FECHA_BANDAS','12:00hs','Todos'),('FECHA_BANDAS','21:00hs','Sabado'),('DEPILACION_DEFINITIVA','09:00hs','Sabado'),('DEPILACION_DEFINITIVA','09:00hs','Domingo');
/*!40000 ALTER TABLE `configuracion_horarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `costos_personal_vigencia`
--

DROP TABLE IF EXISTS `costos_personal_vigencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `costos_personal_vigencia` (
  `id_costo` varchar(50) NOT NULL,
  `rol` varchar(100) DEFAULT NULL,
  `fecha_de_vigencia` date DEFAULT NULL,
  `costo_por_hora` decimal(10,2) DEFAULT NULL,
  `viaticos` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_costo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `costos_personal_vigencia`
--

LOCK TABLES `costos_personal_vigencia` WRITE;
/*!40000 ALTER TABLE `costos_personal_vigencia` DISABLE KEYS */;
INSERT INTO `costos_personal_vigencia` VALUES ('C01','Encargada','2025-08-01',5000.00,0.00),('C02','Cocinera','2025-08-01',3500.00,0.00),('C03','Puerta','2025-08-01',3500.00,1000.00),('C04','Ayudante de cocina','2025-08-01',3000.00,0.00),('C05','Mesera','2025-08-01',3000.00,0.00),('C06','Limpieza','2025-09-01',3500.00,1200.00);
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
  `codigo` varchar(50) NOT NULL COMMENT 'Código que ingresa el usuario (ej: ROCK20)',
  `tipo_descuento` enum('PORCENTAJE','MONTO_FIJO') NOT NULL COMMENT 'Tipo de descuento a aplicar',
  `valor_fijo` decimal(10,2) DEFAULT NULL COMMENT 'Monto fijo de descuento (si aplica)',
  `porcentaje_descuento` decimal(5,2) DEFAULT NULL COMMENT 'Porcentaje de descuento (0 a 100) (si aplica)',
  `usos_maximos` int(11) DEFAULT NULL COMMENT 'Límite global de veces que se puede usar el cupón',
  `usos_actuales` int(11) NOT NULL DEFAULT 0,
  `fecha_expiracion` date DEFAULT NULL COMMENT 'Fecha límite para usar el cupón',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  CONSTRAINT `CONSTRAINT_1` CHECK (`porcentaje_descuento` is null or `porcentaje_descuento` >= 0 and `porcentaje_descuento` <= 100)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cupones`
--

LOCK TABLES `cupones` WRITE;
/*!40000 ALTER TABLE `cupones` DISABLE KEYS */;
INSERT INTO `cupones` VALUES (1,'ROCK20','PORCENTAJE',NULL,20.00,50,0,'2025-12-31',1,'2025-11-13 19:06:50'),(2,'A-TODO-O-NADA','MONTO_FIJO',1000.00,NULL,NULL,0,NULL,1,'2025-11-13 19:06:50'),(3,'EXPIRADO','PORCENTAJE',NULL,50.00,10,0,'2024-01-01',1,'2025-11-13 19:06:50'),(4,'AGOTADO','PORCENTAJE',NULL,15.00,2,2,NULL,1,'2025-11-13 19:06:50');
/*!40000 ALTER TABLE `cupones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos`
--

DROP TABLE IF EXISTS `eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_banda` varchar(255) NOT NULL COMMENT 'Nombre principal del show o banda',
  `fecha_hora` datetime NOT NULL COMMENT 'Fecha y hora del evento',
  `precio_base` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Precio de la entrada general antes de impuestos o descuentos',
  `aforo_maximo` int(11) NOT NULL COMMENT 'Capacidad máxima de tickets a vender',
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_evento_fecha` (`fecha_hora`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos`
--

LOCK TABLES `eventos` WRITE;
/*!40000 ALTER TABLE `eventos` DISABLE KEYS */;
INSERT INTO `eventos` VALUES (1,'LA RISA DE CROMO','2025-12-05 21:00:00',5000.00,150,'Noche de rock alternativo con teloneros invitados. Apertura 21h.',1,'2025-11-13 19:06:50'),(2,'Noche de Jazz Fusión','2025-12-12 20:30:00',3500.00,80,'Show acústico íntimo del Ensamble Claypole Jazz.',1,'2025-11-13 19:06:50'),(3,'Feria de Diseño y DJ Set','2025-12-20 18:00:00',0.00,200,'Evento gratuito con reserva. Entrada libre y musicalización a cargo de DJ Clay.',1,'2025-11-13 19:06:50');
/*!40000 ALTER TABLE `eventos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opciones_adicionales`
--

DROP TABLE IF EXISTS `opciones_adicionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones_adicionales` (
  `nombre` varchar(255) NOT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `url_imagen` text DEFAULT NULL,
  PRIMARY KEY (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opciones_adicionales`
--

LOCK TABLES `opciones_adicionales` WRITE;
/*!40000 ALTER TABLE `opciones_adicionales` DISABLE KEYS */;
INSERT INTO `opciones_adicionales` VALUES ('Cama elástica',30000.00,'Cama elástica con red lateral para niños hasta 10 años','https://lh3.googleusercontent.com/pw/AP1GczMM-aZTEqkYM4KlsY5A79dD5IMy03IVXb0EgLUWVPlflvdfCikVlgkn3p6PVwELvS4qtBoD9HGf8LiIVAHNIuTzn3FxMxYcIecyqjeE1Ew-PZfl723Rt1kQGs-ClWpThLxG77uaRM153VQfVvD4O8fJ=w700-h933-s-no-gm?authuser=0\r'),('Inflable Cocodrilo',30000.00,'Inflable con forma de cocodrilo de 4x7 metros con tobogan','https://lh3.googleusercontent.com/pw/AP1GczM9WbWMorMn_fPb7f9_uS7-IWAsKEj0LcCn8Zvi7U14_7Kjdjge28_RV50Gcu7wkinQk_W5mK5NFNXh1iFjv-Uq-EHjvQWigm3TcSlMvNhhM3ZOZMT05WkaWaxuL-QNciykkIuCmLe0YwQYRrFieHTl=w394-h231-s-no-gm?authuser=0\r'),('Inflable Mickey/Minnie',25000.00,'Inflable de 4x4 metros con caras gigantes de Mickey y Minnie en la entrda','https://lh3.googleusercontent.com/pw/AP1GczMQl1ffjotYB0j0jFCInMgBquqvsgAITDe31BuKk14RFS3Bky5eSfrTjuDJFDCqZ8bAkeVK1xqPFz3xzJBw8R_YXNyS6Zo0ZIytnwaHNIQCJvghvfhwP5xetCI7Xg2cVqFmbbDUuJ3Cv_-SHFU3BI6f=w340-h358-s-no-gm?authuser=0\r'),('Inflable Princesa',22000.00,'Inflable con la tematica de Princesas de 3x3 metros','https://lh3.googleusercontent.com/pw/AP1GczOYtkKsvQOWJsscPoXvPKxmGWHFzXBUCnWMVr3jyPXvQLDPJFLKivYfqf0HP0DCFCiDZeuF_OHT2Dg7mY5gdOva0YQL94uS9aGQOhRviny_ZNoIPCAR-9p5x2gOXjrNYaAIzRnEKbOOqseXBmWgwfnT=w377-h360-s-no-gm?authuser=0\r'),('Inflable Spiderman',22000.00,'Inflable con la tematica del Hombre Araña de 3x3 metros','https://lh3.googleusercontent.com/pw/AP1GczOlO48NaDkNnHM_ZPKJT-4eHH36bUYMJUZFlAObTvGgIgHy6H0hwaSbyxFJvAjmIrucr12rvG2FTpeLcezzfGBVUCmADUhhTYXZAUdUPw4bw2gdvjts1P-GOH4XPD3MrxLG3AfhHWlHtnk2IosfgBhl=w418-h349-s-no-gm?authuser=0\r'),('Manteles negros con camino blanco',30000.00,'Manteles negros con camino blanco para todas las mesas','https://lh3.googleusercontent.com/pw/AP1GczPfoLiluF0pE9tFCtHRtuXpK0pFM3BQRZ97t81cE9aapbIAzlsJ5srLNeaJYfmI_2F247p2zH33ilH6oW3D-N_nM7BQKZL0CcrE49wNHZ1hQALYnGrsjMk3VsdwQ66In8Ub11R8bW8rD4Riyl6WJTjp=w999-h779-s-no-gm?authuser=0'),('Manteles negros sólos',20000.00,'Manteles negros para todas las mesas','https://lh3.googleusercontent.com/pw/AP1GczOSpOTKTwuEAckvaWRc8thYEivYe0el_Fno_l6-ylS331QQaBD7L8zRVPQ1BVBXGdCjdyFbinue3OMV6BtZXpndGSbE4AuCCH710iGesDuGLotzH3gHsirHRral9vmMs-x8pG1S-rrSV0odj9BLrCSV=w800-h749-s-no-gm?authuser=0\r');
/*!40000 ALTER TABLE `opciones_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opciones_duracion`
--

DROP TABLE IF EXISTS `opciones_duracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones_duracion` (
  `id_evento` varchar(255) DEFAULT NULL,
  `header` varchar(255) DEFAULT NULL,
  `duracion` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opciones_duracion`
--

LOCK TABLES `opciones_duracion` WRITE;
/*!40000 ALTER TABLE `opciones_duracion` DISABLE KEYS */;
INSERT INTO `opciones_duracion` VALUES ('INFANTILES','Opcion 1','3 horas'),('INFORMALES','Opcion 1','4 horas'),('CON_SERVICIO_DE_MESA','Opcion 1','4 horas'),('SIN_SERVICIO_DE_MESA','Opcion 1','4 horas'),('BABY_SHOWERS','Opcion 1','3 horas'),('FECHA_BANDAS','Opcion 1','5 horas'),('INFANTILES','Opcion 2','4 horas'),('INFORMALES','Opcion 2','6 horas'),('CON_SERVICIO_DE_MESA','Opcion 2','6 horas'),('SIN_SERVICIO_DE_MESA','Opcion 2','6 horas'),('BABY_SHOWERS','Opcion 2','4 horas'),('FECHA_BANDAS','Opcion 2','6 horas'),('INFANTILES','Opcion 3','5 horas'),('INFORMALES','Opcion 3','8 horas'),('CON_SERVICIO_DE_MESA','Opcion 3','8 horas'),('SIN_SERVICIO_DE_MESA','Opcion 3','8 horas'),('BABY_SHOWERS','Opcion 3','5 horas'),('FECHA_BANDAS','Opcion 3','7 horas'),('INFORMALES','Opcion 4','10 horas'),('CON_SERVICIO_DE_MESA','Opcion 4','10 horas'),('SIN_SERVICIO_DE_MESA','Opcion 4','10 horas'),('BABY_SHOWERS','Opcion 4','6 horas'),('FECHA_BANDAS','Opcion 4','8 horas'),('ADOLESCENTES','Opcion 1','4 horas'),('ADOLESCENTES','Opcion 2','5 horas'),('ADOLESCENTES','Opcion 3','6 horas');
/*!40000 ALTER TABLE `opciones_duracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opciones_tipos`
--

DROP TABLE IF EXISTS `opciones_tipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones_tipos` (
  `id_evento` varchar(255) NOT NULL,
  `nombre_para_mostrar` varchar(255) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `monto_sena` decimal(10,2) DEFAULT NULL,
  `deposito` decimal(10,2) DEFAULT NULL,
  `es_publico` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id_evento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opciones_tipos`
--

LOCK TABLES `opciones_tipos` WRITE;
/*!40000 ALTER TABLE `opciones_tipos` DISABLE KEYS */;
INSERT INTO `opciones_tipos` VALUES ('ADOLESCENTES','ADOLESCENTES: Cumpleaños de 13, 14, 15, 16 y 17 años (excepto los 15 de chicas)','INCLUYE:\n* Encargada general\n* Encargada de puerta\n* Uso de cocina completa con cocinera\n* Dos metegoles, Ping Pong, Pool y Jenga gigante\n* Mesas, sillas y mantelería\n* Utensilios de mesa descartables:\n   - Bowls de plástico para palitos, papitas y chisitos\n   - Platos descartables para hamburguesas, panchos, tortas\n   - Servilleteros con servilletas por mesa\n   - Vasos descartables (según cantidad de invitados)\n   - Una botella por mesa para jugo o agua\n* Baño equipado (papel higiénico y toallas de papel)\n* Uso de barra, heladera y freezer\n* Música y juego de luces\n* 20 minutos previos sin cargo para decoración\n\nNO INCLUYE:\n* Cancha de futbol',0.00,0.00,1),('BABY_SHOWERS','BABY SHOWERS / BAUTISMOS / COMUNIONES','\nINCLUYE:\n* Encargada general\n* Encargada de puerta\n* Uso de cocina completa con cocinera\n* Inflable 3x3\n* Dos metegoles, Ping Pong, Pool y Jenga gigante\n* Mesas, sillas y mantelería\n* Utensilios de mesa descartables:\n   - Bowls de plástico para palitos, papitas y chisitos\n   - Platos descartables para hamburguesas, panchos, tortas\n   - Servilleteros con servilletas por mesa\n   - Vasos descartables (según cantidad de invitados)\n   - Una botella por mesa para jugo o agua\n* Baño equipado (papel higiénico y toallas de papel)\n* Uso de barra, heladera y freezer\n* Música y juego de luces\n* Cancha de fútbol (exclusiva para niños hasta 12 años)\n* 20 minutos previos sin cargo para decoración\n\nNO INCLUYE:\n* Meseras o personal adicional de servicio\n* Animación, fotografía o servicios similares\n* Vajilla o cubiertos de metal\n* Decoración especializada\n\nCONDICIONES DEL SERVICIO:\n* No se requiere depósito de garantía\n* Volumen de música moderado (acorde al tipo de evento)\n* Uso de cancha exclusivo para niños hasta 12 años\n\nNORMAS:\n1. Abonar las cuotas entre el 1° y 10° de cada mes\n2. Enviar lista de invitados con 24 horas de anticipación\n3. Cancelar saldo pendiente un día antes del evento\n4. Solo personal autorizado puede ingresar a la cocina\n5. Responsabilidad por cualquier daño o pérdida de elementos\n6. Recargos por incumplimiento de las normas establecidas',0.00,0.00,1),('CON_SERVICIO_DE_MESA','FIESTAS de 15 / 18 / casamientos / aniversarios (SERVICIO COMPLETO)','\nINCLUYE:\n* Encargada general\n* Encargada de puerta\n* Cocinera y uso completo de cocina\n* Meseras según cantidad de invitados\n* Mesas, sillas y mantelería negra con camino blanco\n* Utensilios de mesa:\n   - Bandejas y bowls de plástico para entradas\n   - Vajilla y vasos de cristal\n   - Cubiertos de metal\n   - Servilleteros con servilletas por mesa\n   - Una botella por mesa para jugo o agua\n* Equipamiento de entretenimiento:\n   - Dos metegoles, Ping Pong, Pool y Jenga gigante\n* Sonido profesional:\n   - Micrófonos y ecualización\n   - Sistema PA JBL (alta definición)\n   - Juego de luces Proton\n   - Backline completo (amplificadores de guitarra, bajo y cuerpo de batería) para bandas en vivo\n* Baño equipado (papel higiénico y toallas de papel)\n* Uso de barra, heladera y freezer\n\nNO INCLUYE:\n* DJ, decoración o animación\n* Globología o servicios similares\n* Tiempo extra para decoración (debe considerarse dentro de la duración total del evento)\n* Cancha de futbol\n\nCONDICIONES DEL SERVICIO:\n* Prohibido el uso de la cancha de fútbol\n* Prohibido permanecer en la vereda después de las 00:00 hs\n\nNORMAS:\n1. Abonar las cuotas entre el 1° y 10° de cada mes\n2. Enviar lista de invitados con 24 horas de anticipación\n3. Cancelar saldo pendiente un día antes del evento\n4. Responsabilidad por cualquier daño o pérdida de elementos\n5. Recargos por incumplimiento de las normas establecidas',50000.00,0.00,1),('DEPILACION_DEFINITIVA','DPILACIÓN DEFINITIVA','Completar datos',0.00,0.00,0),('FECHA_BANDAS','Fecha para bandas en vivo','INCLUYE:\n* Coordinación de bandas\n* Flyers y publicaciones\n* Encargada de puerta\n* Uso de cocina completa con cocinera\n* Dos metegoles, Ping Pong, Pool y Jenga gigante\n* Mesas, sillas y mantelería\n* Utensilios de mesa descartables:\n   - Bowls de plástico para palitos, papitas y chisitos\n   - Platos descartables para hamburguesas, panchos, tortas\n   - Servilleteros con servilletas por mesa\n   - Vasos descartables (según cantidad de invitados)\n   - Una botella por mesa para jugo o agua\n* Baño equipado (papel higiénico y toallas de papel)\n* Uso de barra, heladera y freezer\n* Música y juego de luces\n* 20 minutos previos sin cargo para decoración\n\nNO INCLUYE:\n* Cancha de futbol',0.00,0.00,0),('INFANTILES','INFANTILES: Cumpleaños Infantiles hasta 12 años (SERVICIO COMPLETO)','\nINCLUYE: \n* Encargada general\n* Encargada de puerta\n* Uso de cocina completa con cocinera\n* Inflable 3x3\n* Dos metegoles, Ping Pong, Pool y Jenga gigante\n* Mesas, sillas y mantelería\n* Utensilios de mesa:\n   - Bowls de plástico para palitos, papitas y chisitos\n   - Platos descartables para hamburguesas, panchos, tortas\n   - Servilleteros con servilletas por mesa\n   - Vasos descartables (según cantidad de invitados)\n   - Una botella por mesa para jugo o agua\n* Baño equipado (papel higiénico y toallas de papel)\n* Uso de barra, heladera y freezer\n* Música y juego de luces\n* Cancha de fútbol (exclusiva para niños hasta 12 años)\n* 20 minutos previos sin cargo para decoración\n\nNO INCLUYE:\n* Bebidas ni alimentos\n* Animación, fotografía o servicios similares\n* Vajilla o vasos de cristal\n* Cubiertos de metal\n\nNORMAS:\n1. Realizar el pago de cuotas entre el 1° y 10° de cada mes.\n2. Enviar la lista de invitados con un día de anticipación al evento.\n3. Cancelar el saldo restante un día antes del evento.\n4. Respetar que solo el personal autorizado puede ingresar a la cocina.\n5. El uso de la cancha está destinado únicamente a niños y niñas hasta 12 años de edad.\n6. Asumir responsabilidad por cualquier daño o pérdida de elementos.\n7. Aplicaremos recargos en caso de no seguir estas indicaciones.',40000.00,0.00,1),('INFORMALES','INFORMALES: Juntadas familiares, de amigos, festejos tranquilos, con uso de parrilla (SERVICIO ECONÓMICO)','ESTE SERVICIO ESTÁ PENSADO PARA REALIZAR EVENTOS SIMPLES, SIN COMPLEJIDADES, PARA COMIDAS FRIAS O PARRILLADAS, SIN USO DE LOS ELEMENTOS DE LA COCINA (sólo tablas y cubiertos de cocina)\n\nINCLUYE:\n* Encargada/o general y control de puerta\n* Mesas y sillas\n* Uso de parrilla\n* Uso bachas, mesadas, cubiertos de cocina y barra\n* Uso de pava electrica, heladera y freezer\n* Baño equipado (papel higiénico y toallas de papel)\n* Equipo de música\n* Dos metegoles, Ping Pong, Pool y Jenga gigante\n\nNO INCLUYE:\n* Uso de horno, hornallas, plancheta o freidora.\n* Cocinera ni ayudantes\n* Meseras o personal de servicio\n* Mantelería ni centros de mesa\n* Vajilla, utensilios o decoración\n* Servicios de DJ o animación\n* Tiempo extra para decoración o cocina\n* Cancha de futbol\n\nCONDICIONES DEL SERVICIO:\n* El cliente se debe encargarse del servicio de catering, preparación de mesas y mantenimiento del salón\n* El volumen de música está limitado (sonido acorde al salón)\n* No se permiten DJ ni servicios de animación con parlantes externos\n* Prohibido el uso de la cancha de fútbol\n* Se cobra depósito de garantía reembolsable al finalizar el evento\n\nNORMAS:\n1. Abonar las cuotas entre el 1° y 10° de cada mes\n2. Enviar lista de invitados con 24 horas de anticipación\n3. Cancelar saldo pendiente un día antes del evento\n4. Responsabilidad por cualquier daño o pérdida de elementos\n5. Recargos por incumplimiento de las normas establecidas',50000.00,80000.00,1);
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
  `nombre_completo` varchar(255) DEFAULT NULL,
  `rol` varchar(255) DEFAULT NULL,
  `celular` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT NULL,
  `cvu_alias` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_personal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_disponible`
--

LOCK TABLES `personal_disponible` WRITE;
/*!40000 ALTER TABLE `personal_disponible` DISABLE KEYS */;
INSERT INTO `personal_disponible` VALUES ('P001','Chony','Encargada,Puerta','11 5959-7348',1,'\r'),('P002','Leila','Limpieza,Puerta,Cocinera,Mesera','11 3199-6780',1,'\r'),('P003','Anita','Limpieza,Puerta','11 5313-4502',1,'\r'),('P004','Belen','Ayudante de cocina,Mesera','11 2672-0497',1,'\r'),('P005','Amelia','Mesera','11 5064-1123',1,'\r'),('P006','Giselle','Depiladora','',0,'\r'),('P007','Rodrigo','Encargado,Puerta,Cocinera,Mesera,Sonido','',0,NULL);
/*!40000 ALTER TABLE `personal_disponible` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `precios_vigencia`
--

DROP TABLE IF EXISTS `precios_vigencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `precios_vigencia` (
  `tipo_de_evento` varchar(255) DEFAULT NULL,
  `cantidad_minima` int(11) DEFAULT NULL,
  `cantidad_maxima` int(11) DEFAULT NULL,
  `fecha_de_vigencia` date DEFAULT NULL,
  `precio_por_hora` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `precios_vigencia`
--

LOCK TABLES `precios_vigencia` WRITE;
/*!40000 ALTER TABLE `precios_vigencia` DISABLE KEYS */;
INSERT INTO `precios_vigencia` VALUES ('INFANTILES',1,40,'2025-08-01',50000.00),('INFANTILES',41,50,'2025-08-01',55000.00),('INFANTILES',51,60,'2025-08-01',60000.00),('INFANTILES',61,70,'2025-08-01',65000.00),('INFANTILES',71,80,'2025-08-01',70000.00),('INFANTILES',81,90,'2025-08-01',75000.00),('INFANTILES',1,40,'2025-09-01',50000.00),('INFANTILES',41,50,'2025-09-01',55000.00),('INFANTILES',51,60,'2025-09-01',60000.00),('INFANTILES',61,70,'2025-09-01',65000.00),('INFANTILES',71,80,'2025-09-01',70000.00),('INFANTILES',81,90,'2025-09-01',75000.00),('INFORMALES',1,50,'2025-08-01',30000.00),('INFORMALES',51,60,'2025-08-01',35000.00),('INFORMALES',61,70,'2025-08-01',40000.00),('CON_SERVICIO_DE_MESA',1,40,'2025-08-01',60000.00),('CON_SERVICIO_DE_MESA',41,60,'2025-08-01',80000.00),('CON_SERVICIO_DE_MESA',61,80,'2025-08-01',100000.00),('SIN_SERVICIO_DE_MESA',1,40,'2025-08-01',50000.00),('SIN_SERVICIO_DE_MESA',41,60,'2025-08-01',55000.00),('SIN_SERVICIO_DE_MESA',61,80,'2025-08-01',60000.00),('SIN_SERVICIO_DE_MESA',81,100,'2025-08-01',65000.00),('SIN_SERVICIO_DE_MESA',101,120,'2025-08-01',70000.00),('BABY_SHOWERS',1,40,'2025-08-01',50000.00),('BABY_SHOWERS',41,50,'2025-08-01',55000.00),('BABY_SHOWERS',51,60,'2025-08-01',60000.00),('BABY_SHOWERS',61,70,'2025-08-01',65000.00),('BABY_SHOWERS',71,80,'2025-08-01',70000.00),('BABY_SHOWERS',81,90,'2025-08-01',75000.00),('FECHA_BANDAS',1,120,'2025-10-01',120000.00),('DEPILACION_DEFINITIVA',1,20,'2025-10-01',0.00),('ADOLESCENTES',1,40,'2025-11-01',50000.00),('ADOLESCENTES',41,50,'2025-11-01',55000.00),('ADOLESCENTES',51,60,'2025-11-01',60000.00),('ADOLESCENTES',61,70,'2025-11-01',65000.00);
/*!40000 ALTER TABLE `precios_vigencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles_por_evento`
--

DROP TABLE IF EXISTS `roles_por_evento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles_por_evento` (
  `id_evento` varchar(255) DEFAULT NULL,
  `rol_requerido` varchar(100) DEFAULT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `min_personas` int(11) DEFAULT NULL,
  `max_personas` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles_por_evento`
--

LOCK TABLES `roles_por_evento` WRITE;
/*!40000 ALTER TABLE `roles_por_evento` DISABLE KEYS */;
INSERT INTO `roles_por_evento` VALUES ('INFANTILES','Encargada',1,0,120),('INFANTILES','Cocinera',1,0,120),('INFANTILES','Puerta',1,0,120),('INFANTILES','Mesera',1,51,60),('INFANTILES','Mesera',2,61,80),('INFANTILES','Mesera',3,81,100),('INFANTILES','Mesera',4,101,120),('INFANTILES','Ayudante de cocina',1,51,80),('INFANTILES','Ayudante de cocina',2,81,120),('CON_SERVICIO_DE_MESA','Encargada',1,0,120),('CON_SERVICIO_DE_MESA','Cocinera',1,0,120),('CON_SERVICIO_DE_MESA','Puerta',1,0,120),('CON_SERVICIO_DE_MESA','Mesera',1,51,60),('CON_SERVICIO_DE_MESA','Mesera',2,61,80),('CON_SERVICIO_DE_MESA','Mesera',3,81,100),('CON_SERVICIO_DE_MESA','Mesera',4,101,120),('CON_SERVICIO_DE_MESA','Ayudante de cocina',1,51,80),('CON_SERVICIO_DE_MESA','Ayudante de cocina',2,81,120),('BABY_SHOWERS','Encargada',1,0,120),('BABY_SHOWERS','Cocinera',1,0,120),('BABY_SHOWERS','Puerta',1,0,120),('BABY_SHOWERS','Mesera',1,51,60),('BABY_SHOWERS','Mesera',2,61,80),('BABY_SHOWERS','Mesera',3,81,100),('BABY_SHOWERS','Mesera',4,101,120),('BABY_SHOWERS','Ayudante de cocina',1,51,80),('BABY_SHOWERS','Ayudante de cocina',2,81,120),('INFORMALES','Encargada',1,0,120),('INFORMALES','Puerta',1,0,120);
/*!40000 ALTER TABLE `roles_por_evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes`
--

DROP TABLE IF EXISTS `solicitudes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes` (
  `id_solicitud` int(11) NOT NULL AUTO_INCREMENT,
  `fecha_hora` datetime DEFAULT NULL,
  `tipo_de_evento` varchar(255) DEFAULT NULL,
  `cantidad_de_personas` varchar(100) DEFAULT NULL,
  `duracion` varchar(100) DEFAULT NULL,
  `fecha_evento` date DEFAULT NULL,
  `hora_evento` varchar(20) DEFAULT NULL,
  `precio_basico` decimal(10,2) DEFAULT NULL,
  `precio_final` decimal(10,2) DEFAULT NULL,
  `nombre_completo` varchar(255) DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `fingerprintid` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_solicitud`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes`
--

LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
INSERT INTO `solicitudes` VALUES (1,'2025-08-15 20:15:00','SIN_SERVICIO_DE_MESA','Hasta 100','8 horas','2025-09-20','19:00hs',280000.00,310000.00,'rodrigo villalba','12312312','villalbarodrigo2009@gmail.com','Fiesta de la primavera','Confirmado',''),(2,'2025-08-19 21:48:02','INFORMALES','Hasta 40','4 horas','2025-09-27','09:00hs',160000.00,190000.00,'Rodrigo Villalba','1155630357','villalbarodrigo2009@gmail.com','Depilación definitiva desde las 9 hasta las 21hs','Confirmado',''),(3,'2025-08-21 11:10:33','CON_SERVICIO_DE_MESA','Hasta 60','8 horas','2025-09-06','19:00hs',660000.00,715000.00,'lorena Callegary','1131455765','villalbarodrigo2009@gmail.com','Cumpleaños de 15 de la hija de Lore','Confirmado',''),(4,'2025-10-01 10:43:04','INFORMALES','Hasta 50','6 horas','2025-09-07','14:00hs',180000.00,180000.00,'Noelia Noemi Adra','11 5593-6547','villalbarodrigo2009@gmail.com','Cumpleaños de 13 años sin adicionales','Confirmado',''),(5,'2025-10-01 19:44:30','INFORMALES','Hasta 50','8 horas','2025-10-11','21:00hs',240000.00,260000.00,'Melody Aldana Gerez','1132537536','villalbarodrigo2009@gmail.com','','Confirmado',''),(6,'2025-10-01 22:02:04','INFORMALES','Hasta 50','10 horas','2025-10-25','09:00hs',300000.00,300000.00,'Giselle','11 4417-6332','villalbarodrigo2009@gmail.com','Depilación definitiva','Confirmado',''),(7,'2025-10-01 22:07:04','INFORMALES','Hasta 50','8 horas','2025-11-29','19:00hs',240000.00,240000.00,'Marcelo Chanca','11 2658-5081','villalbarodrigo2009@gmail.com','Juntada con los pibes de futbol de saturno, lechon','Confirmado',''),(8,'2025-10-01 22:16:15','FECHA_BANDAS','Hasta 70','10 horas','2025-11-08','19:00hs',400000.00,400000.00,'Jhony Sebas','1158598259','villalbarodrigo2009@gmail.com','Fecha con bandas, toca Las Mentas, atiende la barra María','Confirmado',''),(9,'2025-10-09 13:53:19','INFORMALES','Hasta 50','6 horas','2025-10-19','12:00hs',180000.00,180000.00,'Jessica','1123903156','jfuentes1078@gmail.com','','Solicitado','8b2ea5f41aee24f433b0133d263cfb1a'),(10,'2025-11-26 13:33:42','INFORMALES','Hasta 70','10 horas','2025-12-06','19:00hs',400000.00,NULL,'Rodrigo Villalba','11 22757887','villalbarodrigo2009@gmail.com','Fecha de bandas de Rock, Las Mentas, Pateando Bares y Reite','Confirmado','65794ab644f1b65901b12df2b68ff8bc');
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_adicionales`
--

DROP TABLE IF EXISTS `solicitudes_adicionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_adicionales` (
  `timestamp` datetime DEFAULT NULL,
  `id_solicitud` int(11) DEFAULT NULL,
  `adicional_nombre` varchar(255) DEFAULT NULL,
  `adicional_precio` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_adicionales`
--

LOCK TABLES `solicitudes_adicionales` WRITE;
/*!40000 ALTER TABLE `solicitudes_adicionales` DISABLE KEYS */;
INSERT INTO `solicitudes_adicionales` VALUES ('2025-10-01 00:00:00',5,'Manteles negros sólos',20000.00);
/*!40000 ALTER TABLE `solicitudes_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_personal`
--

DROP TABLE IF EXISTS `solicitudes_personal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_personal` (
  `id_asignacion` varchar(50) NOT NULL,
  `id_solicitud` int(11) DEFAULT NULL,
  `rol_requerido` varchar(100) DEFAULT NULL,
  `id_personal_asignado` varchar(50) DEFAULT NULL,
  `estado_asignacion` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_asignacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_personal`
--

LOCK TABLES `solicitudes_personal` WRITE;
/*!40000 ALTER TABLE `solicitudes_personal` DISABLE KEYS */;
INSERT INTO `solicitudes_personal` VALUES ('A0001',1,'Cocinera','P004','Pendiente'),('A0002',1,'Encargada','P001','Pendiente'),('A0003',2,'Encargada','P001','Asignado'),('A0004',2,'Puerta','P003','Asignado'),('A0005',5,'Encargada','P001','Asignado'),('A0006',5,'Puerta','P003','Asignado');
/*!40000 ALTER TABLE `solicitudes_personal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id_unico` char(36) NOT NULL COMMENT 'UUID usado como identificador único y Código QR',
  `evento_id` int(11) NOT NULL,
  `email_comprador` varchar(255) NOT NULL COMMENT 'Email del destinatario del ticket',
  `nombre_comprador` varchar(255) NOT NULL COMMENT 'Nombre completo del comprador',
  `cupon_id` int(11) DEFAULT NULL COMMENT 'Referencia al cupón usado (si aplica)',
  `precio_pagado` decimal(10,2) NOT NULL COMMENT 'Precio final pagado por el ticket',
  `fecha_compra` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` enum('PENDIENTE_PAGO','PAGADO','ESCANEADO','ANULADO') NOT NULL DEFAULT 'PENDIENTE_PAGO',
  `fecha_escaneo` datetime DEFAULT NULL COMMENT 'Momento en que fue validado en la puerta',
  PRIMARY KEY (`id_unico`),
  KEY `evento_id` (`evento_id`),
  KEY `cupon_id` (`cupon_id`),
  KEY `idx_ticket_email_estado` (`email_comprador`,`estado`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`),
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`cupon_id`) REFERENCES `cupones` (`id`) ON DELETE SET NULL
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
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `rol` varchar(50) DEFAULT 'admin',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
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

-- Dump completed on 2025-11-26 13:35:14
