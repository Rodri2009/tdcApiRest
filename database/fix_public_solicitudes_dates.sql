-- ==============================================================================
-- Script para corregir fechas de solicitudes públicas
-- Fecha: 2026-04-15
-- Propósito: Actualizar fechas de solicitudes públicas que estaban en el pasado
-- ==============================================================================

-- Actualizar solicitud 5: mover de 2026-04-11 (PASADA) a 2026-04-25 (FUTURA)
UPDATE solicitudes SET fecha_evento = '2026-04-25' WHERE id_solicitud = 5;
UPDATE solicitudes_fechas_bandas SET fecha_evento = '2026-04-25' WHERE id_solicitud = 5;

-- Actualizar solicitud 8 (taller): agregar fecha futura 
UPDATE solicitudes SET fecha_evento = '2026-04-22', hora_inicio = '10:00:00' WHERE id_solicitud = 8;
UPDATE solicitudes_talleres SET fecha_evento = '2026-04-22' WHERE id_solicitud = 8;

-- Verificar que las actualizaciones fueron correctas
SELECT 
    s.id_solicitud,
    s.categoria,
    s.descripcion_corta as nombre,
    s.fecha_evento,
    s.estado,
    s.es_publico
FROM solicitudes s
WHERE s.es_publico = 1 
  AND s.estado = 'Confirmado'
  AND s.fecha_evento IS NOT NULL
ORDER BY s.fecha_evento;
