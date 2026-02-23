/*
=============================================================================
TDC App - Test Data (Datos de Prueba para Desarrollo)
=============================================================================
CONTIENE: Datos transaccionales de ejemplo para testing
- Clientes de prueba
- Usuarios del sistema
- Solicitudes de diferentes tipos
- Detalles de solicitudes (alquiler, bandas, servicios, talleres)
- Eventos confirmados con lineups de bandas
- Pagos de personal
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
-- CLIENTES DE PRUEBA
-- =====================================================================
LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` 
  (`id`, `nombre`, `email`, `telefono`, `whatsapp`, `referencia_como_se_entero`, `es_cliente_activo`, `fecha_ultimo_contacto`, `creado_en`, `actualizado_en`) 
VALUES 
  (1, 'María García Smith', 'maria.garcia@gmail.com', '1141234567', '1141234567', 'REDES_SOCIALES', 1, '2026-02-20 10:30:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (2, 'Carlos López Martínez', 'carlos.lopez@hotmail.com', '1155556789', '1155556789', 'RECOMENDACION', 1, '2026-02-19 14:15:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (3, 'Roberto Fernández', 'rfernandez@yahoo.com', '1198765432', '1198765432', 'GOOGLE', 1, '2026-02-15 09:00:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (4, 'Ana Martínez Rodríguez', 'ana.martinez@gmail.com', '1155551111', '1155551111', 'AMIGA', 1, '2026-02-18 11:45:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (5, 'Juan Pérez López', 'juan.perez@outlok.com', '1144442222', '1144442222', 'INSTAGRAM', 1, '2026-02-17 16:20:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (6, 'Ana Lucía López', 'ana.lucia.lopez@gmail.com', '1133333333', '1133333333', 'FACEBOOK', 1, '2026-02-16 13:30:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (7, 'Banda Reite', 'reite.tributo@gmail.com', '1155001122', '1155001122', 'CONTACTO_DIRECTO', 1, '2026-02-22 08:00:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (8, 'Banda Pateando Bares', 'pateando.bares@gmail.com', '1155003344', '1155003344', 'CONTACTO_DIRECTO', 1, '2026-02-22 09:30:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (9, 'Banda Las Mentas', 'lasmentas@gmail.com', '1155005566', '1155005566', 'CONTACTO_DIRECTO', 1, '2026-02-22 10:15:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (10, 'Banda Cumbia Sudaka', 'cumbiasudaka@gmail.com', '1155009900', '1155009900', 'CONTACTO_DIRECTO', 1, '2026-02-22 11:00:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33'),
  (11, 'Lucia, Masajista', 'lucia.m@example.com', '1150012345', '1150012345', 'NETWORK', 0, '2026-02-10 15:00:00', '2026-02-22 16:16:33', '2026-02-22 16:16:33');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- USUARIOS DEL SISTEMA
-- =====================================================================
LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` 
  (`id`, `email`, `contrasena`, `es_admin`, `activo`, `nombre_completo`, `creado_en`, `actualizado_en`) 
VALUES 
  (1, 'rodrigo@rodrigo', '$2b$10$7V0f1HNFpPJw0dEjDkJA8O4c5jYNZ5z5fKzMf5qW8R9z5K5zKzKzO', 1, 1, 'Rodrigo Admin', '2026-02-22 16:16:33', '2026-02-22 16:16:33');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES PRINCIPALES
-- =====================================================================
LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
INSERT INTO `solicitudes` 
  (`id`, `id_cliente`, `id_tipo_solicitud`, `fecha_solicitada`, `fecha_evento`, `estado`, `notas_cliente`, `precio_total`, `monto_seña`, `descuento`, `precio_final`, `creado_en`) 
VALUES 
  -- SOLICITUDES DE ALQUILER
  (1, 1, 'ALQUILER', '2026-02-10 10:00:00', '2026-03-15 14:00:00', 'Solicitado', 
   'Cumpleaños infantil - unos 50 niños', 180000.00, 50000.00, 0.00, 180000.00, '2026-02-10 10:00:00'),

  (2, 2, 'ALQUILER', '2026-02-12 11:30:00', '2026-03-22 16:00:00', 'Confirmado', 
   'Fiesta de 15 años - necesitamos meseras y servicio completo', 200000.00, 80000.00, 0.00, 200000.00, '2026-02-12 11:30:00'),

  (3, 3, 'ALQUILER', '2026-02-14 15:45:00', '2026-03-28 12:00:00', 'Solicitado', 
   'Baby shower para 40 personas', 160000.00, 50000.00, 0.00, 160000.00, '2026-02-14 15:45:00'),

  (4, 4, 'ALQUILER', '2026-02-16 09:15:00', '2026-04-05 18:00:00', 'Pendiente', 
   'Asado informal - 80 personas', 150000.00, 50000.00, 0.00, 150000.00, '2026-02-16 09:15:00'),

  -- SOLICITUDES DE BANDAS
  (5, 5, 'BANDAS', '2026-02-18 13:00:00', '2026-03-30 21:00:00', 'Solicitado', 
   'Queremos 2 bandas: Reite y Pateando Bares', 240000.00, NULL, 0.00, 240000.00, '2026-02-18 13:00:00'),

  (6, 6, 'BANDAS', '2026-02-19 10:30:00', '2026-04-10 20:00:00', 'Confirmado', 
   'Fecha con Las Mentas - música en vivo toda la noche', 120000.00, NULL, 0.00, 120000.00, '2026-02-19 10:30:00'),

  (7, 7, 'BANDAS', '2026-02-20 14:20:00', '2026-04-15 22:00:00', 'Solicitado', 
   'Nuestra propia fecha de Reite', 120000.00, NULL, 0.00, 120000.00, '2026-02-20 14:20:00'),

  (8, 8, 'BANDAS', '2026-02-20 15:00:00', '2026-04-18 21:30:00', 'Solicitado', 
   'Fecha de Pateando Bares con Cumbia Sudaka', NULL, NULL, 0.00, NULL, '2026-02-20 15:00:00'),

  (9, 9, 'BANDAS', '2026-02-21 11:00:00', '2026-04-20 20:00:00', 'Confirmado', 
   'Nuestra fecha Las Mentas - público general', NULL, NULL, 0.00, NULL, '2026-02-21 11:00:00'),

  -- SOLICITUD DE SERVICIOS
  (10, 2, 'SERVICIOS', '2026-02-17 12:30:00', '2026-03-22 10:00:00', 'Solicitado', 
   'Servicio de catering para fiesta de 15', 5000.00, NULL, 0.00, 5000.00, '2026-02-17 12:30:00'),

  -- SOLICITUD DE TALLER
  (11, 1, 'TALLERES_ACTIVIDADES', '2026-02-11 16:45:00', '2026-03-08 15:00:00', 'Solicitado', 
   'Taller de fotografía de eventos', 1500.00, NULL, 0.00, 1500.00, '2026-02-11 16:45:00');
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES DE ALQUILER (DETALLES)
-- =====================================================================
LOCK TABLES `solicitudes_alquiler` WRITE;
/*!40000 ALTER TABLE `solicitudes_alquiler` DISABLE KEYS */;
INSERT INTO `solicitudes_alquiler` 
  (`id_solicitud`, `id_tipo_evento`, `cantidad_personas`, `duracion_horas`, `hora_inicio`, `precio_por_hora`, `cantidad_meseras`, `extras`, `observaciones`) 
