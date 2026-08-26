// backend/controllers/ticketsController.js
const ticketsModel = require('../models/ticketsModel');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
const pool = require('../db');
const mercadopagoPaymentService = require('../services/mercadopagoPaymentService');
const ticketEventEmitter = require('../lib/ticketEventEmitter');
const crypto = require('crypto');

/**
 * GET /api/tickets/eventos
 * Obtiene la lista de eventos activos.
 */
const getFechasBandasConfirmadas = async (req, res) => {
    try {
        // Ejecución de la consulta SQL...
        const rows = await ticketsModel.getEventosActivos();

        // --- INICIO DE LA CORRECCIÓN ---
        const serializedEvents = rows.map(event => {
            // Buscamos y convertimos cualquier BigInt a Number o String
            for (const key in event) {
                // Usamos typeof para detectar el tipo BigInt
                if (typeof event[key] === 'bigint') {
                    // Convertimos a string para evitar errores si el número es demasiado grande
                    // (aunque para tickets 150n, Number() es seguro)
                    event[key] = event[key].toString();
                }
                // Convertimos el precio_base que viene como string ('5000.00') a float
                if ((key === 'precio_base' || key === 'precio_anticipada' || key === 'precio_puerta') && typeof event[key] === 'string') {
                    event[key] = parseFloat(event[key]);
                }
            }
            return event;
        });
        // --- FIN DE LA CORRECCIÓN ---
        res.json(serializedEvents);

    } catch (error) {
        logError('Error al obtener eventos:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener eventos.' });
    }
};

/**
 * POST /api/tickets/checkout/simulate
 * Simula el proceso de checkout para calcular el precio final con cupones.
 * (Paso 1 del checkout)
 */
const simulateCheckout = async (req, res) => {
    const { evento_id, codigo_cupon, tipo_venta = 'ANTICIPADA' } = req.body;

    if (!evento_id) {
        return res.status(400).json({ error: 'Debe especificar un ID de evento.' });
    }

    try {
        const evento = await ticketsModel.getEventoById(evento_id);

        if (!evento) {
            return res.status(404).json({ error: 'Evento no encontrado o no disponible.' });
        }

        // Determinar precio de partida según tipo_venta
        let precioBase = parseFloat(evento.precio_base);
        if (tipo_venta === 'PUERTA') {
            precioBase = evento.precio_puerta !== null ? parseFloat(evento.precio_puerta) : precioBase;
        } else { // ANTICIPADA
            precioBase = evento.precio_anticipada !== null ? parseFloat(evento.precio_anticipada) : precioBase;
        }

        let precioFinal = precioBase;
        let cuponAplicado = null;
        let descuentoAplicado = 0;

        // 1. Verificar disponibilidad
        // tickets_disponibles fue reemplazado por tickets_vendidos (sin límite de aforo en DB)
        // Si en el futuro se agrega un campo aforo, se lo compara aquí.

        // 2. Aplicar Cupón (si se proporciona)
        if (codigo_cupon) {
            const cupon = await ticketsModel.checkCupon(codigo_cupon);

            if (cupon) {
                // Verificar ámbito del cupón: TODAS, ANTICIPADA o PUERTA
                if (cupon.aplica_a && cupon.aplica_a !== 'TODAS' && cupon.aplica_a !== tipo_venta) {
                    // Cupón no aplicable para este tipo de venta
                    logVerbose(`Cupón ${codigo_cupon} no aplica para tipo_venta=${tipo_venta}.`);
                } else {
                    if (cupon.tipo_descuento === 'PORCENTAJE') {
                        descuentoAplicado = precioFinal * (cupon.porcentaje_descuento / 100);
                    } else if (cupon.tipo_descuento === 'MONTO_FIJO') {
                        descuentoAplicado = parseFloat(cupon.valor_fijo);
                    }

                    // Asegurar que el precio final no sea negativo
                    precioFinal = Math.max(0, precioFinal - descuentoAplicado);
                    cuponAplicado = cupon;
                }

            } else {
                // No detenemos el checkout, solo avisamos que el cupón no es válido.
                logVerbose(`Cupón ${codigo_cupon} no válido o expirado.`);
            }
        }

        res.status(200).json({
            evento: evento,
            tipo_venta: tipo_venta,
            cupon_aplicado: cuponAplicado,
            precio_base: precioBase,
            descuento: descuentoAplicado.toFixed(2),
            precio_final: precioFinal.toFixed(2),
            es_gratis: precioFinal === 0,
        });

    } catch (error) {
        logError("Error en la simulación de checkout:", error);
        res.status(500).json({ error: 'Error interno en la simulación.' });
    }
};

