-- =========================================================
-- RESTAURAR DATOS DE PRUEBA DE SOLICITUDES
-- Este script restaura las solicitudes de prueba que se guardaron anteriormente
-- (alquiler de salón, talleres, eventos informales, etc.)
-- =========================================================

USE tdc_db;

-- Nota: Las tablas ya deben existir de los scripts anteriores
-- Si faltan datos, esto insertará los registros de prueba

-- Restaurar datos de solicitudes
-- NOTA: Los valores de tipo_servicio se insertarán en el campo correcto
-- El campo tipo_de_evento se establece a 'ALQUILER_SALON' por defecto en la migración 16
INSERT INTO `solicitudes` (id_solicitud, fecha_hora, tipo_servicio, cantidad_de_personas, duracion, fecha_evento, hora_evento, precio_basico, precio_final, nombre_completo, telefono, email, descripcion, estado, fingerprintid) VALUES 
(1,'2025-08-15 20:15:00','SIN_SERVICIO_DE_MESA','Hasta 100','8 horas','2025-09-20','19:00hs',280000.00,310000.00,'rodrigo villalba','12312312','villalbarodrigo2009@gmail.com','Fiesta de la primavera','Confirmado',''),
(2,'2025-08-19 21:48:02','INFORMALES','Hasta 40','4 horas','2025-09-27','09:00hs',160000.00,190000.00,'Rodrigo Villalba','1155630357','villalbarodrigo2009@gmail.com','Depilación definitiva desde las 9 hasta las 21hs','Confirmado',''),
(3,'2025-08-21 11:10:33','CON_SERVICIO_DE_MESA','Hasta 60','8 horas','2025-09-06','19:00hs',660000.00,715000.00,'lorena Callegary','1131455765','villalbarodrigo2009@gmail.com','Cumpleaños de 15 de la hija de Lore','Confirmado',''),
(4,'2025-10-01 10:43:04','INFORMALES','Hasta 50','6 horas','2025-09-07','14:00hs',180000.00,180000.00,'Noelia Noemi Adra','11 5593-6547','villalbarodrigo2009@gmail.com','Cumpleaños de 13 años sin adicionales','Confirmado',''),
(5,'2025-10-01 19:44:30','INFORMALES','Hasta 50','8 horas','2025-10-11','21:00hs',240000.00,260000.00,'Melody Aldana Gerez','1132537536','villalbarodrigo2009@gmail.com','','Confirmado',''),
(6,'2025-10-01 22:02:04','INFORMALES','Hasta 50','10 horas','2025-10-25','09:00hs',300000.00,300000.00,'Giselle','11 4417-6332','villalbarodrigo2009@gmail.com','Depilación definitiva','Confirmado',''),
(7,'2025-10-01 22:07:04','INFORMALES','Hasta 50','8 horas','2025-11-29','19:00hs',240000.00,240000.00,'Marcelo Chanca','11 2658-5081','villalbarodrigo2009@gmail.com','Juntada con los pibes de futbol de saturno, lechon','Confirmado',''),
(8,'2025-10-01 22:16:15','INFORMALES','Hasta 70','10 horas','2025-11-08','19:00hs',400000.00,400000.00,'Jhony Sebas','1158598259','villalbarodrigo2009@gmail.com','Fecha con bandas, toca Las Mentas, atiende la barra María','Confirmado',''),
(9,'2025-10-09 13:53:19','INFORMALES','Hasta 50','6 horas','2025-10-19','12:00hs',180000.00,180000.00,'Jessica','1123903156','jfuentes1078@gmail.com','','Solicitado','8b2ea5f41aee24f433b0133d263cfb1a'),
(10,'2025-11-14 02:17:58','INFANTILES',NULL,NULL,'2025-12-25',NULL,0.00,NULL,NULL,NULL,NULL,NULL,'Solicitado',NULL),
(11,'2025-11-21 03:25:37','INFANTILES','Hasta 50','4 horas','2025-11-23','16:00hs',220000.00,NULL,NULL,NULL,NULL,NULL,'Solicitado','bdaf521be181fd91b0488e2fa80e298f'),
(12,'2025-11-21 03:56:10','INFANTILES','Hasta 50','4 horas','2025-11-23','13:00hs',220000.00,NULL,NULL,NULL,NULL,NULL,'Solicitado','19f845926e1de6cfef0bf2955113583e'),
(13,'2025-11-21 04:17:18','INFORMALES','Hasta 60','8 horas','2025-11-23','10:00hs',280000.00,NULL,NULL,NULL,NULL,NULL,'Solicitado','6ea22cea6777c030b5400f678c1e3b52');

-- Restaurar datos de solicitudes_adicionales
INSERT INTO `solicitudes_adicionales` VALUES 
('2025-10-01 00:00:00',5,'Manteles negros sólos',20000.00),
('2025-11-21 05:36:51',13,'Inflable Cocodrilo',30000.00);

SELECT '✅ Datos de prueba de solicitudes restaurados exitosamente.' AS status;
