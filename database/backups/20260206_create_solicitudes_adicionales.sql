-- ARCHIVED: consolidated into database/01_schema.sql on 2026-02-12
-- Migration: 2026-02-06 - Crear tabla solicitudes_adicionales
-- Crea la tabla que guarda los adicionales seleccionados por cada solicitud.

CREATE TABLE IF NOT EXISTS solicitudes_adicionales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL,
    adicional_nombre VARCHAR(255) NOT NULL,
    adicional_precio DECIMAL(10,2) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_solicitudes_adicionales_solicitud_id (id_solicitud),
    CONSTRAINT fk_solicitudes_adicionales_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
