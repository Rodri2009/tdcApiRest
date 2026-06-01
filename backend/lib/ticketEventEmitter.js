/**
 * ticketEventEmitter.js
 * 
 * Gestor de eventos en tiempo real para cambios de estado de tickets.
 * Usado por SSE (Server-Sent Events) para notificar al frontend cuando
 * un ticket cambia de estado (ej: pago aprobado)
 */

// Map de ticket_id → Set de response objects suscritos
const subscribers = new Map();

/**
 * Suscribir un cliente SSE a cambios de un ticket específico
 * @param {number} ticketId - ID del ticket
 * @param {Response} res - Response object HTTP para enviar eventos
 */
function subscribe(ticketId, res) {
    if (!subscribers.has(ticketId)) {
        subscribers.set(ticketId, new Set());
    }
    
    subscribers.get(ticketId).add(res);
    
    // Cuando se cierre la conexión, remover este subscriber
    res.on('close', () => {
        const subs = subscribers.get(ticketId);
        if (subs) {
            subs.delete(res);
            if (subs.size === 0) {
                subscribers.delete(ticketId);
            }
        }
    });
}

/**
 * Notificar a todos los clientes suscritos que un ticket cambió de estado
 * @param {number} ticketId - ID del ticket
 * @param {string} newStatus - Nuevo estado (ej: 'pagado')
 * @param {string} paymentId - ID del pago en MercadoPago (opcional)
 */
function notifySubscribers(ticketId, newStatus, paymentId = null) {
    const subs = subscribers.get(ticketId);
    
    if (!subs || subs.size === 0) {
        return;
    }
    
    const event = {
        ticketId,
        newStatus,
        paymentId,
        timestamp: new Date().toISOString()
    };
    
    const data = `data: ${JSON.stringify(event)}\n\n`;
    
    // Enviar a todos los clientes suscritos
    subs.forEach(res => {
        try {
            res.write(data);
        } catch (error) {
            // Si hay error escribiendo, remover este subscriber
            subs.delete(res);
        }
    });
}

/**
 * Obtener cantidad de subscribers para un ticket (util para debugging)
 */
function getSubscriberCount(ticketId) {
    const subs = subscribers.get(ticketId);
    return subs ? subs.size : 0;
}

module.exports = {
    subscribe,
    notifySubscribers,
    getSubscriberCount
};
