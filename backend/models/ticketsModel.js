// backend/models/ticketsModel.js
const pool = require('../db');

/** Convierte BigInt y Decimal strings a tipos JS nativos. */
function sanitizeRow(row) {
    if (!row) return row;
    const out = {};
    for (const key of Object.keys(row)) {
        const v = row[key];
        if (typeof v === 'bigint') {
            out[key] = Number(v);
        } else if (v instanceof Date) {
            out[key] = v;
        } else if (typeof v === 'string' && /^-?\d+\.\d+$/.test(v)) {
            // Decimal fields come as strings like '5000.00'
            out[key] = parseFloat(v);
        } else {
            out[key] = v;
        }
    }
    return out;
}

/**
 * Obtiene todos los eventos activos y disponibles para la venta.
 * La tabla eventos usa columnas separadas: fecha DATE + hora_inicio TIME
 */
const getEventosActivos = async () => {
    const query = `
        SELECT 
            e.id,
            e.id_solicitud,
            e.nombre_evento AS nombre_banda,
            e.nombre_evento AS nombreEvento,
            e.fecha_evento  AS fechaEvento,
            e.hora_inicio   AS horaEvento,
            e.url_flyer,
            e.descripcion,
            e.activo,
            sfb.precio_basico    AS precio_base,
            sfb.precio_anticipada,
            sfb.precio_puerta,
            CAST(COUNT(t.id) AS SIGNED) AS tickets_vendidos
        FROM eventos_confirmados e
        LEFT JOIN solicitudes_fechas_bandas sfb
               ON e.id_solicitud = sfb.id_solicitud AND e.tipo_evento = 'BANDA'
        LEFT JOIN tickets t
               ON e.id = t.id_evento AND t.estado IN ('PAGADO', 'PENDIENTE_PAGO')
        WHERE e.activo = TRUE AND e.tipo_evento = 'BANDA'
          AND e.fecha_evento >= CURDATE()
        GROUP BY e.id
        ORDER BY e.fecha_evento ASC, e.hora_inicio ASC;
    `;
    const rows = await pool.query(query);
    return rows.map(sanitizeRow);
};

/**
 * Obtiene los detalles de un evento por su ID.
 */
const getEventoById = async (solicitudId) => {
    const query = `
        SELECT 
            e.id,
            e.id_solicitud,
            e.nombre_evento  AS nombre_banda,
            e.nombre_evento  AS nombreEvento,
            e.fecha_evento   AS fechaEvento,
            e.hora_inicio    AS horaEvento,
            e.url_flyer,
            e.descripcion,
            sfb.precio_basico    AS precio_base,
            sfb.precio_anticipada,
            sfb.precio_puerta,
            CAST(COUNT(t.id) AS SIGNED) AS tickets_vendidos
        FROM eventos_confirmados e
        LEFT JOIN solicitudes_fechas_bandas sfb
               ON e.id_solicitud = sfb.id_solicitud
        LEFT JOIN tickets t
               ON e.id = t.id_evento AND t.estado IN ('PAGADO', 'PENDIENTE_PAGO')
        WHERE e.id_solicitud = ? AND e.activo = TRUE AND e.tipo_evento = 'BANDA'
        GROUP BY e.id
    `;
    const rows = await pool.query(query, [solicitudId]);
    return sanitizeRow(rows[0]);
};

/**
 * Verifica y obtiene la información de un cupón activo.
 */
const checkCupon = async (codigo) => {
    const query = `
        SELECT *
        FROM cupones
        WHERE codigo = ? 
          AND activo = TRUE
          AND (usos_maximos IS NULL OR usos_actuales < usos_maximos)
          AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURDATE());
    `;
    const rows = await pool.query(query, [codigo]);
    return rows[0];
};

/**
 * Inicia el proceso de checkout creando un ticket en estado PENDIENTE_PAGO.
 * @param {number} eventoId
 * @param {string} email
 * @param {string} nombre
 * @param {string|null} codigoCupon - Código de cupón aplicado (puede ser null)
 * @param {number} precioPagado
 * @param {string} tipoPrecio - 'ANTICIPADA' | 'PUERTA'
 * @returns {Promise<number>} ID entero del ticket creado
 */
const createPendingTicket = async (eventoId, email, nombre, codigoCupon, precioPagado, tipoPrecio = 'ANTICIPADA') => {
    const result = await pool.query(
        `INSERT INTO tickets (id_evento, email, nombre_comprador, codigo_cupon, total, tipo_precio, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE_PAGO')`,
        [eventoId, email, nombre, codigoCupon || null, precioPagado, tipoPrecio]
    );

    return Number(result.insertId);
};


// Funciones futuras:
// const updateTicketToScanned = async (ticketId) => { ... };

/**
 * Actualiza el estado de un ticket y opcionalmente guarda el ID de pago de MP.
 * @param {number} ticketId - ID entero del ticket (columna id)
 * @param {string} estado   - Nuevo estado ('PAGADO', 'PENDIENTE_PAGO', 'CANCELADO')
 * @param {string|null} mpPaymentId - ID de pago de MercadoPago
 */
const updateTicketStatus = async (ticketId, estado, mpPaymentId = null) => {
    if (mpPaymentId) {
        await pool.query(
            'UPDATE tickets SET estado = ?, mp_payment_id = ? WHERE id = ?',
            [estado, mpPaymentId, ticketId]
        );
    } else {
        await pool.query(
            'UPDATE tickets SET estado = ? WHERE id = ?',
            [estado, ticketId]
        );
    }
};

module.exports = {
    getEventosActivos,
    getEventoById,
    checkCupon,
    createPendingTicket,
    updateTicketStatus,
};