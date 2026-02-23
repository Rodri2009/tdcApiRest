-- Migración: Normalizar columna de bandas_artistas de 'id' a 'id_banda' para consistency

-- PASO 1: Obtener nombres de las foreign keys actuales
-- MariaDB suele generar automáticamente nombres como fk_tabla_columnoriginal

-- PASO 2: Eliminar foreign keys que referencian a bandas_artistas.id
ALTER TABLE eventos_lineup DROP FOREIGN KEY eventos_lineup_ibfk_2;
ALTER TABLE solicitudes_fechas_bandas DROP FOREIGN KEY solicitudes_fechas_bandas_ibfk_1;

-- PASO 3: Renombrar columna id → id_banda en bandas_artistas
ALTER TABLE bandas_artistas CHANGE COLUMN id id_banda INT(11) NOT NULL AUTO_INCREMENT UNIQUE;

-- PASO 4: Recrear foreign keys con la nueva estructura
ALTER TABLE eventos_lineup ADD CONSTRAINT eventos_lineup_ibfk_2 
  FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id_banda) ON DELETE SET NULL;

ALTER TABLE solicitudes_fechas_bandas ADD CONSTRAINT solicitudes_fechas_bandas_ibfk_1 
  FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id_banda) ON DELETE SET NULL;

-- PASO 5: Verificar cambios
-- Mostrar estructura de bandas_artistas
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'bandas_artistas' AND TABLE_SCHEMA = 'tdc_db'
ORDER BY ORDINAL_POSITION;
