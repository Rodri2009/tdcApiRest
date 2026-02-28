-- ============================================
-- USUARIOS (con soporte OAuth)
-- ============================================
INSERT INTO `usuarios` (
    `email`, `password_hash`, `nombre`, 
    `rol`, `activo`
) VALUES (
    'rodrigo@rodrigo.com', 
    '$2a$10$xT4ERvVKWABJlrrYPsJXWOZHTVsZtYp1uCm52pM23iHbdmAUlHlyu',
    'Rodrigo Admin',
    'admin', 1
);

INSERT INTO `usuarios` (
    `email`, `password_hash`, `nombre`, 
    `rol`, `activo`
) VALUES (
    'villalbarodrigo2009@gmail.com', 
    '$2a$10$xT4ERvVKWABJlrrYPsJXWOZHTVsZtYp1uCm52pM23iHbdmAUlHlyu',
    'Rodrigo Villalba',
    'admin', 1
);

-- ============================================
-- CLIENTES 
-- ============================================
INSERT INTO `clientes` (
    `nombre`, `apellido`, `telefono`, `email`, 
    `activo`, `creado_por_id_usuario`
) VALUES 
    ('Juan', 'Pérez', '+5491111111', 'juan@test.com', 1, 1),
    ('María', 'González', '+5491111112', 'maria@test.com', 1, 1),
    ('Pedro', 'López', '+5491111113', 'pedro@test.com', 1, 1),
    ('Ana', 'Rodríguez', '+5491111114', 'ana@test.com', 1, 1),
    ('Carlos', 'Martínez', '+5491111115', 'carlos@test.com', 1, 1);

-- ============================================
-- BANDAS/ARTISTAS
-- ============================================
INSERT INTO `bandas_artistas` (
    `nombre`, `genero_musical`, `bio`, `instagram`, `facebook`, 
    `twitter`, `tiktok`, `web_oficial`, `youtube`, `spotify`, `otras_redes`,
    `logo_url`, `foto_prensa_url`, `contacto_nombre`, `contacto_email`, 
    `contacto_telefono`, `contacto_rol`, `verificada`, `activa`
) VALUES 
    ('Reite', 'Rock / Tributo', 'Tributo oficial a La Renga', '@reitebanda', 'https://www.facebook.com/reitebanda', 
     '@reitebanda', NULL, 'https://www.reitebanda.com', 'https://www.youtube.com/c/ReiteBanda', 'https://open.spotify.com/artist/reite', NULL,
     '/uploads/bandas/logo_reite.jpg', NULL, 'Juan Reite', 'reite.tributo@gmail.com', 
     '1155001122', 'Manager', 1, 1),
    
    ('Pateando Bares', 'Rock Nacional', 'Rock nacional con trayectoria', '@pateando.bares', 'https://www.facebook.com/pateandobaresoficial', 
     '@pateandooficial', '@pateandooficial', 'https://www.pateandobares.com.ar', 'https://www.youtube.com/pateandobaresoficial', 'https://open.spotify.com/artist/pateandooficial', NULL,
     NULL, NULL, 'Marco Sández', 'pateando.bares@gmail.com', 
     '1155003344', 'Productor', 1, 1),
    
    ('Las Mentas', 'Rock Alternativo / Indie', 'Banda femenina de rock alternativo', '@lasmentasbanda', 'https://www.facebook.com/lasmentasbanda', 
     '@lasmentas_rock', '@lasmentasbanda', 'https://www.lasmentas.com.ar', 'https://www.youtube.com/lasmentasbanda', 'https://open.spotify.com/artist/lasmentas', NULL,
     '/uploads/bandas/logo_las_mentas.jpeg', NULL, 'Sol Rodríguez', 'lasmentas@gmail.com', 
     '1155005566', 'Vocalista/Manager', 1, 1),
    
    ('Cumbia Sudaka', 'Cumbia / Tropical', 'Banda telonera festiva', '@cumbiasudaka', 'https://www.facebook.com/cumbiasudaka', 
     '@cumbiasudaka', NULL, NULL, 'https://www.youtube.com/cumbiasudaka', 'https://open.spotify.com/artist/cumbiasudaka', NULL,
     NULL, NULL, 'Carlos Mendoza', 'cumbia.sudaka@gmail.com', 
     '1144445566', 'Líder', 1, 1);

