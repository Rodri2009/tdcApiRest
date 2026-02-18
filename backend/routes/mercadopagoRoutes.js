const express = require('express');
const router = express.Router();
const mercadopagoController = require('../controllers/mercadopagoController');

/**
 * Rutas para integración con serverMP (Mercado Pago)
 * Servidor externo esperado en http://localhost:9001 (Fase 1)
 * o http://mp-browser:9001 (Fase 2)
 */

// GET /api/mercadopago/balance - Obtiene saldo
router.get('/balance', mercadopagoController.getBalance);

// GET /api/mercadopago/activity - Obtiene historial
router.get('/activity', mercadopagoController.getActivity);

// POST /api/mercadopago/refresh - Fuerza refresh
router.post('/refresh', mercadopagoController.refresh);

module.exports = router;
