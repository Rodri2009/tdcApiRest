-- Migration: Create `clientes` table, migrate client data from solicitudes and child tables,
-- add `cliente_id` FK to solicitudes and drop redundant contact columns.

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Create table `clientes`
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) DEFAULT NULL,
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    notas TEXT DEFAULT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2) Add cliente_id to solicitudes if not exists
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS cliente_id INT NULL;

-- 3) Seed `clientes` from solicitudes where email exists (preferred dedup key)
SELECT COUNT(*) INTO @has_email_col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'email_solicitante';
SET @sql = IF(@has_email_col > 0,
    'INSERT IGNORE INTO clientes (nombre, telefono, email, creado_en) SELECT NULLIF(nombre_solicitante, "") as nombre, NULLIF(telefono_solicitante, "") as telefono, NULLIF(email_solicitante, "") as email, NOW() FROM solicitudes WHERE email_solicitante IS NOT NULL AND email_solicitante <> ""',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Seed clients from child tables where child email exists
SELECT COUNT(*) INTO @has_col_alq FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_alquiler' AND COLUMN_NAME = 'nombre_completo';
SELECT COUNT(*) INTO @has_col_bnd FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_bandas' AND COLUMN_NAME = 'nombre_completo';
SET @sql = IF((@has_col_alq + @has_col_bnd) > 0,
    'INSERT IGNORE INTO clientes (nombre, telefono, email, creado_en) SELECT NULLIF(nombre, "") as nombre, NULLIF(telefono, "") as telefono, NULLIF(email, "") as email, NOW() FROM (SELECT nombre_completo as nombre, telefono, email FROM solicitudes_alquiler UNION ALL SELECT nombre_completo as nombre, telefono, email FROM solicitudes_bandas) t WHERE t.email IS NOT NULL AND t.email <> ""',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) Map solicitudes to clients by email (guardado si existe la columna antigua)
SELECT COUNT(*) INTO @has_email_col2 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'email_solicitante';
SET @sql = IF(@has_email_col2 > 0,
    'UPDATE solicitudes s JOIN clientes c ON s.email_solicitante IS NOT NULL AND s.email_solicitante <> "" AND s.email_solicitante = c.email SET s.cliente_id = c.id WHERE s.cliente_id IS NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) Map by phone if still NULL
SELECT COUNT(*) INTO @has_phone_col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'telefono_solicitante';
SET @sql = IF(@has_phone_col > 0,
    'UPDATE solicitudes s JOIN clientes c ON s.telefono_solicitante IS NOT NULL AND s.telefono_solicitante <> "" AND s.telefono_solicitante = c.telefono SET s.cliente_id = c.id WHERE s.cliente_id IS NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7) For remaining solicitudes without cliente_id, create a client and map it (if old columns exist)
SELECT COUNT(*) INTO @has_name_col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'nombre_solicitante';
SET @sql = IF(@has_name_col > 0,
    'INSERT INTO clientes (nombre, telefono, email, creado_en) SELECT COALESCE(NULLIF(nombre_solicitante, ""), "Cliente sin nombre"), NULLIF(telefono_solicitante, ""), NULLIF(email_solicitante, ""), NOW() FROM solicitudes s WHERE s.cliente_id IS NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Now map again by matching email or phone or name (only run if old columns exist)
SET @sql = IF((@has_email_col2 + @has_phone_col + @has_name_col) > 0,
    'UPDATE solicitudes s LEFT JOIN clientes c ON ((s.email_solicitante IS NOT NULL AND s.email_solicitante <> "" AND s.email_solicitante = c.email) OR (s.telefono_solicitante IS NOT NULL AND s.telefono_solicitante <> "" AND s.telefono_solicitante = c.telefono) OR (s.nombre_solicitante IS NOT NULL AND s.nombre_solicitante <> "" AND s.nombre_solicitante = c.nombre)) SET s.cliente_id = c.id WHERE s.cliente_id IS NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8) Add foreign key constraint
ALTER TABLE solicitudes DROP FOREIGN KEY IF EXISTS fk_solicitudes_cliente;
ALTER TABLE solicitudes ADD CONSTRAINT fk_solicitudes_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

-- 9) Remove redundant columns from `solicitudes` and child tables
ALTER TABLE solicitudes DROP COLUMN IF EXISTS nombre_solicitante;
ALTER TABLE solicitudes DROP COLUMN IF EXISTS telefono_solicitante;
ALTER TABLE solicitudes DROP COLUMN IF EXISTS email_solicitante;

-- Child tables: remove contact columns from alquiler and bandas (if they exist)
ALTER TABLE solicitudes_alquiler DROP COLUMN IF EXISTS nombre_completo;
ALTER TABLE solicitudes_alquiler DROP COLUMN IF EXISTS telefono;
ALTER TABLE solicitudes_alquiler DROP COLUMN IF EXISTS email;

ALTER TABLE solicitudes_bandas DROP COLUMN IF EXISTS nombre_completo;
ALTER TABLE solicitudes_bandas DROP COLUMN IF EXISTS telefono;
ALTER TABLE solicitudes_bandas DROP COLUMN IF EXISTS email;

-- Note: services/talleres used parent contact fields; already handled by parent.

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- End Migration
