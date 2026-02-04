-- Script para probar la creación manual de la tabla turnos_servicios

USE tdc_db;

CREATE TABLE turnos_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profesional_id INT NOT NULL,
    servicio_id INT NOT NULL,
    precio_id INT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cliente_nombre VARCHAR(255),
    cliente_telefono VARCHAR(20),
    cliente_email VARCHAR(255),
    monto DECIMAL(10,2),
    pagado TINYINT(1) DEFAULT 0,
    metodo_pago VARCHAR(50),
    estado VARCHAR(50),
    notas TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (profesional_id) REFERENCES profesionales_servicios(id),
    FOREIGN KEY (servicio_id) REFERENCES servicios_catalogo(id),
    FOREIGN KEY (precio_id) REFERENCES precios_servicios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;