/**
 * POST /api/tickets/checkout/init
 * Inicia la transacción, crea el ticket en DB (PENDIENTE_PAGO) y genera la preferencia de pago.
 * (Paso 2 del checkout)
 */
const initCheckout = async (req, res) => {
    const { evento_id, email, nombre_comprador, codigo_cupon, precio_final, tipo_venta = 'ANTICIPADA' } = req.body;

    // Validación mínima de campos (se deberían validar todos los campos en la práctica)
    if (!evento_id || !email || !nombre_comprador || precio_final === undefined) {
        return res.status(400).json({ error: 'Faltan datos requeridos para iniciar el checkout.' });
    }

    try {
        // 1. Obtener el evento para validar y obtener el FK real (eventos_confirmados.id)
        const evento = await ticketsModel.getEventoById(evento_id);
        if (!evento) {
            return res.status(404).json({ error: 'Evento no encontrado.' });
        }

        const cupon = codigo_cupon ? await ticketsModel.checkCupon(codigo_cupon) : null;
        const codigoCuponAplicado = (cupon && (cupon.aplica_a === 'TODAS' || cupon.aplica_a === tipo_venta)) ? cupon.codigo : null;

        // 2. Crear el ticket con el ID real de eventos_confirmados (FK correcto)
        const ticketId = await ticketsModel.createPendingTicket(
            evento.id,
            email,
            nombre_comprador,
            codigoCuponAplicado,
            parseFloat(precio_final),
            tipo_venta
        );

        if (parseFloat(precio_final) > 0) {
            // 3. Generar la preferencia de pago con el SDK de MercadoPago
            const nombreEvento = evento.nombreEvento || evento.nombre_banda || `Evento #${evento_id}`;

            const preference = await mercadopagoPaymentService.createPreference(
                ticketId,
                parseFloat(precio_final),
                email,
                nombreEvento,
                nombre_comprador
            );

            logVerbose('[initCheckout] Preferencia creada:', {
                preference_id: preference.preference_id,
                unit_price: parseFloat(precio_final),
                payer_email: email,
                payer_name: nombre_comprador,
                evento: nombreEvento
            });

            res.status(201).json({
                status: 'pending_payment',
                ticket_id: ticketId,
                preference_id: preference.preference_id,
                sandbox_init_point: preference.sandbox_init_point,
                init_point: preference.init_point,
                message: 'Ticket creado, procede al pago.'
            });

        } else {
            // 4. Si es gratis, marcar como PAGADO inmediatamente
            await ticketsModel.updateTicketStatus(ticketId, 'pagado', null);

            res.status(201).json({
                status: 'paid_free',
                ticket_id: ticketId,
                message: 'Reserva gratuita completada con éxito.'
            });
        }

    } catch (error) {
        logError("Error al iniciar el checkout:", error);

        // Detectar error de credenciales inválidas de MercadoPago
        const mpStatus = error?.cause?.[0]?.status ?? error?.status;
        const mpCode = error?.cause?.[0]?.code ?? '';
        if (mpStatus === 403 || mpCode === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
            return res.status(502).json({ error: 'Credenciales de MercadoPago inválidas o no configuradas. Revisá MP_ACCESS_TOKEN en el servidor.' });
        }

        res.status(500).json({ error: 'Error interno al procesar la solicitud.' });
    }
};


/**
 * POST /api/tickets/webhook
 * Recibe notificaciones de MercadoPago y actualiza el estado del ticket.
 * 
 * Validación de firma HMAC (opcional si MP_WEBHOOK_SECRET está configurado)
 * Docs: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/notifications
 */
