const express = require('express');
const router = express.Router();
const {
    crearSolicitud,
    getSolicitudPorId,
    actualizarSolicitud, // <-- La que usa Page.html
    finalizarSolicitud,   // <-- La que usa Contacto.html
    guardarAdicionales,
    obtenerAdicionales,   // <-- GET para cargar adicionales previos
    getSesionExistente,
    getSolicitudesPublicas // <-- Para mostrar en agenda pública
} = require('../controllers/solicitudController');

// POST /api/solicitudes -> Crear una nueva solicitud
router.post('/', crearSolicitud);

// GET /api/solicitudes/sesion -> Buscar una sesión por fingerprint
// La movimos aquí para que esté con el resto de las rutas de solicitudes
router.get('/sesion', getSesionExistente);

// GET /api/solicitudes/publicas -> Obtener solicitudes públicas confirmadas para la agenda
router.get('/publicas', getSolicitudesPublicas);

// --- RUTAS QUE ACTÚAN SOBRE UN ID ESPECÍFICO ---

// GET /api/solicitudes/:id -> Obtener detalles de una solicitud
router.get('/:id', getSolicitudPorId);

// GET /api/solicitudes/:id/adicionales -> Obtener adicionales seleccionados previos
router.get('/:id/adicionales', obtenerAdicionales);

// PUT /api/solicitudes/:id -> Actualizar los datos básicos del presupuesto
router.put('/:id', actualizarSolicitud);

// POST /api/solicitudes/:id/adicionales -> Guardar los adicionales
router.post('/:id/adicionales', guardarAdicionales);

// PUT /api/solicitudes/:id/finalizar -> Confirmar y finalizar la solicitud
router.put('/:id/finalizar', finalizarSolicitud);

module.exports = router;