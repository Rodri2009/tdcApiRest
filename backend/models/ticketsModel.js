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
               ON e.id = t.id_evento AND t.estado IN ('pagado', 'pendiente')
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
               ON e.id = t.id_evento AND t.estado IN ('pagado', 'pendiente')
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
    // Generar código de confirmación único (máximo 20 caracteres)
    // Usar: primeras 3 caracteres de ticket + timestamp en base36 + random
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString(36).toUpperCase();
    const codigoConfirmacion = ('TKT' + timestamp + random).substring(0, 20);

    const result = await pool.query(
        `INSERT INTO tickets (id_evento, email, nombre_comprador, codigo_cupon, total, tipo_precio, estado, codigo_confirmacion)
         VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
        [eventoId, email, nombre, codigoCupon || null, precioPagado, tipoPrecio, codigoConfirmacion]
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

/**
 * FASE 1: Obtiene lista de todos los clientes que compraron entradas para un evento.
 * @param {number} eventoId - ID del evento (eventos_confirmados.id)
 * @returns {Promise<Array>} Array con detalles de cada comprador
 */
const getClientesPorEvento = async (eventoId) => {
    const query = `
        SELECT 
            t.id,
            t.nombre_comprador,
            t.email,
            t.cantidad,
            t.tipo_precio,
            t.total,
            t.codigo_cupon,
            t.descuento_aplicado,
            t.codigo_confirmacion,
            t.estado,
            t.cantidad_utilizada,
            t.fecha_utilizacion,
            t.comprado_en,
            c.telefono,
            c.id_cliente,
            c.apellido
        FROM tickets t
        LEFT JOIN clientes c ON c.email = t.email
        WHERE t.id_evento = ?
        ORDER BY t.comprado_en DESC;
    `;
    const rows = await pool.query(query, [eventoId]);
    return rows.map(sanitizeRow);
};

/**
 * FASE 1: Obtiene estadísticas agregadas de un evento.
 * @param {number} eventoId - ID del evento (eventos_confirmados.id)
 * @returns {Promise<Object>} Objeto con estadísticas del evento
 */
const getResumenEvento = async (eventoId) => {
    const query = `
        SELECT 
            COUNT(DISTINCT id) as total_entradas_vendidas,
            COUNT(DISTINCT CASE WHEN estado = 'pagado' THEN id END) as entradas_pagadas,
            COUNT(DISTINCT CASE WHEN estado = 'pendiente' THEN id END) as entradas_pendientes,
            COUNT(DISTINCT CASE WHEN estado = 'utilizado' THEN id END) as entradas_utilizadas,
            COUNT(DISTINCT CASE WHEN estado = 'cancelado' THEN id END) as entradas_canceladas,
            SUM(CASE WHEN tipo_precio = 'ANTICIPADA' THEN 1 ELSE 0 END) as anticipadas,
            SUM(CASE WHEN tipo_precio = 'PUERTA' THEN 1 ELSE 0 END) as puerta,
            SUM(total) as ingresos_totales,
            SUM(CASE WHEN estado = 'pagado' THEN total ELSE 0 END) as ingresos_pagados,
            SUM(CASE WHEN estado = 'cancelado' THEN monto_reembolsado ELSE 0 END) as reembolsos_totales,
            SUM(cantidad) as cantidad_total_entradas,
            SUM(CASE WHEN estado = 'pagado' THEN cantidad ELSE 0 END) as cantidad_pagada,
            SUM(cantidad_utilizada) as cantidad_utilizada_total
        FROM tickets
        WHERE id_evento = ?;
    `;
    const rows = await pool.query(query, [eventoId]);
    return sanitizeRow(rows[0]);
};

/**
 * FASE 2: Obtiene los detalles completos de un ticket.
 * @param {number} ticketId - ID del ticket
 * @returns {Promise<Object>} Detalles del ticket
 */
const getTicketById = async (ticketId) => {
    const query = `
        SELECT 
            t.id,
            t.id_evento,
            t.nombre_comprador,
            t.email,
            t.cantidad,
            t.tipo_precio,
            t.total,
            t.estado,
            t.codigo_confirmacion,
            t.codigo_cupon,
            t.cantidad_utilizada,
            t.fecha_utilizacion,
            t.fecha_escaneo,
            t.comprado_en,
            e.nombre_evento,
            e.fecha_evento
        FROM tickets t
        LEFT JOIN eventos_confirmados e ON e.id = t.id_evento
        WHERE t.id = ?;
    `;
    const rows = await pool.query(query, [ticketId]);
    return sanitizeRow(rows[0]);
};

/**
 * FASE 2: Valida un ticket para entrada y lo marca como utilizado.
 * @param {number} ticketId - ID del ticket
 * @param {number} eventoId - ID del evento (para validar)
 * @returns {Promise<Object>} Resultado de la validación con detalles del ticket
 */
const validateTicketForEntry = async (ticketId, eventoId) => {
    const ticket = await getTicketById(ticketId);

    if (!ticket) {
        throw {
            status: 404,
            error: 'TICKET_NOT_FOUND',
            message: 'El ticket no existe'
        };
    }

    if (ticket.id_evento !== eventoId) {
        throw {
            status: 400,
            error: 'EVENTO_MISMATCH',
            message: `El ticket es para otro evento (${ticket.id_evento})`
        };
    }

    if (ticket.estado === 'cancelado') {
        throw {
            status: 400,
            error: 'TICKET_CANCELLED',
            message: 'Este ticket ha sido cancelado'
        };
    }

    if (ticket.estado !== 'pagado') {
        throw {
            status: 400,
            error: 'TICKET_NOT_PAID',
            message: `El ticket está en estado ${ticket.estado}, debe estar pagado`
        };
    }

    if (ticket.cantidad_utilizada >= ticket.cantidad) {
        throw {
            status: 400,
            error: 'TICKET_ALREADY_USED',
            message: 'Este ticket ya fue utilizado completamente'
        };
    }

    // Marcar como utilizado
    const ahora = new Date();
    const cantidadNueva = (ticket.cantidad_utilizada || 0) + 1;

    await pool.query(
        `UPDATE tickets 
         SET estado = 'utilizado', 
             cantidad_utilizada = ?,
             fecha_escaneo = NOW(),
             fecha_utilizacion = ?
         WHERE id = ?`,
        [cantidadNueva, ahora, ticketId]
    );

    // Registrar en historial
    await pool.query(
        `INSERT INTO tickets_historial (id_ticket, evento_id, estado_anterior, estado_nuevo, nota)
         VALUES (?, ?, ?, ?, ?)`,
        [ticketId, eventoId, ticket.estado, 'utilizado', 'Entrada utilizada - Escaneado en puerta']
    );

    return {
        id: ticketId,
        cliente_nombre: ticket.nombre_comprador,
        email: ticket.email,
        evento: ticket.nombre_evento,
        estado: 'utilizado',
        cantidad_utilizada: cantidadNueva
    };
};

module.exports = {
    getEventosActivos,
    getEventoById,
    checkCupon,
    createPendingTicket,
    updateTicketStatus,
    getClientesPorEvento,
    getResumenEvento,
    getTicketById,
    validateTicketForEntry,
};