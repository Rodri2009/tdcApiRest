-- Migración 5: Añadir columna `categoria` a `opciones_tipos` y clasificar filas básicas

-- Nota: ejecuta con `mysql -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE" < database/5_migration_add_categoria_opciones_tipos.sql`

ALTER TABLE opciones_tipos
  ADD COLUMN categoria VARCHAR(50) DEFAULT 'OTRO';

-- Clasificaciones automáticas simples (no destructivas)
UPDATE opciones_tipos
SET categoria = 'BANDA'
WHERE LOWER(IFNULL(nombre_para_mostrar, '')) LIKE '%banda%'
  OR LOWER(IFNULL(descripcion, '')) LIKE '%banda%';

UPDATE opciones_tipos
SET categoria = 'ALQUILER'
WHERE LOWER(IFNULL(nombre_para_mostrar, '')) LIKE '%alquil%'
  OR LOWER(IFNULL(descripcion, '')) LIKE '%alquil%';

UPDATE opciones_tipos
SET categoria = 'TALLER'
WHERE LOWER(IFNULL(descripcion, '')) LIKE '%taller%';

-- Marcar el resto como OTRO (ya por defecto)

SELECT 'migracion_5_ok' AS status;
