const express = require('express');
const router = express.Router();
const mercadopagoController = require('../controllers/mercadopagoController');
const { protect } = require('../middleware/authMiddleware');

/**
 * Rutas para integración con serverMP (Mercado Pago)
 * 
 * Protección: Todas las rutas requieren autenticación JWT válida
 * 
 * Servidor esperado en:
 * - Fase 1 (dev): http://localhost:9001 
 * - Fase 2 (prod): http://mp-browser:9001 (en docker-compose)
 */

// ✅ Aplicar autenticación JWT a TODAS las rutas de Mercado Pago
router.use(protect);

/**
 * GET /api/mercadopago/balance?fresh=true|false
 * Obtiene el saldo actual de Mercado Pago
 * Autenticado: ✅ Requiere token JWT válido
 */
router.get('/balance', mercadopagoController.getBalance);

/**
 * GET /api/mercadopago/activity?fresh=true|false&limit=20
 * Obtiene el historial de transacciones
 * Autenticado: ✅ Requiere token JWT válido
 */
router.get('/activity', mercadopagoController.getActivity);

/**
 * POST /api/mercadopago/refresh
 * Fuerza un refresh inmediato
 * Body: { page: 'balance' | 'activity' | 'all' }
 * Autenticado: ✅ Requiere token JWT válido
 */
router.post('/refresh', mercadopagoController.refresh);

module.exports = router;
