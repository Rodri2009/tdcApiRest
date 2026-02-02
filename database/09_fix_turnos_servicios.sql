-- 09_fix_turnos_servicios.sql
-- Añade las columnas esperadas por la API a la tabla turnos_servicios
USE tdc_db;

ALTER TABLE turnos_servicios
    ADD COLUMN servicio_id INT DEFAULT NULL AFTER profesional_id,
    ADD COLUMN precio_id INT DEFAULT NULL AFTER servicio_id,
    ADD COLUMN cliente_nombre VARCHAR(255) DEFAULT NULL AFTER hora_fin,
    ADD COLUMN cliente_telefono VARCHAR(50) DEFAULT NULL AFTER cliente_nombre,
    ADD COLUMN cliente_email VARCHAR(255) DEFAULT NULL AFTER cliente_telefono,
    ADD COLUMN monto DECIMAL(10,2) DEFAULT NULL AFTER cliente_email,
    ADD COLUMN pagado TINYINT(1) DEFAULT 0 AFTER monto,
    ADD COLUMN metodo_pago VARCHAR(50) DEFAULT NULL AFTER pagado,
    ADD COLUMN notas TEXT DEFAULT NULL AFTER metodo_pago;

-- Intentar agregar FK si las tablas existen
ALTER TABLE turnos_servicios
    ADD CONSTRAINT fk_turnos_servicios_servicio FOREIGN KEY (servicio_id) REFERENCES servicios_catalogo(id) ON DELETE SET NULL;

ALTER TABLE turnos_servicios
    ADD CONSTRAINT fk_turnos_servicios_precio FOREIGN KEY (precio_id) REFERENCES precios_servicios(id) ON DELETE SET NULL;

-- Insert ejemplo de turno para el profesional demo y servicio creado
INSERT INTO turnos_servicios (profesional_id, servicio_id, precio_id, fecha, hora_inicio, hora_fin, cliente_nombre, monto, pagado, estado)
SELECT p.id, sc.id, ps.id, CURDATE(), '10:00:00', '11:00:00', 'Cliente Demo', ps.precio, 0, 'pendiente'
FROM profesionales_servicios p
CROSS JOIN servicios_catalogo sc
LEFT JOIN precios_servicios ps ON ps.servicio_id = sc.id
WHERE p.nombre = 'Profesional Demo'
LIMIT 1;
