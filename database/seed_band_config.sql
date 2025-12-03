-- Seed: configuración mínima para FECHA_BANDAS (horarios, duraciones, tarifas)
-- Ejecutar dentro de la base de datos: mysql -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE" < database/seed_band_config.sql

-- 1) Horarios (configuracion_horarios)
INSERT INTO configuracion_horarios (id_de_evento, hora_de_inicio, tipo_de_dia)
SELECT 'FECHA_BANDAS', '18:00', 'Todos' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM configuracion_horarios c WHERE c.id_de_evento='FECHA_BANDAS' AND c.hora_de_inicio='18:00' AND c.tipo_de_dia='Todos' LIMIT 1);

INSERT INTO configuracion_horarios (id_de_evento, hora_de_inicio, tipo_de_dia)
SELECT 'FECHA_BANDAS', '21:00', 'Sabado' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM configuracion_horarios c WHERE c.id_de_evento='FECHA_BANDAS' AND c.hora_de_inicio='21:00' AND c.tipo_de_dia='Sabado' LIMIT 1);

-- 2) Duraciones (opciones_duracion)
INSERT INTO opciones_duracion (id_evento, header, duracion)
SELECT 'FECHA_BANDAS', 'Opcion A', '4 horas' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM opciones_duracion o WHERE o.id_evento='FECHA_BANDAS' AND o.duracion='4 horas' LIMIT 1);

INSERT INTO opciones_duracion (id_evento, header, duracion)
SELECT 'FECHA_BANDAS', 'Opcion B', '5 horas' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM opciones_duracion o WHERE o.id_evento='FECHA_BANDAS' AND o.duracion='5 horas' LIMIT 1);

INSERT INTO opciones_duracion (id_evento, header, duracion)
SELECT 'FECHA_BANDAS', 'Opcion C', '6 horas' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM opciones_duracion o WHERE o.id_evento='FECHA_BANDAS' AND o.duracion='6 horas' LIMIT 1);

-- 3) Tarifas (precios_vigencia)
INSERT INTO precios_vigencia (tipo_de_evento, cantidad_minima, cantidad_maxima, fecha_de_vigencia, precio_por_hora)
SELECT 'FECHA_BANDAS', 1, 120, '2025-12-01', 130000 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM precios_vigencia p WHERE p.tipo_de_evento='FECHA_BANDAS' AND p.fecha_de_vigencia='2025-12-01' LIMIT 1);

SELECT 'seed_band_config_ok' AS status;
