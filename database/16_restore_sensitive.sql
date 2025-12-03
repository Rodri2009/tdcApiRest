-- Restaurar datos sensibles si existe backup
-- Este archivo se ejecuta AL FINAL después de todas las migraciones
--
-- NOTA: Los datos de solicitudes ya fueron restaurados en 14_restore_solicitudes_test_data.sql
-- Este archivo está vacío para evitar duplicados

USE tdc_db;

SELECT '✅ Migration 15 completada (sin datos adicionales).' AS status;
