const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventosController');

// Public endpoints
router.get('/publicos', eventosController.getPublicEvents);

// Detalle de evento público para edición (usado cuando se accede vía enlace público ev_X)
router.get('/:eventoId/detalle-publico', eventosController.getEventoDetallePublico);

module.exports = router;