const webhookHandler = async (req, res) => {
    // Responder inmediatamente a MP para evitar reintentos
    res.status(200).send('OK');

    // VALIDACIÓN HMAC (opcional - TEMPORALMENTE DESACTIVADA PARA DIAGNOSTICAR)
    const mpWebhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (mpWebhookSecret) {
        const xSignature = req.headers['x-signature'];
        const xRequestId = req.headers['x-request-id'];

        if (xSignature && xRequestId) {
            // Extraer ts y hash del header x-signature
            const parts = xSignature.split(',');
            let ts, hash;

            parts.forEach(part => {
                const [key, value] = part.split('=');
                if (key?.trim() === 'ts') ts = value?.trim();
                if (key?.trim() === 'v1') hash = value?.trim();
            });

            if (ts && hash) {
                // Construir el template para validación
                const dataId = req.query['data.id'] || req.query['id'] || req.body?.data?.id;

                if (dataId) {
                    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
                    const expectedHash = crypto
                        .createHmac('sha256', mpWebhookSecret)
                        .update(manifest)
                        .digest('hex');

                    // LOG INFORMATIVO (no bloquea)
                    if (hash === expectedHash) {
                        logSuccess('[Webhook MP] Firma HMAC validada ✓');
                    } else {
                        logWarning('[Webhook MP] Firma HMAC no coincide (continuando sin validar)');
                        logWarning('  Manifest: ' + manifest);
                        logWarning('  Hash recibido: ' + hash);
                        logWarning('  Hash esperado: ' + expectedHash);
                    }
                }
            }
        }
    }

    const { type, data } = req.body;

    if (type !== 'payment' || !data?.id) {
        logVerbose('[Webhook MP] Notificación ignorada — tipo:', type);
        return;
    }

    const paymentId = data.id;
    logVerbose('[Webhook MP] Procesando pago:', paymentId);

    try {
        const payment = await mercadopagoPaymentService.getPayment(paymentId);

        const ticketId = parseInt(payment.external_reference, 10); // INT id del ticket
        if (!ticketId) {
            logWarning('[Webhook MP] external_reference vacío en pago', paymentId);
            return;
        }

        const mpStatus = payment.status; // approved | pending | rejected
        let nuevoEstado;

        if (mpStatus === 'approved') {
            nuevoEstado = 'pagado';
        } else if (mpStatus === 'pending' || mpStatus === 'in_process') {
            nuevoEstado = 'pendiente';
        } else {
            nuevoEstado = 'cancelado'; // rejected, cancelled, refunded, etc.
        }

        await ticketsModel.updateTicketStatus(ticketId, nuevoEstado, String(paymentId));
        logSuccess(`[Webhook MP] Ticket ${ticketId} → ${nuevoEstado} (pago ${paymentId})`);

        // Notificar via SSE a clientes suscritos
        ticketEventEmitter.notifySubscribers(ticketId, nuevoEstado, paymentId);

    } catch (error) {
        logError('[Webhook MP] Error al procesar pago ' + paymentId);
        logError('  Error message: ' + (error?.message || error));
        logError('  Stack: ' + (error?.stack || 'N/A'));
    }
};

/**
 * POST /api/tickets/process-payment
 * Recibe el formData del Brick de MercadoPago y procesa el pago.
 */
const processPayment = async (req, res) => {
    const { ticket_id, formData } = req.body;

    if (!ticket_id || !formData) {
        return res.status(400).json({ error: 'Faltan datos: ticket_id y formData requeridos.' });
    }

    try {
        const payment = await mercadopagoPaymentService.createPayment(formData);

        const mpStatus = payment.status;
        let nuevoEstado;

        if (mpStatus === 'approved') {
            nuevoEstado = 'pagado';
        } else if (mpStatus === 'pending' || mpStatus === 'in_process') {
            nuevoEstado = 'pendiente';
        } else {
            nuevoEstado = 'cancelado';
        }

        await ticketsModel.updateTicketStatus(ticket_id, nuevoEstado, String(payment.id));

        res.status(200).json({
            payment_id: payment.id,
            status: payment.status,
            status_detail: payment.status_detail,
        });

    } catch (error) {
        logError('Error al procesar pago con Brick:', error);
        res.status(500).json({ error: 'Error al procesar el pago.' });
    }
};

