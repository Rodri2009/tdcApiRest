-- Seed de prueba: crear una solicitud de banda de ejemplo y su registro en bandas_solicitudes
-- Ejecutar dentro de la base de datos: mysql -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE" < database/seed_test_banda.sql

-- 1) Insertar solicitud de prueba solo si no existe (identificada por email+fecha)
INSERT INTO solicitudes (fecha_hora, tipo_de_evento, cantidad_de_personas, duracion, fecha_evento, hora_evento, precio_basico, precio_final, nombre_completo, telefono, email, descripcion, estado, fingerprintid)
SELECT NOW(), 'FECHA_BANDAS', '50', '5 horas', '2025-12-15', '21:00', 120000, 120000, 'Solicitud Test Banda', '000000000', 'testband@example.test', 'Propuesta de prueba para validación', 'CREADA', 'seed-test'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM solicitudes s WHERE s.email = 'testband@example.test' AND s.fecha_evento = '2025-12-15' LIMIT 1
);

-- 2) Asegurarse de que exista el id insertado / seleccionado
-- Obtener el id de la solicitud creada o existente
SET @test_solicitud_id = (SELECT id_solicitud FROM solicitudes WHERE email = 'testband@example.test' AND fecha_evento = '2025-12-15' LIMIT 1);

-- 3) Insertar fila en bandas_solicitudes solo si no existe
INSERT INTO bandas_solicitudes (id_solicitud, nombre_banda, contacto_email, link_musica, propuesta, event_id)
SELECT @test_solicitud_id, 'La Prueba S', 'banda@ejemplo.test', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Esta es una propuesta de prueba creada por seed_test_banda.sql', NULL
FROM DUAL
WHERE @test_solicitud_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM bandas_solicitudes b WHERE b.id_solicitud = @test_solicitud_id LIMIT 1);

-- 4) Mensaje informativo
SELECT 'seed_test_banda_ok' AS status, @test_solicitud_id as inserted_solicitud_id;