VALUES 
  (1, 'INFANTILES', 50, 4, '14:00:00', 55000.00, 1, 
   '{"inflable": "Cocodrilo", "servicio_mesa": false}',
   'Especificar clima para armar inflable'),

  (2, 'CON_SERVICIO_DE_MESA', 60, 4, '16:00:00', 80000.00, 2, 
   '{"inflable": null, "servicio_mesa": true, "manteles": "negros_blanco"}',
   'Confirmar número de meseras con una semana de anticipación'),

  (3, 'BABY_SHOWERS', 40, 3, '12:00:00', 50000.00, 1, 
   '{"inflable": "Princesa", "servicio_mesa": false}',
   'Decoración por cuenta de cliente'),

  (4, 'INFORMALES', 80, 4, '18:00:00', 40000.00, 0, 
   '{"inflable": null, "servicio_mesa": false, "parrilla": true}',
   'Asado informal - cliente lleva carnes y bebidas');
/*!40000 ALTER TABLE `solicitudes_alquiler` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES CON FECHAS DE BANDAS (DETALLES)
-- =====================================================================
LOCK TABLES `solicitudes_fechas_bandas` WRITE;
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` DISABLE KEYS */;
INSERT INTO `solicitudes_fechas_bandas` 
  (`id_solicitud`, `id_banda_principal`, `banda_telonera_1`, `banda_telonera_2`, `hora_inicio`, `hora_fin`, `lineup`, `aforo_esperado`, `mecanica_entrada`, `datos_adicionales`) 