-- ============================================
-- SOLICITUDES
-- ============================================
INSERT INTO `solicitudes` (
    `id_cliente`, `categoria`, `estado`, 
    `descripcion_corta`, `descripcion_larga`, `es_publico`
) VALUES 
    (1, 'ALQUILER', 'Solicitado', 
     'Cumpleaños infantil 50 personas', 
     'Cumpleaños infantil para una niña de 8 años. Necesitamos inflable, servicio de cocinero y setup básico.', 
     0),
    
    (2, 'ALQUILER', 'Confirmado', 
     'Fiesta de 15 años - Servicio completo', 
     'Fiesta de 15 años. Contratamos servicio completo con meseras, bartender y sonido profesional.', 
     0),
    
    (3, 'ALQUILER', 'Solicitado', 
     'Baby shower 40 personas', 
     'Baby shower temático con 40 invitados. Necesitamos inflable de princesa y decoraciones.', 
     0),
    
    (4, 'BANDAS', 'Confirmado', 
     'Reite - Fecha Propia', 
     'Tributo a La Renga solicita fecha propia. Esperan público de 250 personas.', 
     1),
    
    (5, 'BANDAS', 'Confirmado', 
     'Las Mentas Show', 
     'Banda de rock femenino solicita fecha con formato de show abierto al público general.', 
     1),
    
    (4, 'BANDAS', 'Solicitado', 
     'Pateando Bares + Banda Telonera', 
     'Rock nacional solicita fecha compartida con banda telonera. Esperan 200 personas.', 
     1),
    
    (1, 'SERVICIOS', 'Solicitado', 
     'Taller de Fotografía de Eventos', 
     'Taller teórico-práctico de fotografía profesional para eventos. 4 horas de instrucción.', 
     0),
    
    (2, 'TALLERES', 'Confirmado', 
     'Taller de Masaje Descontracturante', 
     'Sesión grupal de masaje descontracturante para empleados.', 
     1);

-- ============================================
-- DETALLES DE ALQUILER
-- ============================================
INSERT INTO `solicitudes_alquiler` (
    `id_solicitud`, `tipo_servicio`, `fecha_evento`, `hora_evento`, 
    `duracion`, `cantidad_de_personas`, `precio_basico`, `precio_final`, 
    `tipo_de_evento`, `descripcion`, `estado`
) VALUES 
    (1, 'Cumpleaños infantil', '2026-03-15', '14:00', '4 horas', '50', 55000.00, 220000.00, 'INFANTILES', 'Incluye inflable cocodrilo y cocinera', 'Solicitado'),
    (2, 'Fiesta de 15 años', '2026-03-22', '16:00', '6 horas', '60', 80000.00, 480000.00, 'CON_SERVICIO_DE_MESA', 'Servicio completo: meseras, bartender, sonido', 'Confirmado'),
    (3, 'Baby shower', '2026-03-28', '12:00', '3 horas', '40', 50000.00, 150000.00, 'BABY_SHOWERS', 'Inflable princesa y servicio básico', 'Solicitado');

