/*
=============================================================================
TDC App - Test Data (Datos Dinámicos)
=============================================================================
CONTIENE: Datos que cambiarán con el uso del sistema
- clientes: Clientes de prueba
- usuarios: Usuarios de prueba
- solicitudes: Solicitudes de clientes
- solicitudes_alquiler: Detalles de solicitudes de alquiler
- solicitudes_fechas_bandas: Detalles de solicitudes de bandas
- solicitudes_servicios: Detalles de solicitudes de servicios
- solicitudes_talleres: Detalles de solicitudes de talleres
- solicitudes_adicionales: Servicios adicionales solicitados
- personal_pagos: Pagos realizados al personal
- eventos_confirmados: Eventos confirmados
- eventos_lineup: Bandas en el lineup de eventos
- eventos_bandas_invitadas: Bandas invitadas
- eventos_personal: Personal asignado a eventos
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

-- Clientes de prueba
LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` (`id_cliente`, `nombre`, `telefono`, `email`, `notas`, `creado_en`, `actualizado_en`) VALUES (1,'María García','1155667788','maria.garcia@email.com',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(2,'Carlos López','1144556677','carlos.lopez@email.com',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(3,'Roberto Fernández','1133445566','roberto.f@email.com',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(4,'Ana Martínez','1122334455','ana.m@email.com',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(5,'Juan Pérez','123456789','juan.perez@email.com',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(6,'Ana López','987654321','ana.lopez@email.com',NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(7,'Reite',NULL,NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(8,'Jazz en el Templo',NULL,NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(9,'Cumbia Power',NULL,NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(10,'Rock March',NULL,NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(11,'El loco legendario',NULL,'email@email.com',NULL,'2026-02-22 16:16:33','2026-02-22 16:17:22');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

-- Usuarios de prueba
LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` (`id`, `email`,`password_hash`, `nombre`, `rol`, `activo`, `creado_en`) VALUES (1,'rodrigo@rodrigo','$2b$10$OHa6QTfDeP6DAn9lReTkE.eETT8TAqD58ir3Hj7QCqz999jEZ4SYe',NULL,'admin',1,'2026-02-22 16:16:33');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

-- Solicitudes
LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
INSERT INTO `solicitudes` (`id`, `categoria`, `fecha_creacion`, `estado`, `es_publico`, `descripcion_corta`, `descripcion_larga`, `url_flyer`, `descripcion`, `id_cliente`) VALUES (1,'ALQUILER','2026-02-22 16:16:33','Solicitado',0,'Cumpleaños de 7 años temático de Minecraft',NULL,NULL,'Cumpleaños de 7 años temático de Minecraft',1),(2,'ALQUILER','2026-02-22 16:16:33','Solicitado',0,'Fiesta de 15 para mi hija Valentina',NULL,NULL,'Fiesta de 15 para mi hija Valentina',2),(3,'ALQUILER','2026-02-22 16:16:33','Solicitado',0,'Almuerzo familiar de fin de año',NULL,NULL,'Almuerzo familiar de fin de año',3),(4,'ALQUILER','2026-02-22 16:16:33','Solicitado',0,'Asado familiar de fin de año',NULL,NULL,'Asado familiar de fin de año',4),(5,'TALLERES','2026-02-22 16:16:33','Confirmado',1,'Taller de Fotografía',NULL,NULL,'Taller de Fotografía',5),(6,'SERVICIOS','2026-02-22 16:16:33','Confirmado',1,'Servicio de Catering',NULL,NULL,'Servicio de Catering',6),(7,'BANDAS','2026-02-22 16:16:33','Confirmado',1,'Gran noche de rock nacional con Tributo a La Renga',NULL,NULL,'Gran noche de rock nacional con Tributo a La Renga',7),(8,'BANDAS','2026-02-22 16:16:33','Confirmado',1,'Noche de jazz con los mejores músicos de la zona sur',NULL,NULL,'Noche de jazz con los mejores músicos de la zona sur',8),(9,'BANDAS','2026-02-22 16:16:33','Confirmado',1,'La mejor cumbia para cerrar el año bailando!',NULL,NULL,'La mejor cumbia para cerrar el año bailando!',9),(10,'BANDAS','2026-02-22 16:16:33','Pendiente',1,'Noche de rock con bandas emergentes',NULL,NULL,'Noche de rock con bandas emergentes',10),(11,'BANDAS','2026-02-22 16:16:33','Confirmado',1,'Tributo a las mejores bandas de rock',NULL,'/uploads/flyers/solicitud_11.png','Tributo a las mejores bandas de rock',11);
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;

-- Solicitudes de alquiler
LOCK TABLES `solicitudes_alquiler` WRITE;
/*!40000 ALTER TABLE `solicitudes_alquiler` DISABLE KEYS */;
INSERT INTO `solicitudes_alquiler` (`id_solicitud`, `tipo_servicio`, `fecha_evento`, `hora_evento`, `duracion`, `cantidad_de_personas`, `precio_basico`, `precio_final`, `tipo_de_evento`, `descripcion`, `estado`) VALUES (1,'INFANTILES','2025-12-20','15:00','4 horas','25',200000.00,NULL,'ALQUILER_SALON','Cumpleaños de 7 años temático de Minecraft','Solicitado'),(2,'ADOLESCENTES','2025-12-22','20:00','5 horas','40',250000.00,NULL,'ALQUILER_SALON','Fiesta de 15 para mi hija Valentina','Solicitado'),(3,'CON_SERVICIO_DE_MESA','2025-12-27','13:00','4 horas','30',240000.00,NULL,'ALQUILER_SALON','Almuerzo familiar de fin de año','Solicitado'),(4,'INFORMALES','2025-12-29','12:00','6 horas','45',180000.00,NULL,'ALQUILER_SALON','Asado familiar de fin de año','Solicitado');
/*!40000 ALTER TABLE `solicitudes_alquiler` ENABLE KEYS */;
UNLOCK TABLES;

