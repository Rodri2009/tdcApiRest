-- Migration: Normalize solicitues structure
-- 1) add es_publico to solicitudes (parent)
-- 2) rename child PKs to id_solicitud, preserve values and FKs
-- 3) drop es_publico from child tables
-- 4) set default es_publico for alquileres to 0

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Add es_publico to parent if not exists
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS es_publico TINYINT(1) DEFAULT 0;

-- 2) For solicitudes_alquiler: rename id -> id_solicitud
-- Add new column if not exists, copy values, set PK, drop old
ALTER TABLE solicitudes_alquiler ADD COLUMN IF NOT EXISTS id_solicitud INT;
UPDATE solicitudes_alquiler SET id_solicitud = id WHERE id_solicitud IS NULL AND id IS NOT NULL;
ALTER TABLE solicitudes_alquiler DROP PRIMARY KEY;
ALTER TABLE solicitudes_alquiler DROP COLUMN id;
ALTER TABLE solicitudes_alquiler CHANGE COLUMN id_solicitud id_solicitud INT NOT NULL;
ALTER TABLE solicitudes_alquiler ADD PRIMARY KEY (id_solicitud);
ALTER TABLE solicitudes_alquiler DROP FOREIGN KEY IF EXISTS fk_solicitudes_alquiler_padre;
ALTER TABLE solicitudes_alquiler ADD CONSTRAINT fk_solicitudes_alquiler_padre FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE;

-- 2b) For solicitudes_servicios
ALTER TABLE solicitudes_servicios ADD COLUMN IF NOT EXISTS id_solicitud INT;
UPDATE solicitudes_servicios SET id_solicitud = id WHERE id_solicitud IS NULL AND id IS NOT NULL;
ALTER TABLE solicitudes_servicios DROP PRIMARY KEY;
ALTER TABLE solicitudes_servicios DROP COLUMN id;
ALTER TABLE solicitudes_servicios CHANGE COLUMN id_solicitud id_solicitud INT NOT NULL;
ALTER TABLE solicitudes_servicios ADD PRIMARY KEY (id_solicitud);
ALTER TABLE solicitudes_servicios DROP FOREIGN KEY IF EXISTS fk_solicitudes_servicios_padre;
ALTER TABLE solicitudes_servicios ADD CONSTRAINT fk_solicitudes_servicios_padre FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE;

-- 2c) For solicitudes_talleres
ALTER TABLE solicitudes_talleres ADD COLUMN IF NOT EXISTS id_solicitud INT;
UPDATE solicitudes_talleres SET id_solicitud = id WHERE id_solicitud IS NULL AND id IS NOT NULL;
ALTER TABLE solicitudes_talleres DROP PRIMARY KEY;
ALTER TABLE solicitudes_talleres DROP COLUMN id;
ALTER TABLE solicitudes_talleres CHANGE COLUMN id_solicitud id_solicitud INT NOT NULL;
ALTER TABLE solicitudes_talleres ADD PRIMARY KEY (id_solicitud);
ALTER TABLE solicitudes_talleres DROP FOREIGN KEY IF EXISTS fk_solicitudes_talleres_padre;
ALTER TABLE solicitudes_talleres ADD CONSTRAINT fk_solicitudes_talleres_padre FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE;

-- 3) Remove es_publico from child tables if exists
ALTER TABLE solicitudes_alquiler DROP COLUMN IF EXISTS es_publico;
ALTER TABLE solicitudes_bandas DROP COLUMN IF EXISTS es_publico;
ALTER TABLE solicitudes_servicios DROP COLUMN IF EXISTS es_publico;
ALTER TABLE solicitudes_talleres DROP COLUMN IF EXISTS es_publico;

-- 4) Ensure alquileres default not public at parent level
UPDATE solicitudes s
JOIN solicitudes_alquiler sa ON sa.id_solicitud = s.id
SET s.es_publico = 0
WHERE s.categoria = 'ALQUILER';

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- End Migration