VALUES 
  (5, 1, 2, NULL, '21:00:00', '01:00:00', 
   '[{"banda":"Reite","orden":1,"duracion_min":60},{"banda":"Pateando Bares","orden":2,"duracion_min":60}]',
   200, 'PUERTA_ANTICIPADA', 
   '{"flyers": true, "publicacion_redes": true, "sonido": "profesional"}'),

  (6, 3, NULL, NULL, '20:00:00', '23:30:00', 
   '[{"banda":"Las Mentas","orden":1,"duracion_min":120}]',
   150, 'PUERTA', 
   '{"flyers": true, "publicacion_redes": true, "sonido": "profesional"}'),

  (7, 1, NULL, NULL, '22:00:00', '02:00:00', 
   '[{"banda":"Reite","orden":1,"duracion_min":180}]',
   300, 'TABLA_CONTROL', 
   '{"tema": "Tributo a La Renga", "sonido": "profesional", "escenario": "frente"}'),

  (8, 2, 4, NULL, '21:30:00', '02:00:00', 
   '[{"banda":"Pateando Bares","orden":1,"duracion_min":90},{"banda":"Cumbia Sudaka","orden":2,"duracion_min":90}]',
   250, 'PUERTA', 
   '{"flyers": true, "publicacion_redes": true}'),

  (9, 3, NULL, NULL, '20:00:00', '23:00:00', 
   '[{"banda":"Las Mentas","orden":1,"duracion_min":150}]',
   180, 'PUERTA', 
   '{"afiche": true, "radios_locales": true}');
/*!40000 ALTER TABLE `solicitudes_fechas_bandas` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES DE SERVICIOS (DETALLES)
-- =====================================================================
LOCK TABLES `solicitudes_servicios` WRITE;
/*!40000 ALTER TABLE `solicitudes_servicios` DISABLE KEYS */;
INSERT INTO `solicitudes_servicios` 
  (`id_solicitud`, `id_servicio`, `cantidad_personas`, `duracion_minutos`, `monto`) 
VALUES 
  (10, 1, 60, 60, 5000.00);
/*!40000 ALTER TABLE `solicitudes_servicios` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES DE TALLERES (DETALLES)
-- =====================================================================
LOCK TABLES `solicitudes_talleres` WRITE;
/*!40000 ALTER TABLE `solicitudes_talleres` DISABLE KEYS */;
INSERT INTO `solicitudes_talleres` 
  (`id_solicitud`, `id_taller`, `cantidad_personas`, `duracion_minutos`, `monto`, `nivel`) 
VALUES 
  (11, 1, 15, 120, 1500.00, 'principiante');
/*!40000 ALTER TABLE `solicitudes_talleres` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- SOLICITUDES ADICIONALES (EXTRAS CONTRATADOS)
-- =====================================================================
LOCK TABLES `solicitudes_adicionales` WRITE;
/*!40000 ALTER TABLE `solicitudes_adicionales` DISABLE KEYS */;
INSERT INTO `solicitudes_adicionales` 
  (`id_solicitud`, `id_adicional`, `cantidad`, `precio_unitario`, `subtotal`) 
VALUES 
  (2, 18, 1, 5000.00, 5000.00),  -- Mesa extra
  (2, 19, 4, 300.00, 1200.00);   -- 4 Sillas extra
/*!40000 ALTER TABLE `solicitudes_adicionales` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- PAGOS DE PERSONAL
-- =====================================================================
LOCK TABLES `personal_pagos` WRITE;
/*!40000 ALTER TABLE `personal_pagos` DISABLE KEYS */;
INSERT INTO `personal_pagos` 
  (`id`, `id_personal`, `id_evento`, `rol_en_evento`, `fecha_evento`, `monto_total`, `monto_pagado`, `estado_pago`, `metodo_pago`, `fecha_pago`, `notas`, `creado_en`) 
