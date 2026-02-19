const pool = require('../db');
const serializeBigInt = (obj) => JSON.parse(JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? Number(value) : value));

/**
 * GET /api/eventos/publicos
 * Lista eventos confirmados públicos y activos
 */
const getPublicEvents = async (req, res) => {
    try {
        const query = `
            SELECT id, id_solicitud, tipo_evento, tabla_origen, nombre_evento, descripcion, url_flyer as flyer_url, fecha_evento, hora_inicio, duracion_estimada, nombre_cliente, email_cliente, telefono_cliente, precio_base, precio_final, es_publico
            FROM eventos_confirmados
            WHERE es_publico = 1 AND activo = 1
            ORDER BY fecha_evento, hora_inicio
            LIMIT 100
        `;
        const rows = await pool.query(query);
        res.json(serializeBigInt(rows));
    } catch (err) {
        console.error('Error getting public events:', err);
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
            SELECT id, id_solicitud, tipo_evento, tabla_origen, nombre_evento, descripcion, url_flyer, 
                   fecha_evento, hora_inicio, duracion_estimada, nombre_cliente, email_cliente, 
                   telefono_cliente, precio_base, precio_final, es_publico, activo
            FROM eventos_confirmados
            WHERE id = ?
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
                       sfb.invitadas_json, sfb.creado_en, sfb.actualizado_en,
                       s.descripcion_corta, s.descripcion_larga, s.url_flyer as solicitud_url_flyer,
                       s.cliente_id, s.es_publico,
                       c.nombre as cliente_nombre, c.email as cliente_email, c.telefono as cliente_telefono,
                       ba.id as banda_id, ba.nombre as banda_nombre, ba.genero_musical, 
                       ba.logo_url, ba.facebook, ba.instagram, ba.youtube, ba.spotify
                FROM solicitudes_fechas_bandas sfb
                JOIN solicitudes s ON sfb.id_solicitud = s.id
                LEFT JOIN clientes c ON s.cliente_id = c.id
                LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id
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
        console.error('Error getting evento detalle:', err);
        res.status(500).json({ error: 'Error al obtener detalles del evento' });
    }
};

module.exports = {
    getPublicEvents,
    getEventoDetallePublico
};