-- Solicitudes de fechas de bandas
LOCK TABLES `solicitudes_fechas_bandas` WRITE;
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` DISABLE KEYS */;
INSERT INTO `solicitudes_fechas_bandas` (`id_solicitud`, `id_banda`, `fecha_evento`, `hora_evento`, `duracion`, `descripcion`, `precio_basico`, `precio_final`, `precio_anticipada`, `precio_puerta`, `precio_puerta_propuesto`, `cantidad_bandas`, `expectativa_publico`, `bandas_json`, `invitadas_json`, `estado`, `fecha_alternativa`, `notas_admin`, `id_evento_generado`, `creado_en`, `actualizado_en`) VALUES (7,NULL,'2025-12-20','21:00','5 horas','Gran noche de rock nacional con Tributo a La Renga',3000.00,NULL,NULL,NULL,NULL,2,'150',NULL,NULL,'Confirmado',NULL,NULL,1,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(8,NULL,'2025-12-21','20:00','5 horas','Noche de jazz con los mejores músicos de la zona sur',2500.00,NULL,NULL,NULL,NULL,1,'100',NULL,NULL,'Confirmado',NULL,NULL,2,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(9,NULL,'2025-12-28','22:00','6 horas','La mejor cumbia para cerrar el año bailando!',2000.00,NULL,NULL,NULL,NULL,1,'180',NULL,NULL,'Confirmado',NULL,NULL,3,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(10,NULL,'2026-03-15','20:00','4 horas','Noche de rock con bandas emergentes',2800.00,NULL,NULL,NULL,NULL,1,'120',NULL,NULL,'Pendiente',NULL,NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(11,NULL,'2026-04-10','21:00','3 horas','Tributo a las mejores bandas de rock',3500.00,NULL,NULL,NULL,NULL,2,'200','[{\"id_banda\":1,\"nombre\":\"Reite\",\"orden_show\":0,\"es_principal\":true},{\"id_banda\":4,\"nombre\":\"Cumbia Sudaka\",\"orden_show\":1,\"es_principal\":false}]',NULL,'Confirmado',NULL,NULL,4,'2026-02-22 16:16:33','2026-02-22 16:17:29');
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` ENABLE KEYS */;
UNLOCK TABLES;

-- Solicitudes de servicios
LOCK TABLES `solicitudes_servicios` WRITE;
/*!40000 ALTER TABLE `solicitudes_servicios` DISABLE KEYS */;
INSERT INTO `solicitudes_servicios` (`id_solicitud`, `tipo_servicio`, `fecha_evento`, `hora_evento`, `duracion`, `precio`) VALUES (6,'Servicio de Catering','2026-04-20','12:00','5 horas',5000.00);
/*!40000 ALTER TABLE `solicitudes_servicios` ENABLE KEYS */;
UNLOCK TABLES;

-- Solicitudes de talleres
LOCK TABLES `solicitudes_talleres` WRITE;
/*!40000 ALTER TABLE `solicitudes_talleres` DISABLE KEYS */;
INSERT INTO `solicitudes_talleres` (`id_solicitud`, `nombre_taller`, `fecha_evento`, `hora_evento`, `duracion`, `precio`) VALUES (5,'Taller de Fotografía','2026-04-15','18:00','2 horas',1500.00);
/*!40000 ALTER TABLE `solicitudes_talleres` ENABLE KEYS */;
UNLOCK TABLES;