VALUES 
  (1, 'P007', 6, 'DJ', '2026-03-30 21:00:00', 15000.00, 15000.00, 'PAGADO', 'TRANSFERENCIA', '2026-03-31 10:00:00', 
   'DJ para fecha de Reite', '2026-02-22 16:16:33'),

  (2, 'P002', 2, 'Mesera', '2026-03-22 16:00:00', 8000.00, 4000.00, 'PARCIAL', 'EFECTIVO', '2026-03-22 18:00:00', 
   'Mesera fiesta 15 - Falta $4000 a cancelar', '2026-02-22 16:16:33');
/*!40000 ALTER TABLE `personal_pagos` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- EVENTOS CONFIRMADOS (REGISTRO DE EVENTOS REALIZADOS)
-- =====================================================================
LOCK TABLES `eventos_confirmados` WRITE;
/*!40000 ALTER TABLE `eventos_confirmados` DISABLE KEYS */;
INSERT INTO `eventos_confirmados` 
  (`id`, `id_solicitud`, `nombre_evento`, `fecha_evento`, `tipo_evento`, `cantidad_personas`, `genero_banda`, `es_fecha_propia`, `estado_evento`, `creado_en`) 
VALUES 
  (1, 5, 'Reite + Pateando Bares', '2026-03-30 21:00:00', 'FECHA_BANDAS', 200, 'Rock', 0, 'CONFIRMADO', '2026-02-22 16:16:33'),
  (2, 6, 'Las Mentas en vivo', '2026-04-10 20:00:00', 'FECHA_BANDAS', 150, 'Rock Alternativo', 1, 'CONFIRMADO', '2026-02-22 16:16:33'),
  (3, 7, 'Fecha Reite', '2026-04-15 22:00:00', 'FECHA_BANDAS', 300, 'Rock/Tributo', 1, 'CONFIRMADO', '2026-02-22 16:16:33'),
  (4, 2, 'Fiesta de 15 años', '2026-03-22 16:00:00', 'CON_SERVICIO_DE_MESA', 60, NULL, 0, 'EN_PROGRESO', '2026-02-22 16:16:33');
/*!40000 ALTER TABLE `eventos_confirmados` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- LINEUP DE BANDAS EN EVENTOS
-- =====================================================================
LOCK TABLES `eventos_lineup` WRITE;
/*!40000 ALTER TABLE `eventos_lineup` DISABLE KEYS */;
INSERT INTO `eventos_lineup` 
  (`id`, `id_evento`, `id_banda`, `orden_presentacion`, `duracion_minutos`, `hora_inicio_estimada`) 
VALUES 
  -- Evento 1: Reite + Pateando Bares (evento_id=1)
  (1, 1, 1, 1, 60, '21:00:00'),
  (2, 1, 2, 2, 60, '22:15:00'),
  
  -- Evento 2: Las Mentas (evento_id=2)
  (3, 2, 3, 1, 120, '20:00:00'),
  
  -- Evento 3: Reite (evento_id=3)
  (4, 3, 1, 1, 180, '22:00:00'),
  
  -- Evento 4: Fiesta de 15 (evento_id=4)
  (5, 4, 1, 1, 120, '19:00:00'),
  (6, 4, 2, 2, 120, '20:45:00'),
  (7, 4, 3, 3, 90, '22:15:00');
/*!40000 ALTER TABLE `eventos_lineup` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- BANDAS INVITADAS A EVENTOS (TABLA RELACIONAL)
-- =====================================================================
LOCK TABLES `eventos_bandas_invitadas` WRITE;
/*!40000 ALTER TABLE `eventos_bandas_invitadas` DISABLE KEYS */;
-- (Esta tabla está lisata para relaciones many-to-many adicionales si es necesario)
/*!40000 ALTER TABLE `eventos_bandas_invitadas` ENABLE KEYS */;
UNLOCK TABLES;

-- =====================================================================
-- PERSONAL ASIGNADO A EVENTOS
-- =====================================================================
LOCK TABLES `eventos_personal` WRITE;
/*!40000 ALTER TABLE `eventos_personal` DISABLE KEYS */;
-- (Esta tabla está lista para asignaciones de personal a eventos confirmados)
/*!40000 ALTER TABLE `eventos_personal` ENABLE KEYS */;
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET @OLD_SQL_NOTES=@OLD_SQL_NOTES */;
