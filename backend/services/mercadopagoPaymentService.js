// backend/services/mercadopagoPaymentService.js
// Servicio de pagos usando el SDK oficial de MercadoPago v2
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { logVerbose, logError, logSuccess } = require('../lib/debugFlags');

// El cliente se instancia una vez usando el ACCESS_TOKEN del entorno
const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
    options: { timeout: 5000 },
});

const preferenceClient = new Preference(mpClient);
const paymentClient = new Payment(mpClient);

/**
 * Crea una preferencia de pago en MercadoPago.
 * @param {number} ticketId - ID del ticket en la base de datos local
 * @param {number} precioFinal - Monto a cobrar
 * @param {string} email - Email del comprador
 * @param {string} nombreEvento - Título del evento para mostrar en MP
 * @returns {Promise<{ preference_id: string, init_point: string }>}
 */
async function createPreference(ticketId, precioFinal, email, nombreEvento) {
    const appUrl = process.env.APP_URL || 'http://localhost';

    const body = {
        items: [
            {
                id: String(ticketId),
                title: `Entrada: ${nombreEvento}`,
                quantity: 1,
                unit_price: parseFloat(precioFinal),
                currency_id: 'ARS',
            },
        ],
        payer: {
            email: email,
        },
        back_urls: {
            success: `${appUrl}/frontend/comprobante.html?status=approved&ticket_id=${ticketId}`,
            failure: `${appUrl}/frontend/checkout_form.html?status=failure&ticket_id=${ticketId}`,
            pending: `${appUrl}/frontend/comprobante.html?status=pending&ticket_id=${ticketId}`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/tickets/webhook`,
        external_reference: String(ticketId),
        statement_descriptor: 'TDC EVENTOS',
    };

    logVerbose('[MP] Creando preferencia para ticket', ticketId, 'monto:', precioFinal);

    const response = await preferenceClient.create({ body });

    logSuccess('[MP] Preferencia creada:', response.id);

    return {
        preference_id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
    };
}

/**
 * Obtiene los datos de un pago a partir de su ID (recibido via webhook).
 * @param {string|number} paymentId
 * @returns {Promise<Object>} Datos del pago devueltos por MP
 */
async function getPayment(paymentId) {
    logVerbose('[MP] Consultando pago:', paymentId);
    const response = await paymentClient.get({ id: paymentId });
    return response;
}

/**
 * Crea (procesa) un pago a partir del formData generado por el Brick.
 * @param {Object} formData - Datos enviados por el MP Payment Brick en onSubmit
 * @returns {Promise<Object>} Respuesta de MercadoPago con status, id, etc.
 */
async function createPayment(formData) {
    logVerbose('[MP] Creando pago desde Brick formData:', formData?.payment_method_id || '?');
    const response = await paymentClient.create({ body: formData });
    logSuccess('[MP] Pago procesado:', response.id, 'status:', response.status);
    return response;
}

module.exports = { createPreference, getPayment, createPayment };