/**
 * GET /api/tickets/public-key
 * Devuelve la MP_PUBLIC_KEY para que el frontend pueda inicializar el Brick.
 */
const getPublicKey = (req, res) => {
    const publicKey = process.env.MP_PUBLIC_KEY;
    if (!publicKey) {
        return res.status(503).json({ error: 'Clave pública de MercadoPago no configurada.' });
    }
    res.json({ public_key: publicKey });
};

/**
 * GET /api/tickets/:ticketId
 * Obtiene los detalles de un ticket para mostrar el comprobante.
 */
const getTicketDetails = async (req, res) => {
    const { ticketId } = req.params;

    if (!ticketId || isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido.' });
    }

    try {
        const query = `
            SELECT 
                t.id,
                t.id_evento,
                t.email,
                t.nombre_comprador,
                t.codigo_cupon,
                t.total,
                t.tipo_precio,
                t.estado,
                t.codigo_confirmacion,
                t.mp_payment_id,
                t.created_at,
                e.id_solicitud,
                e.nombre_evento,
                e.fecha_evento,
                e.hora_inicio,
                e.descripcion,
                sfb.precio_anticipada,
                sfb.precio_puerta,
                sfb.precio_basico
            FROM tickets t
            LEFT JOIN eventos_confirmados e ON t.id_evento = e.id
            LEFT JOIN solicitudes_fechas_bandas sfb ON e.id_solicitud = sfb.id_solicitud
            WHERE t.id = ?
        `;

        const [ticket] = await pool.query(query, [ticketId]);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket no encontrado.' });
        }

        logVerbose('[getTicketDetails] Ticket encontrado:', {
            ticket_id: ticket.id,
            estado: ticket.estado,
            evento: ticket.nombre_evento
        });

        res.status(200).json(ticket);
    } catch (error) {
        logError('Error al obtener detalles del ticket:', error);
        res.status(500).json({ error: 'Error interno al obtener detalles del ticket.' });
    }
};

/**
 * FASE 1 - GET /api/tickets/evento/:eventoId/clientes
 * Obtiene lista de todos los clientes que compraron entradas para un evento.
 * Incluye: nombre, email, cantidad, tipo, monto, estado, fecha de compra, etc.
 */
const getClientesPorEvento = async (req, res) => {
    const { eventoId } = req.params;

    if (!eventoId || isNaN(eventoId)) {
        return res.status(400).json({ error: 'ID de evento inválido.' });
    }

    try {
        // Validar que el evento exista
        const eventoQuery = `SELECT id, nombre_evento, fecha_evento, hora_inicio FROM eventos_confirmados WHERE id = ?`;
        const [evento] = await pool.query(eventoQuery, [eventoId]);

        if (!evento) {
            return res.status(404).json({ error: 'Evento no encontrado.' });
        }

        // Obtener lista de clientes
        const clientes = await ticketsModel.getClientesPorEvento(eventoId);

        logSuccess(`[getClientesPorEvento] Evento ${eventoId}: ${clientes.length} compradores encontrados`);

        res.status(200).json({
            evento: {
                id: evento.id,
                nombre: evento.nombre_evento,
                fecha: evento.fecha_evento,
                hora: evento.hora_inicio
            },
            clientes: clientes,
            total_clientes: clientes.length
        });

    } catch (error) {
        logError('Error al obtener clientes por evento:', error);
        res.status(500).json({ error: 'Error interno al obtener clientes.' });
    }
};

/**
 * FASE 1 - GET /api/tickets/evento/:eventoId/resumen
 * Obtiene estadísticas agregadas de un evento:
 * - Total de entradas vendidas
 * - Desglose por estado (pagado, pendiente, utilizado, cancelado)
 * - Desglose por tipo (anticipadas vs puerta)
 * - Ingresos totales y pagados
 * - Reembolsos procesados
 */
