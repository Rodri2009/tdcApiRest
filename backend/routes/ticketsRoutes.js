// backend/routes/ticketsRoutes.js
const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');
const bandasController = require('../controllers/bandasController');
const { protect } = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/tickets/eventos - Lista todos los eventos disponibles.
router.get('/eventos', ticketsController.getEventos);

// GET /api/tickets/eventos/:id/lineup - Lineup de un evento
router.get('/eventos/:id/lineup', bandasController.getEventoLineup);

// PUT /api/tickets/eventos/:id/lineup - Actualizar lineup (admin)
router.put('/eventos/:id/lineup', protect, requireAdmin, bandasController.updateEventoLineup);

// POST /api/tickets/checkout/simulate - Simula la compra y aplica cupones.
router.post('/checkout/simulate', ticketsController.simulateCheckout);

// POST /api/tickets/checkout/init - Crea el ticket PENDIENTE_PAGO y genera la preferencia de pago (MP).
router.post('/checkout/init', ticketsController.initCheckout);

// RUTAS FUTURAS:
// router.post('/webhook', ticketsController.webhookHandler); // Para recibir notificaciones de pago de MP
// router.post('/validate', authMiddleware.isAdmin, ticketsController.validateTicket); // Para la app de scanner

module.exports = router;