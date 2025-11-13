// backend/models/ticketsModel.js
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

/**
 * Obtiene todos los eventos activos y disponibles para la venta.
 */
const getEventosActivos = async () => {
    const query = `
        SELECT 
            e.id, 
            e.nombre_banda, 
            e.fecha_hora, 
            e.precio_base, 
            e.aforo_maximo, 
            e.descripcion,
            (e.aforo_maximo - COUNT(t.evento_id)) as tickets_disponibles
        FROM eventos e
        LEFT JOIN tickets t ON e.id = t.evento_id AND t.estado IN ('PAGADO', 'PENDIENTE_PAGO')
        WHERE e.activo = TRUE 
        GROUP BY e.id
        HAVING tickets_disponibles > 0 OR e.precio_base = 0.00 -- Muestra eventos pagados y gratuitos
        ORDER BY e.fecha_hora ASC;
    `;
    const [rows] = await pool.query(query);
    return rows;
};

/**
 * Obtiene los detalles de un evento por su ID.
 */
const getEventoById = async (id) => {
    const query = `
        SELECT 
            e.id, 
            e.nombre_banda, 
            e.fecha_hora, 
            e.precio_base, 
            e.aforo_maximo, 
            e.descripcion,
            (e.aforo_maximo - COUNT(t.evento_id)) as tickets_disponibles
        FROM eventos e
        LEFT JOIN tickets t ON e.id = t.evento_id AND t.estado IN ('PAGADO', 'PENDIENTE_PAGO')
        WHERE e.id = ? AND e.activo = TRUE
        GROUP BY e.id
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0];
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
    const [rows] = await pool.query(query, [codigo]);
    return rows[0];
};

/**
 * Inicia el proceso de checkout creando un ticket en estado PENDIENTE_PAGO.
 * Retorna el ID único del ticket.
 */
const createPendingTicket = async (eventoId, email, nombre, cuponId, precioPagado) => {
    const ticketId = uuidv4();
    const query = `
        INSERT INTO tickets (id_unico, evento_id, email_comprador, nombre_comprador, cupon_id, precio_pagado, estado)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE_PAGO');
    `;
    
    await pool.query(query, [ticketId, eventoId, email, nombre, cuponId, precioPagado]);
    
    return ticketId;
};


// Funciones futuras:
// const updateTicketToPaid = async (ticketId, paymentDetails) => { ... };
// const updateTicketToScanned = async (ticketId) => { ... };

module.exports = {
    getEventosActivos,
    getEventoById,
    checkCupon,
    createPendingTicket,
};