const getResumenEvento = async (req, res) => {
    const { eventoId } = req.params;

    if (!eventoId || isNaN(eventoId)) {
        return res.status(400).json({ error: 'ID de evento inválido.' });
    }

    try {
        // Validar que el evento exista
        const eventoQuery = `SELECT id, nombre_evento, fecha_evento, hora_inicio FROM eventos_confirmados WHERE id = ?`;
        const [evento] = await pool.query(eventoQuery, [eventoId]);

        if (!evento) {
            return res.status(404).json({ error: 'Evento no encontrado.' });
        }

        // Obtener estadísticas
        const resumen = await ticketsModel.getResumenEvento(eventoId);

        logSuccess(`[getResumenEvento] Evento ${eventoId}: Resumen generado`);

        res.status(200).json({
            evento: {
                id: evento.id,
                nombre: evento.nombre_evento,
                fecha: evento.fecha_evento,
                hora: evento.hora_inicio
            },
            estadisticas: {
                // Conteos por estado
                total_entradas_vendidas: resumen.total_entradas_vendidas || 0,
                entradas_pagadas: resumen.entradas_pagadas || 0,
                entradas_pendientes: resumen.entradas_pendientes || 0,
                entradas_utilizadas: resumen.entradas_utilizadas || 0,
                entradas_canceladas: resumen.entradas_canceladas || 0,

                // Desglose por tipo de venta
                anticipadas: resumen.anticipadas || 0,
                puerta: resumen.puerta || 0,

                // Ingresos
                ingresos_totales: parseFloat(resumen.ingresos_totales) || 0,
                ingresos_pagados: parseFloat(resumen.ingresos_pagados) || 0,
                reembolsos_totales: parseFloat(resumen.reembolsos_totales) || 0,

                // Cantidades de entradas
                cantidad_total_entradas: resumen.cantidad_total_entradas || 0,
                cantidad_pagada: resumen.cantidad_pagada || 0,
                cantidad_utilizada_total: resumen.cantidad_utilizada_total || 0,

                // Porcentajes
                porcentaje_pago: resumen.total_entradas_vendidas > 0
                    ? ((resumen.entradas_pagadas / resumen.total_entradas_vendidas) * 100).toFixed(1)
                    : 0,
                porcentaje_utilizacion: resumen.cantidad_pagada > 0
                    ? ((resumen.cantidad_utilizada_total / resumen.cantidad_pagada) * 100).toFixed(1)
                    : 0
            }
        });

    } catch (error) {
        logError('Error al obtener resumen del evento:', error);
        res.status(500).json({ error: 'Error interno al obtener resumen.' });
    }
};

/**
 * PUT /api/tickets/:ticketId/validar
 * FASE 2: Valida una entrada en la puerta (marca como utilizado).
 */
const validarEntrada = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { evento_id, codigo } = req.body;

        // Validar parámetros
        if (!ticketId || !evento_id) {
            return res.status(400).json({
                error: 'INVALID_PARAMS',
                message: 'Faltan parámetros requeridos (ticketId, evento_id)'
            });
        }

        logVerbose(`[TICKETS] Validando entrada: ticket=${ticketId}, evento=${evento_id}`);

        // Validar el ticket
        const result = await ticketsModel.validateTicketForEntry(ticketId, parseInt(evento_id));

        logSuccess(`[TICKETS] ✓ Entrada validada: ticket ${ticketId}`);
        res.json(result);

    } catch (error) {
        logError(`[TICKETS] Error validando entrada:`, error);

        if (error.status === 404) {
            return res.status(404).json({ error: error.error, message: error.message });
        }
        if (error.status === 400) {
            return res.status(400).json({ error: error.error, message: error.message });
        }

        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Error interno del servidor al validar entrada'
        });
    }
};

/**
 * FASE 5 - GET /api/tickets/me
 * Obtiene todas las entradas del usuario logueado.
 * Requiere autenticación JWT (protect middleware)
 * 
 * Retorna: Array de tickets con datos del evento
 */