-- ============================================
-- DETALLES DE FECHAS PARA BANDAS
-- ============================================
INSERT INTO `solicitudes_fechas_bandas` (
    `id_solicitud`, `id_banda`, `fecha_evento`, `hora_evento`, `duracion`,
    `descripcion`, `precio_basico`, `precio_final`, `precio_anticipada`, 
    `precio_puerta`, `cantidad_bandas`, `expectativa_publico`, 
    `bandas_json`, `estado`
) VALUES 
    (4, 1, '2026-03-30', '22:00', '3 horas',
     'Tributo a La Renga - Fecha propia del artista', 100000.00, 120000.00, 100000.00,
     120000.00, 1, '250 personas',
     '[{"id_banda":1,"nombre":"Reite","orden_show":1,"es_principal":true}]',
     'Confirmado'),
    
    (5, 3, '2026-04-10', '20:00', '2.5 horas',
     'Las Mentas en vivo - Show abierto al público', 100000.00, 120000.00, 100000.00,
     120000.00, 1, '180 personas',
     '[{"id_banda":3,"nombre":"Las Mentas","orden_show":1,"es_principal":true}]',
     'Confirmado'),
    
    (6, 2, '2026-04-18', '21:30', '4 horas',
     'Pateando Bares + banda telonera. Rock nacional en vivo.', 120000.00, 120000.00, 100000.00,
     120000.00, 2, '220 personas',
     '[{"id_banda":2,"nombre":"Pateando Bares","orden_show":1,"es_principal":true},{"id_banda":4,"nombre":"Cumbia Sudaka","orden_show":2,"es_principal":false}]',
     'Solicitado');

-- ============================================
-- DETALLES DE SERVICIOS
-- ============================================
INSERT INTO `solicitudes_servicios` (
    `id_solicitud`, `tipo_servicio`, `fecha_evento`, `hora_evento`, 
    `duracion`, `precio`
) VALUES 
    (7, 'Taller Educativo', '2026-03-15', '15:00', '4 horas', 3000.00);

-- ============================================
-- DETALLES DE TALLERES
-- ============================================
INSERT INTO `solicitudes_talleres` (
    `id_solicitud`, `nombre_taller`, `fecha_evento`, `hora_evento`, 
    `duracion`, `precio`
) VALUES 
    (8, 'Masaje Descontracturante Grupal', '2026-03-08', '10:00', '90 minutos', 2500.00);

-- ============================================
-- ADICIONALES (items opcionales para solicitudes de alquiler)
-- ============================================
INSERT INTO `solicitudes_adicionales` (
    `id_solicitud_alquiler`, `adicional_nombre`, `adicional_precio`
) VALUES 
    (2, 'Mesa extra', 5000.00),
    (2, 'Sillas extras (4)', 1200.00),
    (2, 'Servicio de fotografía', 8000.00),
    (1, 'Manteles personalizados', 30000.00);

LOCK TABLES `eventos_confirmados` WRITE;
/*!40000 ALTER TABLE `eventos_confirmados` DISABLE KEYS */;
INSERT INTO `eventos_confirmados` (`id`, `id_solicitud`, `tipo_evento`, `tabla_origen`, `nombre_evento`, `descripcion`, `url_flyer`, `fecha_evento`, `hora_inicio`, `duracion_estimada`, `id_cliente`, `es_publico`, `activo`, `genero_musical`, `cantidad_personas`, `tipo_servicio`, `nombre_taller`, `confirmado_en`, `actualizado_en`, `cancelado_en`) VALUES (1,2,'ALQUILER_SALON','solicitudes_alquiler','Fiesta de 15 años - Luz','Fiesta de quince años con servicio completo de catering, meseras y sonido profesional.',NULL,'2026-03-22','16:00:00','6 horas',2,0,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(2,4,'BANDA','solicitudes_fechas_bandas','Reite - Tributo a La Renga','Show completo del tributo a La Renga. Viernes noche. Fecha propia confirmada.',NULL,'2026-03-30','22:00:00','3 horas',1,1,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(3,5,'BANDA','solicitudes_fechas_bandas','Las Mentas en Vivo - Rock Femenino','Show abierto al público de la banda Las Mentas. Rock alternativo de buena calidad.',NULL,'2026-04-10','20:00:00','2.5 horas',5,1,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL),(4,8,'TALLER','solicitudes_talleres','Taller de Masaje Descontracturante','Sesión grupal de masaje descontracturante. Técnicas relajantes y terapéuticas.',NULL,'2026-03-08','10:00:00','90 minutos',2,1,1,NULL,NULL,NULL,NULL,'2026-02-22 14:00:00','2026-02-24 17:22:00',NULL);
/*!40000 ALTER TABLE `eventos_confirmados` ENABLE KEYS */;
UNLOCK TABLES;