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
router.get('/mp-stream', importarAutoStream);

module.exports = router;