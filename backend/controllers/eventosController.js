const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
const serializeBigInt = (obj) => JSON.parse(JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? Number(value) : value));

/**
 * GET /api/eventos/publicos
 * Lista eventos confirmados públicos y activos
 */
const getPublicEvents = async (req, res) => {
    try {
        const query = `
            SELECT e.id, e.id_solicitud, e.tipo_evento, e.tabla_origen, e.nombre_evento, e.descripcion, COALESCE(e.url_flyer, sol.url_flyer) as url_flyer, e.fecha_evento, e.hora_inicio, e.duracion_estimada,
                   COALESCE(c.nombre, '') as nombre_cliente,
                   COALESCE(c.email, '') as email_cliente,
                   COALESCE(c.telefono, '') as telefono_cliente,
                   -- precios solo para eventos derivados de solicitudes de banda
                   sfb.precio_basico as precio_base,
                   sfb.precio_anticipada as precio_anticipada,
                   sfb.precio_puerta as precio_puerta,
                   e.es_publico
            FROM eventos_confirmados e
            LEFT JOIN solicitudes sol ON e.id_solicitud = sol.id
            LEFT JOIN clientes c ON e.id_cliente = c.id_cliente
            LEFT JOIN solicitudes_fechas_bandas sfb ON e.id_solicitud = sfb.id_solicitud AND e.tipo_evento = 'BANDA'
            WHERE e.es_publico = 1 AND e.activo = 1
            ORDER BY e.fecha_evento, e.hora_inicio
            LIMIT 100
        `;
        const rows = await pool.query(query);
        res.json(serializeBigInt(rows));
    } catch (err) {
        logError('Error getting public events:', err);
        res.status(500).json({ error: 'Error al obtener eventos públicos' });
    }
};

/**
 * GET /api/eventos/:eventoId/detalle-publico
 * Obtiene detalles públicos de un evento confirmado por ID (para edición público)
 * Usado por la página de edición de bandas cuando se accede vía enlace público (ev_X)
 */
const getEventoDetallePublico = async (req, res) => {
    try {
        const { eventoId } = req.params;

        if (!eventoId || isNaN(eventoId)) {
            return res.status(400).json({ error: 'ID de evento inválido' });
        }

        // Obtener evento confirmado
        const [evento] = await pool.query(`
            SELECT e.id, e.id_solicitud, e.tipo_evento, e.tabla_origen, e.nombre_evento, e.descripcion, e.url_flyer, 
                   e.fecha_evento, e.hora_inicio, e.duracion_estimada,
                   COALESCE(c.nombre, '') as nombre_cliente,
                   COALESCE(c.email, '') as email_cliente,
                   COALESCE(c.telefono, '') as telefono_cliente,
                   sfb.precio_basico as precio_base,
                   sfb.precio_anticipada as precio_anticipada,
                   sfb.precio_puerta as precio_puerta,
                   e.precio_final, e.es_publico, e.activo
            FROM eventos_confirmados e
            LEFT JOIN clientes c ON e.id_cliente = c.id_cliente
            LEFT JOIN solicitudes_fechas_bandas sfb ON e.id_solicitud = sfb.id_solicitud AND e.tipo_evento = 'BANDA'
            WHERE e.id = ?
        `, [eventoId]);

        if (!evento) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        // Si es de tipo BANDA, cargar datos de solicitudes_fechas_bandas
        if (evento.tipo_evento === 'BANDA' && evento.id_solicitud) {
            const [fechaBanda] = await pool.query(`
                SELECT sfb.id_solicitud as id_solicitud_fecha_banda,
                       sfb.fecha_evento, sfb.hora_evento, sfb.duracion, sfb.id_banda,
                       sfb.precio_basico, sfb.precio_puerta_propuesto, sfb.cantidad_bandas,
                       sfb.expectativa_publico, sfb.estado, sfb.notas_admin,
                       sfb.bandas_json, sfb.creado_en, sfb.actualizado_en,
                       s.descripcion_corta, s.descripcion_larga, s.url_flyer as solicitud_url_flyer,
                       s.id_cliente, s.es_publico,
                       c.nombre as cliente_nombre, c.email as cliente_email, c.telefono as cliente_telefono,
                       ba.id_banda as banda_id, ba.nombre as banda_nombre, ba.genero_musical, 
                       ba.logo_url, ba.facebook, ba.instagram, ba.youtube, ba.spotify
                FROM solicitudes_fechas_bandas sfb
                JOIN solicitudes s ON sfb.id_solicitud = s.id
                LEFT JOIN clientes c ON s.id_cliente = c.id_cliente
                LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id_banda
                WHERE sfb.id_solicitud = ?
                LIMIT 1
            `, [evento.id_solicitud]);

            if (fechaBanda) {
                // Combinar datos: evento tiene id_evento (4), fechaBanda tiene id_solicitud_fecha_banda (11)
                const datos = {
                    ...evento,
                    ...fechaBanda,
                    // Preservar ambos IDs claramente
                    id_evento: evento.id,
                    // id_solicitud_fecha_banda viene como el id_solicitud de sfb
                    url_flyer: evento.url_flyer || fechaBanda.solicitud_url_flyer
                };

                // Cargar bandas invitadas si existen
                const [invitadas] = await pool.query(`
                    SELECT id, id_banda, nombre_banda, orden
                    FROM eventos_bandas_invitadas
                    WHERE id_evento = ?
                    ORDER BY orden ASC
                `, [evento.id]);

                return res.json(serializeBigInt({
                    ...datos,
                    invitadas: invitadas || []
                }));
            }
        }

        // Si no es banda o no hay datos en solicitudes_fechas_bandas, retornar evento básico
        res.json(serializeBigInt(evento));

    } catch (err) {
        logError('Error getting evento detalle:', err);
        res.status(500).json({ error: 'Error al obtener detalles del evento' });
    }
};

module.exports = {
    getPublicEvents,
    getEventoDetallePublico
};
