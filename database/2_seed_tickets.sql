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
INSERT INTO eventos (nombre_banda, fecha_hora, precio_base, aforo_maximo, descripcion, activo) VALUES
('LA RISA DE CROMO', '2025-12-05 21:00:00', 5000.00, 150, 'Noche de rock alternativo con teloneros invitados. Apertura 21h.', TRUE),
('Noche de Jazz Fusión', '2025-12-12 20:30:00', 3500.00, 80, 'Show acústico íntimo del Ensamble Claypole Jazz.', TRUE),
('Feria de Diseño y DJ Set', '2025-12-20 18:00:00', 0.00, 200, 'Evento gratuito con reserva. Entrada libre y musicalización a cargo de DJ Clay.', TRUE);

-- 2. CUPONES DE PRUEBA
INSERT INTO cupones (codigo, tipo_descuento, valor_fijo, porcentaje_descuento, usos_maximos, usos_actuales, fecha_expiracion, activo) VALUES
('ROCK20', 'PORCENTAJE', NULL, 20.00, 50, 0, '2025-12-31', TRUE), -- 20% de descuento, 50 usos max
('A-TODO-O-NADA', 'MONTO_FIJO', 1000.00, NULL, NULL, 0, NULL, TRUE), -- $1000 de descuento fijo, usos ilimitados
('EXPIRADO', 'PORCENTAJE', NULL, 50.00, 10, 0, '2024-01-01', TRUE), -- Expirado
('AGOTADO', 'PORCENTAJE', NULL, 15.00, 2, 2, NULL, TRUE); -- Usos máximos alcanzados