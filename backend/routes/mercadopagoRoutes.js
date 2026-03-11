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

// ✅ Middleware para acompañar mpPage (desde global si ENABLE_PUPPETEER_MP=true)
router.use((req, res, next) => {
    if (global.mpPage) {
        req.mpPage = global.mpPage;
    }
    next();
});

// ⚠️ SSE endpoint SIN protección JWT (valida token en query param internamente)
router.get('/watch', mercadopagoController.watchTransactions);

// DEBUG: permite enviar un evento simulado (requiere JWT)
router.post('/watch/debug', protect, mercadopagoController.debugBroadcast);

// TEST: simula ingreso con clave simple (DEBUG_SECRET), sin JWT. Para pruebas con curl.
router.post('/watch/test', mercadopagoController.testBroadcast);

// ✅ Aplicar autenticación JWT a las demás rutas de Mercado Pago
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
