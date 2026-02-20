// backend/models/ticketsModel.js
// Soporte flexible para 'uuid': intentaremos cargarlo con require (CommonJS)
// y, si falla por ser un módulo ESM (ERR_REQUIRE_ESM), usaremos import() dinámico.
let uuidv4;
const loadUuid = async () => {
    if (uuidv4) return uuidv4;

    try {
        // Intentamos require para compatibilidad con uuid@8 (CommonJS)
        // Si la instalación es uuid@9+ este require lanzará ERR_REQUIRE_ESM.
        // eslint-disable-next-line global-require
        const uuid = require('uuid');
        uuidv4 = uuid.v4 || uuid;
        return uuidv4;
    } catch (err) {
        // Si el paquete existe pero es ESM, hacemos import dinámico
        if (err && err.code === 'ERR_REQUIRE_ESM') {
            try {
                const mod = await import('uuid');
                uuidv4 = mod.v4;
                return uuidv4;
            } catch (impErr) {
                logError("Error al importar 'uuid' como ESM:", impErr);
                throw impErr;
            }
        }

        // Si no se encuentra el paquete, dejamos un mensaje claro
        logError("Paquete 'uuid' no encontrado. Instala con 'npm install uuid' o 'npm install uuid@8' para compatibilidad CommonJS.", err);
        throw err;
    }
};

const pool = require('../db');

/**
 * Obtiene todos los eventos activos y disponibles para la venta.
 * La tabla eventos usa columnas separadas: fecha DATE + hora_inicio TIME
 */
const getEventosActivos = async () => {
    const query = `
        SELECT 
            e.id, 
            e.nombre_evento AS nombre_banda, 
            CONCAT(e.fecha_evento, ' ', COALESCE(e.hora_inicio, '00:00:00')) as fecha_hora,
            e.precio_base,
            NULL as precio_anticipada,
            e.precio_final as precio_puerta,
            e.cantidad_personas as aforo_maximo, 
            e.activo, 
            e.descripcion,
            CAST((e.cantidad_personas - COUNT(t.id_evento)) AS SIGNED) as tickets_disponibles
        FROM eventos_confirmados e
        LEFT JOIN tickets t ON e.id = t.id_evento AND t.estado IN ('PAGADO', 'PENDIENTE_PAGO')
        WHERE e.activo = TRUE
        GROUP BY e.id
        HAVING tickets_disponibles > 0 OR e.precio_base = 0.00 OR e.precio_final = 0.00
        ORDER BY e.fecha_evento ASC, e.hora_inicio ASC;
    `;
    const rows = await pool.query(query);
    return rows;
};

/**
 * Obtiene los detalles de un evento por su ID.
 */
const getEventoById = async (id) => {
    const query = `
        SELECT 
            e.id, 
            e.nombre_evento AS nombre_banda, 
            CONCAT(e.fecha_evento, ' ', COALESCE(e.hora_inicio, '00:00:00')) as fecha_hora,
            e.precio_base,
            NULL as precio_anticipada,
            e.precio_final as precio_puerta,
            e.cantidad_personas as aforo_maximo, 
            e.descripcion,
            (e.cantidad_personas - COUNT(t.id_evento)) as tickets_disponibles
        FROM eventos_confirmados e
        LEFT JOIN tickets t ON e.id = t.id_evento AND t.estado IN ('PAGADO', 'PENDIENTE_PAGO')
        WHERE e.id = ? AND e.activo = TRUE
        GROUP BY e.id
    `;
    const rows = await pool.query(query, [id]);
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
const createPendingTicket = async (eventoId, email, nombre, cuponId, precioPagado, tipoPrecio = 'ANTICIPADA') => {
    const getUuid = await loadUuid();
    if (!getUuid) {
        throw new Error("Dependencia 'uuid' no está disponible. Instala 'uuid' en dependencias.");
    }
    const ticketId = getUuid();

    const query = `
        INSERT INTO tickets (id_unico, id_evento, email_comprador, nombre_comprador, cupon_id, precio_pagado, tipo_precio, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE_PAGO');
    `;

    await pool.query(query, [ticketId, eventoId, email, nombre, cuponId, precioPagado, tipoPrecio]);

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