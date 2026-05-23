// backend/routes/testRoutes.js
const express = require('express');
const router = express.Router();
const { testEmail } = require('../controllers/testController');
const { importarAutoStream } = require('../controllers/cajasController');

// POST /api/test/email
router.post('/email', testEmail);

/**
 * GET /api/test/mp-stream?fechaDesde=&fechaHasta=&maxPaginas=
 * SIN AUTH — Solo para pruebas locales desde curl.
 * Equivale a /api/cajas/importar-auto-stream pero sin protect/requireAdmin.
 *
 * Ejemplo:
 *   curl -N "http://localhost:3000/api/test/mp-stream?fechaDesde=2026-05-16T21:00&fechaHasta=2026-05-16T23:00&maxPaginas=1"
 */
function injectTestUser(req, res, next) {
    // Inyecta un usuario admin mock para que el controlador no falle por req.user undefined
    req.user = { id_usuario: 1, id: 1, nombre: 'Test', role: 'admin', nivel: 100 };
    next();
}
router.get('/mp-stream', injectTestUser, importarAutoStream);

module.exports = router;