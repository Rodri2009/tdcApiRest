-- Migración 17: Corregir categorías en opciones_tipos
-- Problema: Algunos tipos estaban mal categorizados por búsqueda de palabras clave
-- Solución: Asignar categorías correctas basadas en el tipo de evento

-- Cambiar CON_SERVICIO_DE_MESA de BANDA a SERVICIO
-- (Es un servicio completo, aunque tiene backline para bandas, no es exclusivamente para bandas)
UPDATE opciones_tipos
SET categoria = 'SERVICIO'
WHERE id_evento = 'CON_SERVICIO_DE_MESA';

-- Cambiar INFANTILES, ADOLESCENTES, BABY_SHOWERS a OTRO
-- (Son tipos especiales de alquiler, no encajan en categorías principales)
UPDATE opciones_tipos
SET categoria = 'OTRO'
WHERE id_evento IN ('INFANTILES', 'ADOLESCENTES', 'BABY_SHOWERS');

-- Cambiar INFORMALES a ALQUILER
-- (Es un alquiler de salón, solo que más económico y sin servicios de mesa)
UPDATE opciones_tipos
SET categoria = 'ALQUILER'
WHERE id_evento = 'INFORMALES';

-- Cambiar DEPILACION_DEFINITIVA a SERVICIO
-- (Es un servicio, no alquiler de salón)
UPDATE opciones_tipos
SET categoria = 'SERVICIO'
WHERE id_evento = 'DEPILACION_DEFINITIVA';

-- SIN_SERVICIO_DE_MESA ya debe estar como ALQUILER (de migración anterior)
-- Verificación:
SELECT 'Categorías actualizadas' AS status, id_evento, categoria FROM opciones_tipos;
