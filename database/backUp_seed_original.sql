-- -----------------------------------------------------------------------------
-- Archivo de Semillado de Datos (Seed) - Versión Normalizada y Corregida
-- -----------------------------------------------------------------------------

USE tdc_db;
SET GLOBAL local_infile = 1;

-- 1. Cargar datos de Configuracion.csv
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Configuracion.csv'
INTO TABLE `configuracion`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
-- Carga las columnas del CSV en variables
(@clave, @valor)
-- Mapea las variables a las columnas de la tabla
SET `clave` = @clave, `valor` = @valor;

-- 2. Cargar datos de Opciones_Adicionales.csv
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Opciones_Adicionales.csv'
INTO TABLE `opciones_adicionales`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
(@nombre, @precio, @descripcion, @url)
SET `nombre` = @nombre, `precio` = @precio, `descripcion` = @descripcion, `url_imagen` = @url;

-- 3. Cargar datos de opciones_duracion.csv
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/opciones_duracion.csv'
INTO TABLE `opciones_duracion`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
(@id_evento, @header, @duracion)
SET `id_evento` = @id_evento, `header` = @header, `duracion` = @duracion;

-- 4. Cargar datos de Configuracion_Horarios.csv
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Configuracion_Horarios.csv'
INTO TABLE `configuracion_horarios`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
(@id_de_evento, @hora_de_inicio, @tipo_de_dia)
SET `id_de_evento` = @id_de_evento, `hora_de_inicio` = @hora_de_inicio, `tipo_de_dia` = @tipo_de_dia;

-- 5. Cargar datos de Opciones_Tipos.csv (CON TRANSFORMACIÓN)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Opciones_Tipos.csv'
INTO TABLE `opciones_tipos`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
(@id_evento, @nombre_para_mostrar, @descripcion, @monto_sena, @deposito, @es_publico_var)
SET 
    `id_evento` = @id_evento,
    `nombre_para_mostrar` = @nombre_para_mostrar,
    `descripcion` = @descripcion,
    `monto_sena` = @monto_sena,
    `deposito` = @deposito,
    `es_publico` = IF(UPPER(TRIM(@es_publico_var)) = 'TRUE', 1, 0);

-- 6. Cargar datos de Personal_Disponible.csv (CON TRANSFORMACIÓN)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Personal_Disponible.csv'
INTO TABLE `personal_disponible`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
(@id_personal, @nombre_completo, @rol, @celular, @activo_var, @cvu_alias)
SET 
    `id_personal` = @id_personal,
    `nombre_completo` = @nombre_completo,
    `rol` = @rol,
    `celular` = @celular,
    `activo` = IF(UPPER(TRIM(@activo_var)) = 'TRUE', 1, 0),
    `cvu_alias` = @cvu_alias;

-- 7. Cargar datos de Roles_Por_Evento.csv
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Roles_Por_Evento.csv'
INTO TABLE `roles_por_evento`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
(@id_evento, @rol_requerido, @cantidad, @min_personas, @max_personas)
SET `id_evento` = @id_evento, `rol_requerido` = @rol_requerido, `cantidad` = @cantidad, `min_personas` = @min_personas, `max_personas` = @max_personas;

-- 8. Cargar datos de Costos_Personal_Vigencia.csv
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Costos_Personal_Vigencia.csv'
INTO TABLE `costos_personal_vigencia`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
(@id_costo, @rol, @fecha_de_vigencia, @costo_por_hora, @viaticos)
SET `id_costo` = @id_costo, `rol` = @rol, `fecha_de_vigencia` = @fecha_de_vigencia, `costo_por_hora` = @costo_por_hora, `viaticos` = @viaticos;

-- 9. Cargar datos de Precios_Vigencia.csv
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Precios_Vigencia.csv'
INTO TABLE `precios_vigencia`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
(@tipo_de_evento, @cantidad_minima, @cantidad_maxima, @fecha_de_vigencia, @precio_por_hora)
SET `tipo_de_evento` = @tipo_de_evento, `cantidad_minima` = @cantidad_minima, `cantidad_maxima` = @cantidad_maxima, `fecha_de_vigencia` = @fecha_de_vigencia, `precio_por_hora` = @precio_por_hora;


SELECT 'Datos semilla (normalizados) cargados exitosamente.' AS status;