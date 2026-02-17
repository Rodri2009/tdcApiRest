// backend/controllers/ticketsController.js
const ticketsModel = require('../models/ticketsModel');
const pool = require('../db');
// const mercadopagoService = require('../services/mercadopagoService'); // Necesario más adelante

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
        console.error('Error al obtener eventos:', error);
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

        // 1. Verificar disponibilidad (aunque el modelo ya filtra, doble chequeo)
        if (evento.tickets_disponibles <= 0 && precioFinal > 0) {
            return res.status(409).json({ error: 'Tickets agotados para este evento.' });
        }

        // 2. Aplicar Cupón (si se proporciona)
        if (codigo_cupon) {
            const cupon = await ticketsModel.checkCupon(codigo_cupon);

            if (cupon) {
                // Verificar ámbito del cupón: TODAS, ANTICIPADA o PUERTA
                if (cupon.aplica_a && cupon.aplica_a !== 'TODAS' && cupon.aplica_a !== tipo_venta) {
                    // Cupón no aplicable para este tipo de venta
                    console.log(`Cupón ${codigo_cupon} no aplica para tipo_venta=${tipo_venta}.`);
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
                console.log(`Cupón ${codigo_cupon} no válido o expirado.`);
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
        console.error("Error en la simulación de checkout:", error);
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
        // 1. (Opcional) Re-ejecutar simulación para validar precio_final en backend (alta seguridad)
        // Por simplicidad, asumimos que el precio_final del frontend es correcto.

        const cupon = codigo_cupon ? await ticketsModel.checkCupon(codigo_cupon) : null;
        // Si el cupón no aplica al tipo de venta, lo consideramos nulo
        const cuponId = (cupon && (cupon.aplica_a === 'TODAS' || cupon.aplica_a === tipo_venta)) ? cupon.id : null;

        // 2. Crear el ticket en la base de datos en estado PENDIENTE_PAGO
        const ticketId = await ticketsModel.createPendingTicket(
            evento_id,
            email,
            nombre_comprador,
            cuponId,
            parseFloat(precio_final),
            tipo_venta
        );

        if (parseFloat(precio_final) > 0) {
            // 3. Generar la preferencia de pago (MERCADOPAGO - Lógica Futura)
            // const preference = await mercadopagoService.createPreference(ticketId, precio_final, email);

            // Simulación de respuesta de Mercado Pago:
            const preferenceId = `MP-${Date.now()}`;

            res.status(201).json({
                status: 'pending_payment',
                ticket_id: ticketId,
                preference_id: preferenceId, // ID que usa MP para redirigir
                message: 'Ticket creado, procede al pago.'
            });

        } else {
            // 4. Si es gratis (precio_final = 0), se marca como PAGADO inmediatamente.
            // En un sistema real, haríamos una función para marcarlo como PAGADO
            // await ticketsModel.updateTicketToPaid(ticketId, { free: true });

            res.status(201).json({
                status: 'paid_free',
                ticket_id: ticketId,
                message: 'Reserva gratuita completada con éxito.'
            });
        }

    } catch (error) {
        console.error("Error al iniciar el checkout:", error);
        res.status(500).json({ error: 'Error interno al procesar la solicitud.' });
    }
};


// Funciones futuras:
// const webhookHandler = async (req, res) => { ... };
// const validateTicket = async (req, res) => { ... };

module.exports = {
    getFechasBandasConfirmadas,
    simulateCheckout,
    initCheckout,
};