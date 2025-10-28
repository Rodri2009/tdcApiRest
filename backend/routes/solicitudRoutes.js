// backend/routes/solicitudRoutes.js
const express = require('express');
const router = express.Router();
const { crearSolicitud, getSolicitudPorId, finalizarSolicitud, guardarAdicionales } = require('../controllers/solicitudController');

// Mapea la petición POST a la raíz ('/') de este router a la función crearSolicitud.

// POST /api/solicitudes
router.post('/', crearSolicitud);

// GET /api/solicitudes/:id  <-- AÑADE ESTA LÍNEA
router.get('/:id', getSolicitudPorId);

// PUT /api/solicitudes/:id  <-- AÑADE ESTA LÍNEA
router.put('/:id', finalizarSolicitud);

// POST /api/solicitudes/:id/adicionales  <-- AÑADE ESTA LÍNEA
router.post('/:id/adicionales', guardarAdicionales);

module.exports = router;