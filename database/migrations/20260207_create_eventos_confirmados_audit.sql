-- ARCHIVED: consolidated into database/01_schema.sql on 2026-02-12
-- Migration: Create audit table for eventos_confirmados

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS eventos_confirmados_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT DEFAULT NULL COMMENT 'ID original en eventos_confirmados',
    id_solicitud INT NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    tabla_origen VARCHAR(50) DEFAULT NULL,
    original_row JSON DEFAULT NULL,
    deleted_by INT DEFAULT NULL COMMENT 'User ID who triggered the delete',
    reason VARCHAR(255) DEFAULT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_id_solicitud (id_solicitud),
    INDEX idx_tipo_evento (tipo_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- End Migration
