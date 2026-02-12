-- ARCHIVED: retained for historical reference (consolidated) on 2026-02-12
-- Migration: Archive and drop `fechas_bandas_confirmadas_deprecated`
-- Fecha: 2026-02-05
-- Objetivo: Si existe `fechas_bandas_confirmadas_deprecated`, quitar FKs que la referencian
-- y renombrarla a `fechas_bandas_confirmadas_backup_20260205` (operación atómica mediante RENAME).

-- Nota: Este script es idempotente: si la tabla no existe, no hace nada.

DELIMITER $$

CREATE PROCEDURE archive_fechas_deprecated()
BEGIN
  DECLARE exists_tbl INT DEFAULT 0;
  SELECT COUNT(*) INTO exists_tbl
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fechas_bandas_confirmadas_deprecated';

  IF exists_tbl = 1 THEN

    -- 1) Construir y ejecutar ALTER TABLE ... DROP FOREIGN KEY ... para cualquier FK que referencie la tabla
    SELECT GROUP_CONCAT(CONCAT('ALTER TABLE `', TABLE_NAME, '` DROP FOREIGN KEY `', CONSTRAINT_NAME, '`;') SEPARATOR ' ')
      INTO @fk_sql
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME = 'fechas_bandas_confirmadas_deprecated' AND CONSTRAINT_SCHEMA = DATABASE();

    IF @fk_sql IS NOT NULL AND CHAR_LENGTH(@fk_sql) > 0 THEN
      PREPARE drop_fks FROM @fk_sql;
      EXECUTE drop_fks;
      DEALLOCATE PREPARE drop_fks;
    END IF;

    -- 2) Rename table atomically a nombre de backup (evita copia y asegura que no se pierden datos)
    SET @archive_name = 'fechas_bandas_confirmadas_backup_20260205';

    -- Asegurarnos de que no exista ya un backup con ese nombre
    IF (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @archive_name) = 1 THEN
      -- Si existe, añadimos sufijo con timestamp para evitar colisiones
      SET @archive_name = CONCAT('fechas_bandas_confirmadas_backup_20260205_', UNIX_TIMESTAMP());
    END IF;

    SET @rename_sql = CONCAT('RENAME TABLE `fechas_bandas_confirmadas_deprecated` TO `', @archive_name, '`;');
    PREPARE rstmt FROM @rename_sql;
    EXECUTE rstmt;
    DEALLOCATE PREPARE rstmt;

  END IF;
END$$

CALL archive_fechas_deprecated()$$
DROP PROCEDURE archive_fechas_deprecated$$

DELIMITER ;

-- End migration
