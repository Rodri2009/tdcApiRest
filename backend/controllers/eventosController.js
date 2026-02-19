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

module.exports = {
    getPublicEvents
};
