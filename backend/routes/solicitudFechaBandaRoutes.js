// backend/routes/solicitudFechaBandaRoutes.js
// Rutas para gestión de solicitudes de fechas/shows de bandas

const express = require('express');
const router = express.Router();
const solicitudFechaBandaController = require('../controllers/solicitudFechaBandaController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/solicitudes-fechas-bandas - Listar solicitudes
router.get('/', solicitudFechaBandaController.listarSolicitudesFechasBandas);

// POST /api/solicitudes-fechas-bandas - Crear nueva solicitud de fecha
router.post('/', solicitudFechaBandaController.crearSolicitudFechaBanda);

// GET /api/solicitudes-fechas-bandas/:id - Obtener solicitud específica
router.get('/:id', solicitudFechaBandaController.obtenerSolicitudFechaBanda);

// PUT /api/solicitudes-fechas-bandas/:id - Actualizar solicitud (protegido)
// Restaurada protección: requiere token (middleware `protect`).
router.put('/:id', protect, solicitudFechaBandaController.actualizarSolicitudFechaBanda);

// PUT /api/solicitudes-fechas-bandas/:id/confirmar - Confirmar solicitud y crear evento
router.put('/:id/confirmar', protect, solicitudFechaBandaController.confirmarSolicitudFechaBanda);

// DELETE /api/solicitudes-fechas-bandas/:id - Eliminar solicitud
router.delete('/:id', protect, solicitudFechaBandaController.eliminarSolicitudFechaBanda);

module.exports = router;