-- Solicitudes adicionales
LOCK TABLES `solicitudes_adicionales` WRITE;
/*!40000 ALTER TABLE `solicitudes_adicionales` DISABLE KEYS */;
INSERT INTO `solicitudes_adicionales` (`id`, `id_solicitud`, `adicional_nombre`, `adicional_precio`, `creado_en`) VALUES (1,4,'Mesa extra',5000.00,'2026-02-22 16:16:33'),(2,4,'Silla extra',300.00,'2026-02-22 16:16:33');
/*!40000 ALTER TABLE `solicitudes_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

-- Pagos de personal
LOCK TABLES `personal_pagos` WRITE;
/*!40000 ALTER TABLE `personal_pagos` DISABLE KEYS */;
INSERT INTO `personal_pagos` (`id`, `id_personal`, `id_solicitud`, `monto_acordado`, `monto_pagado`, `fecha_trabajo`, `fecha_pago`, `metodo_pago`, `comprobante`, `estado`, `descripcion`, `notas`, `creado_por`, `creado_en`, `actualizado_en`) VALUES (1,'EMP001',13,15000.00,15000.00,'2025-12-20','2025-12-21','transferencia',NULL,'pagado','DJ para evento del 20/12',NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33'),(2,'EMP002',13,8000.00,4000.00,'2025-12-20','2025-12-21','efectivo',NULL,'parcial','Mesera para evento del 20/12 - Pago parcial',NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33');
/*!40000 ALTER TABLE `personal_pagos` ENABLE KEYS */;
UNLOCK TABLES;

-- Eventos confirmados
LOCK TABLES `eventos_confirmados` WRITE;
/*!40000 ALTER TABLE `eventos_confirmados` DISABLE KEYS */;
INSERT INTO `eventos_confirmados` (`id`, `id_solicitud`, `tipo_evento`, `tabla_origen`, `nombre_evento`, `descripcion`, `url_flyer`, `fecha_evento`, `hora_inicio`, `duracion_estimada`, `id_cliente`, `es_publico`, `activo`, `genero_musical`, `cantidad_personas`, `tipo_servicio`, `nombre_taller`, `confirmado_en`, `actualizado_en`, `cancelado_en`) VALUES (1,7,'BANDA','solicitudes_fechas_bandas','Reite','Gran noche de rock nacional con Tributo a La Renga',NULL,'2025-12-20','21:00:00',NULL,1,1,1,'Rock',150,NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33',NULL),(2,8,'BANDA','solicitudes_fechas_bandas','Jazz en el Templo','Noche de jazz con los mejores músicos de la zona sur',NULL,'2025-12-21','20:00:00',NULL,1,1,1,'Jazz',100,NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33',NULL),(3,9,'BANDA','solicitudes_fechas_bandas','Cumbia Power','La mejor cumbia para cerrar el año bailando!',NULL,'2025-12-28','22:00:00',NULL,1,1,1,'Cumbia',180,NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33',NULL),(4,11,'BANDA','solicitudes_fechas_bandas','Rock Legends','Tributo a las mejores bandas de rock',NULL,'2026-04-10','21:00:00',NULL,1,1,1,'Rock',200,NULL,NULL,'2026-02-22 16:16:33','2026-02-22 16:16:33',NULL);
/*!40000 ALTER TABLE `eventos_confirmados` ENABLE KEYS */;
UNLOCK TABLES;

-- Lineup de eventos
LOCK TABLES `eventos_lineup` WRITE;
/*!40000 ALTER TABLE `eventos_lineup` DISABLE KEYS */;
INSERT INTO `eventos_lineup` (`id`, `id_evento_confirmado`, `id_banda`, `nombre_banda`, `orden_show`, `es_principal`, `es_solicitante`, `hora_inicio`, `hora_fin`, `duracion_minutos`, `estado`, `notas`) VALUES (1,1,2,'Pateando Bares',0,0,0,'21:30:00',NULL,45,'confirmada',NULL),(2,1,3,'Las Mentas',1,0,0,'22:30:00',NULL,50,'confirmada',NULL),(3,1,1,'Reite',2,1,1,'23:45:00',NULL,90,'confirmada',NULL),(4,3,4,'Cumbia Sudaka',0,1,1,'22:30:00',NULL,120,'confirmada',NULL),(6,4,3,'Las Mentas',1,1,1,'22:15:00',NULL,75,'confirmada',NULL),(7,4,4,'Cumbia Sudaka',0,0,0,NULL,NULL,NULL,'invitada',NULL);
/*!40000 ALTER TABLE `eventos_lineup` ENABLE KEYS */;
UNLOCK TABLES;

-- Bandas invitadas
LOCK TABLES `eventos_bandas_invitadas` WRITE;
/*!40000 ALTER TABLE `eventos_bandas_invitadas` DISABLE KEYS */;
/*!40000 ALTER TABLE `eventos_bandas_invitadas` ENABLE KEYS */;
UNLOCK TABLES;

-- Personal asignado a eventos
LOCK TABLES `eventos_personal` WRITE;
/*!40000 ALTER TABLE `eventos_personal` DISABLE KEYS */;
/*!40000 ALTER TABLE `eventos_personal` ENABLE KEYS */;
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET @OLD_SQL_NOTES=@OLD_SQL_NOTES */;

