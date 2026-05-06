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
 * PARÁMETROS QUE DEVUELVE MERCADOPAGO
 * 
 * En las URLs de retorno (back_urls), MP envía estos parámetros como GET query:
 * - collection_id: ID único del pago en MP
 * - status: "approved", "rejected", o "pending"
 * - external_reference: ticket_id (sincronización local)
 * - payment_id: ID de la transacción
 * - merchant_order_id: ID de la orden en MP
 * - preference_id: ID de la preferencia
 * 
 * Ejemplo:
 * GET /frontend/comprobante.html?collection_id=123&status=approved&external_reference=456&...
 * 
 * El webhook (POST /api/tickets/webhook) se encarga de actualizar el estado en BD.
 * El frontend (comprobante.html) debe mostrar información al usuario basándose en estos parámetros.
 */

/**
 * Crea una preferencia de pago en MercadoPago para Checkout Pro.
 * 
 * Flujo:
 * 1. El usuario completa datos y se redirige a sandbox_init_point
 * 2. MP muestra Checkout Pro (formulario de pago)
 * 3. Después del pago, MP redirige a back_urls con parámetros:
 *    - collection_id: ID del pago en MP
 *    - status: "approved", "rejected", o "pending"
 *    - external_reference: ticket_id (para sincronizar con la BD)
 *    - payment_id: ID de la transacción
 *    - merchant_order_id: ID de la orden en MP
 * 4. Si auto_return=approved, redirecciona automáticamente ~40 seg después
 * 5. Se reciben webhooks para actualizar estado en tiempo real
 * 
 * @param {number} ticketId - ID del ticket en la BD local
 * @param {number} precioFinal - Monto a cobrar (ARS)
 * @param {string} email - Email del comprador
 * @param {string} nombreEvento - Título del evento (mostrado en MP)
 * @param {string} nombreComprador - Nombre del comprador
 * @returns {Promise<{ preference_id: string, init_point: string, sandbox_init_point: string }>}
 */
async function createPreference(ticketId, precioFinal, email, nombreEvento, nombreComprador) {
    const appUrl = process.env.APP_URL || 'http://localhost';
    const isLocalhost = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

    // Configuración minimal pero completa para Checkout Pro
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
    };

    // En producción, incluir back_urls. En localhost (testing), omitir
    // porque MercadoPago rechaza URLs locales
    if (!isLocalhost) {
        // back_urls: URLs a las que redirecciona MP después del pago
        // Los parámetros devueltos (collection_id, status, etc.) se envían como query params
        body.back_urls = {
            success: `${appUrl}/frontend/comprobante.html`,
            failure: `${appUrl}/frontend/checkout_form.html`,
            pending: `${appUrl}/frontend/comprobante.html`,
        };
        // auto_return: "approved" - Redirecciona automáticamente ~40 segundos después de pago aprobado
        body.auto_return = 'approved';
        // Notificaciones del servidor: MP notificará cambios de estado del pago
        body.notification_url = `${appUrl}/api/tickets/webhook`;
    }

    // external_reference: Sincroniza con el sistema local (ticket_id en este caso)
    // Se devuelve en back_urls y webhooks para identificar la orden
    body.external_reference = String(ticketId);

    logVerbose('[MP] Creando preferencia para Checkout Pro. Ticket:', ticketId, 'Monto:', precioFinal, 'AppUrl:', appUrl);

    const response = await preferenceClient.create({ body });

    logSuccess('[MP] Preferencia creada:', response.id, 'Init Point:', response.init_point);

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
