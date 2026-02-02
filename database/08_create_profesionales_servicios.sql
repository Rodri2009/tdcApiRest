-- 08_create_profesionales_servicios.sql
-- Crea tablas para profesionales y turnos de servicios
USE tdc_db;

CREATE TABLE IF NOT EXISTS profesionales_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255) DEFAULT NULL,
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    dias_trabaja VARCHAR(255) DEFAULT NULL,
    hora_inicio TIME DEFAULT NULL,
    hora_fin TIME DEFAULT NULL,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS turnos_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profesional_id INT NOT NULL,
    id_solicitud INT DEFAULT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME DEFAULT NULL,
    hora_fin TIME DEFAULT NULL,
    estado ENUM('pendiente','confirmado','cancelado') DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_profesional (profesional_id),
    FOREIGN KEY (profesional_id) REFERENCES profesionales_servicios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert ejemplo para evitar errores en endpoints de prueba
INSERT INTO profesionales_servicios (nombre, especialidad, telefono, email, dias_trabaja, hora_inicio, hora_fin, activo)
VALUES
('Profesional Demo','Depilación','+549112345001','pro-demo@example.local','Lunes-Viernes','09:00:00','18:00:00',1);
