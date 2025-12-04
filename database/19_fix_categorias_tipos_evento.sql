-- =============================================================================
-- Migración 19: Corregir estructura de categorías de tipos de evento
-- =============================================================================
-- 
-- LÓGICA DE NEGOCIO:
-- 
-- 1. ALQUILER_SALON: Cliente que alquila el salón (page.html)
--    Subtipos: SIN_SERVICIO_DE_MESA, CON_SERVICIO_DE_MESA, INFORMALES, 
--              INFANTILES, ADOLESCENTES, BABY_SHOWERS
--    es_publico = 0 (NO aparece en agenda pública)
--
-- 2. FECHA_BANDAS: Cliente que ve bandas o quiere tocar (agenda_de_bandas.html, solicitud_banda.html)
--    Sin subtipos (el tipo principal ES el evento)
--    es_publico = 1 (aparece en agenda con botón "Sacar entrada")
--
-- 3. TALLERES: (FUTURO) Cliente que participa o da talleres
--    Subtipos: TALLER, ACTIVIDAD
--    es_publico = 1 (aparece en agenda con botón "Registrarse")
--
-- 4. SERVICIO: (FUTURO) Cliente que usa servicios (depilación, etc.)
--    Subtipos: DEPILACION_DEFINITIVA
--    es_publico = 1 (aparece en agenda con botón "Sacar turno")
--
-- =============================================================================

-- Actualizar todos los subtipos de ALQUILER_SALON
UPDATE opciones_tipos SET categoria = 'ALQUILER_SALON', es_publico = 0 WHERE id_evento = 'SIN_SERVICIO_DE_MESA';
UPDATE opciones_tipos SET categoria = 'ALQUILER_SALON', es_publico = 0 WHERE id_evento = 'CON_SERVICIO_DE_MESA';
UPDATE opciones_tipos SET categoria = 'ALQUILER_SALON', es_publico = 0 WHERE id_evento = 'INFORMALES';
UPDATE opciones_tipos SET categoria = 'ALQUILER_SALON', es_publico = 0 WHERE id_evento = 'INFANTILES';
UPDATE opciones_tipos SET categoria = 'ALQUILER_SALON', es_publico = 0 WHERE id_evento = 'ADOLESCENTES';
UPDATE opciones_tipos SET categoria = 'ALQUILER_SALON', es_publico = 0 WHERE id_evento = 'BABY_SHOWERS';

-- FECHA_BANDAS es su propia categoría (no tiene subtipos)
UPDATE opciones_tipos SET categoria = 'FECHA_BANDAS', es_publico = 1 WHERE id_evento = 'FECHA_BANDAS';

-- DEPILACION_DEFINITIVA pertenece a SERVICIO (futuro, pero corregimos ahora)
UPDATE opciones_tipos SET categoria = 'SERVICIO', es_publico = 1 WHERE id_evento = 'DEPILACION_DEFINITIVA';

-- =============================================================================
-- Verificación
-- =============================================================================
SELECT id_evento, nombre_para_mostrar, categoria, es_publico 
FROM opciones_tipos 
ORDER BY categoria, id_evento;
