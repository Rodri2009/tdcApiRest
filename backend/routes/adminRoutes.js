const express = require('express');
const router = express.Router();
const { getSolicitudes, actualizarEstadoSolicitud, eliminarSolicitud } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

// ¡Aplicamos el middleware 'protect' a todas las rutas de este archivo!
router.use(protect);

router.get('/solicitudes', getSolicitudes);
router.put('/solicitudes/:id/estado', actualizarEstadoSolicitud);
router.delete('/solicitudes/:id', eliminarSolicitud);


module.exports = router;