// backend/routes/ticketsRoutes.js
const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');
const bandasController = require('../controllers/bandasController');
const { protect } = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');



// GET /api/tickets/eventos_confirmadas - Lista todas las fechas de bandas disponibles.
router.get('/eventos_confirmados', ticketsController.getFechasBandasConfirmadas);

// GET /api/tickets/eventos/:id/lineup - Lineup de un evento
router.get('/eventos/:id/lineup', bandasController.getEventoLineup);

// PUT /api/tickets/eventos/:id/lineup - Actualizar lineup (admin)
router.put('/eventos/:id/lineup', protect, requireAdmin, bandasController.updateEventoLineup);

// POST /api/tickets/checkout/simulate - Simula la compra y aplica cupones.
router.post('/checkout/simulate', ticketsController.simulateCheckout);

// POST /api/tickets/checkout/init - Crea el ticket PENDIENTE_PAGO y genera la preferencia de pago (MP).
router.post('/checkout/init', ticketsController.initCheckout);

// Webhook de MercadoPago — sin autenticación JWT (MP no envía token)
router.post('/webhook', ticketsController.webhookHandler);

// POST /api/tickets/process-payment — procesa el pago generado por el Brick
router.post('/process-payment', ticketsController.processPayment);

// GET /api/tickets/public-key — devuelve la public key de MP al frontend
router.get('/public-key', ticketsController.getPublicKey);

// GET /api/tickets/:ticketId — obtiene detalles del ticket para el comprobante
router.get('/:ticketId', ticketsController.getTicketDetails);

// RUTAS FUTURAS:
// router.post('/validate', authMiddleware.isAdmin, ticketsController.validateTicket); // Para la app de scanner

module.exports = router;