-- 07_create_servicios_tables.sql
-- Crea tablas necesarias para el módulo de servicios: servicios_catalogo y precios_servicios
-- Ejecutar en la base de datos de desarrollo/producción con respaldo previo.

USE tdc_db;

CREATE TABLE IF NOT EXISTS servicios_catalogo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_servicio_id VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    duracion_minutos INT DEFAULT 60,
    activo TINYINT(1) DEFAULT 1,
    orden INT DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tipo_servicio (tipo_servicio_id),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS precios_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    servicio_id INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE DEFAULT NULL,
    vigente TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_servicio (servicio_id),
    FOREIGN KEY (servicio_id) REFERENCES servicios_catalogo(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert ejemplo (opcional)
INSERT INTO servicios_catalogo (tipo_servicio_id, nombre, descripcion, duracion_minutos, activo, orden)
VALUES
('DEPILACION','Depilación completa','Depilación con cera o láser según disponibilidad',60,1,1),
('MASAJE','Masaje relajante','Sesión de 60 minutos de masaje relajante',60,1,2);

INSERT INTO precios_servicios (servicio_id, precio, vigente_desde, vigente)
SELECT id, 1200.00, CURDATE(), 1 FROM servicios_catalogo WHERE nombre = 'Depilación completa';

INSERT INTO precios_servicios (servicio_id, precio, vigente_desde, vigente)
SELECT id, 2500.00, CURDATE(), 1 FROM servicios_catalogo WHERE nombre = 'Masaje relajante';
