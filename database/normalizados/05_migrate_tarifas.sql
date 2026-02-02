-- Migración: Cambiar personal_tarifas para usar nombre_rol en lugar de id_personal
-- Fecha: 2025-12-23
-- NOTA: NORMALIZADO
-- Las acciones de migración y los INSERTs de ejemplo se consolidaron en:
--   - Estructura: database/01_schema.sql (la tabla `personal_tarifas` ya incluye `nombre_rol`)
--   - Datos de prueba: database/03_test_data.sql
-- Puedes eliminar este archivo si no necesitas conservar el histórico de migración local.

-- Agregar la nueva columna
ALTER TABLE personal_tarifas ADD COLUMN nombre_rol VARCHAR(100) NOT NULL AFTER id;

-- Migrar datos: asignar nombre_rol basado en id_rol si existe
UPDATE personal_tarifas t
LEFT JOIN catalogo_roles r ON t.id_rol = r.id
SET t.nombre_rol = COALESCE(r.nombre, 'Sin Rol')
WHERE t.id_rol IS NOT NULL;

-- Para registros sin id_rol, asignar un valor por defecto
UPDATE personal_tarifas SET nombre_rol = 'Sin Rol' WHERE nombre_rol = '';

-- Hacer nombre_rol NOT NULL (ya lo es)
-- Opcional: eliminar columnas viejas si no se usan
-- ALTER TABLE personal_tarifas DROP COLUMN id_personal;
-- ALTER TABLE personal_tarifas DROP COLUMN id_rol;

-- Insertar datos de ejemplo con la nueva estructura
INSERT INTO personal_tarifas (nombre_rol, monto_por_hora, monto_fijo_evento, monto_minimo, vigente_desde, descripcion) VALUES
('DJ', 2500.00, 15000.00, 10000.00, '2025-01-01', 'DJ - Tarifa estándar'),
('Mesera', 1800.00, 8000.00, 6000.00, '2025-01-01', 'Mesera - Tarifa estándar'),
('Bartender', 2200.00, 12000.00, 8000.00, '2025-01-01', 'Bartender - Tarifa estándar')
ON DUPLICATE KEY UPDATE
    monto_por_hora = VALUES(monto_por_hora),
    monto_fijo_evento = VALUES(monto_fijo_evento),
    monto_minimo = VALUES(monto_minimo),
    descripcion = VALUES(descripcion);