const getMyTickets = async (req, res) => {
    try {
        // req.user viene del protect middleware
        if (!req.user || !req.user.email) {
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'Usuario no autenticado'
            });
        }

        const userEmail = req.user.email;
        logVerbose(`[getMyTickets] Obteniendo entradas de: ${userEmail}`);

        // Query: Obtener todos los tickets del usuario por email
        const query = `
            SELECT 
                t.id,
                t.nombre_comprador,
                t.email,
                t.cantidad,
                t.tipo_precio,
                t.total,
                t.codigo_confirmacion,
                t.estado,
                t.comprado_en,
                t.id_evento,
                e.nombre_evento,
                e.nombre_banda,
                e.fecha_evento,
                e.hora_inicio
            FROM tickets t
            LEFT JOIN eventos_confirmados e ON t.id_evento = e.id
            WHERE t.email = ?
            ORDER BY t.comprado_en DESC
        `;

        const tickets = await pool.query(query, [userEmail]);

        // Convertir BigInt a string para JSON
        const serializedTickets = tickets.map(ticket => {
            const converted = { ...ticket };
            for (const key in converted) {
                if (typeof converted[key] === 'bigint') {
                    converted[key] = converted[key].toString();
                }
            }
            return converted;
        });

        logSuccess(`[getMyTickets] ${serializedTickets.length} entradas encontradas para ${userEmail}`);
        res.status(200).json(serializedTickets);

    } catch (error) {
        logError('[getMyTickets] Error obteniendo entradas:', error);
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Error interno al obtener entradas'
        });
    }
};

/**
 * GET /api/tickets/{id}/events
 * Server-Sent Events (SSE) endpoint para notificaciones de cambio de estado
 * 
 * El cliente abre una conexión persistente y recibe eventos en tiempo real
 * cuando el ticket cambia de estado (ej: pago aprobado → pagado)
 */
const subscribeToTicketEvents = (req, res) => {
    const { id: ticketId } = req.params;

    if (!ticketId || isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
    }

    // Headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Enviar un ping inicial
    res.write(`:Connected to ticket ${ticketId} events\n\n`);

    logVerbose(`[SSE] Cliente conectado para eventos del ticket ${ticketId}`);

    // Suscribir al emitter
    ticketEventEmitter.subscribe(parseInt(ticketId), res);

    // Mantener la conexión viva con ping cada 30 segundos
    const pingInterval = setInterval(() => {
        try {
            res.write(`: heartbeat\n\n`);
        } catch (error) {
            clearInterval(pingInterval);
        }
    }, 30000);

    // Limpiar cuando el cliente se desconecte
    res.on('close', () => {
        clearInterval(pingInterval);
        logVerbose(`[SSE] Cliente desconectado del ticket ${ticketId}`);
    });
};

/**
 * GET /api/tickets/search-by-payment/:paymentId
 * Busca un ticket por su payment_id (útil para Checkout Pro redirect)
 * Sin autenticación requerida (el payment_id es único y de corta duración)
 */
const getTicketByPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({ error: 'paymentId requerido' });
        }

        logVerbose(`[getTicketByPayment] Buscando ticket con payment_id: ${paymentId}`);

        const query = `
            SELECT 
                t.id,
                t.nombre_comprador,
                t.email,
                t.cantidad,
                t.tipo_precio,
                t.total,
                t.codigo_confirmacion,
                t.estado,
                t.mp_payment_id,
                t.comprado_en,
                t.id_evento,
                e.nombre_evento,
                e.fecha_evento,
                e.hora_inicio
            FROM tickets t
            LEFT JOIN eventos_confirmados e ON t.id_evento = e.id
            WHERE t.mp_payment_id = ?
            LIMIT 1
        `;

        const tickets = await pool.query(query, [paymentId]);

        if (tickets.length === 0) {
            logWarning(`[getTicketByPayment] No encontrado: ${paymentId}`);
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        const ticket = tickets[0];

        // Convertir BigInt a string para JSON
        const converted = { ...ticket };
        for (const key in converted) {
            if (typeof converted[key] === 'bigint') {
                converted[key] = converted[key].toString();
            }
        }

        logSuccess(`[getTicketByPayment] Encontrado ticket ${converted.id} (pago ${paymentId})`);
        res.status(200).json(converted);

    } catch (error) {
        logError('[getTicketByPayment] Error:', error);
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Error al buscar ticket'
        });
    }
};

module.exports = {
    getFechasBandasConfirmadas,
    simulateCheckout,
    initCheckout,
    webhookHandler,
    processPayment,
    getPublicKey,
    getTicketDetails,
    getClientesPorEvento,
    getResumenEvento,
    validarEntrada,
    getMyTickets,
    subscribeToTicketEvents,
    getTicketByPayment,
};