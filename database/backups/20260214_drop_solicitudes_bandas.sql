-- ARCHIVED: Tabla ya no existe en schema actual (consolidado en 01_schema.sql)
-- Migration: Drop legacy table `solicitudes_bandas`
-- Date: 2026-02-14
-- NOTE: The data was backed up to `database/backups/solicitudes_bandas_backup_20260214.sql` before dropping.

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop legacy table (idempotent)
DROP TABLE IF EXISTS solicitudes_bandas;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- End Migration
