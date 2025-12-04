-- =========================================================
-- DATOS DE PRUEBA (SEED) PARA EL SISTEMA DE TICKETS
-- Se insertan 3 eventos y 3 cupones
-- =========================================================

-- Limpiamos las tablas por si ya tienen datos (en un entorno de desarrollo)
DELETE FROM tickets;
DELETE FROM cupones;
DELETE FROM eventos;
ALTER TABLE eventos AUTO_INCREMENT = 1;
ALTER TABLE cupones AUTO_INCREMENT = 1;

-- 1. EVENTOS DE PRUEBA
-- Insertando eventos con precio anticipada y precio en puerta para pruebas
INSERT INTO eventos (nombre_banda, fecha_hora, precio_base, precio_anticipada, precio_puerta, aforo_maximo, descripcion, activo) VALUES
('Reite / Pateando Bares / las mentas', '2025-12-06 21:00:00', 4000.00, 3000.00, 4000.00, 150, 'Noche de rock tributo a La Renga, dos bandas invitadas, Apertura 21h.', TRUE),
('HipHop alternative', '2026-02-07 21:00:00', 3500.00, 3000.00, 3800.00, 80, 'Show acústico íntimo del Ensamble Claypole Jazz.', TRUE),
('Feria de Diseño y DJ Set', '2025-12-20 18:00:00', 0.00, 0.00, 0.00, 200, 'Evento gratuito con reserva. Entrada libre y musicalización a cargo de DJ Clay.', TRUE);

-- 2. CUPONES DE PRUEBA
INSERT INTO cupones (codigo, tipo_descuento, valor_fijo, porcentaje_descuento, usos_maximos, usos_actuales, fecha_expiracion, activo, aplica_a) VALUES
('ROCK20', 'PORCENTAJE', NULL, 20.00, 50, 0, '2025-12-31', TRUE, 'TODAS'), -- 20% de descuento, 50 usos max
('A-TODO-O-NADA', 'MONTO_FIJO', 1000.00, NULL, NULL, 0, NULL, TRUE, 'ANTICIPADA'), -- $1000 de descuento fijo, aplica sólo a anticipada
('ENPUERTA25', 'PORCENTAJE', NULL, 25.00, 100, 0, '2025-12-31', TRUE, 'PUERTA'), -- 25% sólo en puerta
('EXPIRADO', 'PORCENTAJE', NULL, 50.00, 10, 0, '2024-01-01', TRUE, 'TODAS'); -- Expirado