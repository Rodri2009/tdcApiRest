const express = require('express');
const router = express.Router();
const {
    getSolicitudes,
    actualizarEstadoSolicitud,
    eliminarSolicitud,
    getDatosAsignacion,
    guardarAsignaciones,
    getOrdenDeTrabajo,
    getAllTiposDeEvento
} = require('../controllers/adminController');

const { protect } = require('../middleware/authMiddleware');

// ¡Aplicamos el middleware 'protect' a todas las rutas de este archivo!
router.use(protect);

router.get('/solicitudes', getSolicitudes);
router.put('/solicitudes/:id/estado', actualizarEstadoSolicitud);
router.delete('/solicitudes/:id', eliminarSolicitud);
router.get('/asignacion-data', getDatosAsignacion);
router.post('/solicitudes/:id/asignaciones', guardarAsignaciones);
router.get('/orden-trabajo/:id', getOrdenDeTrabajo);
router.get('/tipos-evento/all', getAllTiposDeEvento);

module.exports = router;