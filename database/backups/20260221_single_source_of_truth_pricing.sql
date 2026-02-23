-- ====================================================================
-- MIGRACIÓN: Single Source of Truth - Pricing (Opción B3)
-- ====================================================================
-- Objetivo: Remover campos de precio de eventos_confirmados
--           Hacer eventos_confirmados una tabla de REFERENCIA pura
--           Precios viven SOLO en solicitudes_fechas_bandas
-- ====================================================================

-- 1. Remover columnas de precio de eventos_confirmados
ALTER TABLE eventos_confirmados DROP COLUMN precio_base;
ALTER TABLE eventos_confirmados DROP COLUMN precio_final;

-- 2. Verificar estructura final de eventos_confirmados
-- Estructura final: id, id_solicitud, tabla_origen, tipo_evento, 
--                   nombre_evento, fecha_evento, es_publico, fecha_confirmacion

-- ====================================================================
-- VALIDACIÓN: Asegurar que solicitudes_fechas_bandas tiene todos 
-- los campos de precio necesarios
-- ====================================================================
-- Estructura esperada en solicitudes_fechas_bandas:
--   - precio_basico (base para anticipada + servicio)
--   - precio_final (después de ajustes)
--   - precio_anticipada (descuento anticipada)
--   - precio_puerta_propuesto (venta en puerta)

-- ====================================================================
-- IMPACTO EN CONTROLLERS:
-- ====================================================================
-- 1. solicitudFechaBandaController.js (obtenerSolicitudFechaBanda):
--    - Cambiar: SELECT ec.precio_base, ec.precio_final
--    - A: SELECT sfb.precio_basico as precio_base, 
--            sfb.precio_final, sfb.precio_anticipada, sfb.precio_puerta_propuesto
--    - Motivo: Leer desde tabla de origen (una sola fuente de verdad)
--
-- 2. solicitudFechaBandaController.js (confirmarSolicitudFecha):
--    - Remover: INSERT INTO eventos_confirmados (...precio_base, precio_final,...)
--    - Mantener: INSERT with id_solicitud, tabla_origen, tipo_evento
--
-- 3. adminController.js:
--    - Remover fallback: precio_puerta → precio_final (ya no necesario)
--    - Usar directamente: precio_puerta_propuesto desde solicitudes_fechas_bandas

-- ====================================================================
-- NOTAS IMPORTANTES:
-- ====================================================================
-- - Después de esta migración, eventos_confirmados es una tabla de ÍNDICES
-- - Para cualquier lectura de precios, debe hacerse JOIN con solicitud original
-- - Garantiza consistencia: si se edita precio en solicitud, 
--   evento confirmado refleja cambio automáticamente
-- - No hay sincronización de precios (una sola fuente de verdad)
