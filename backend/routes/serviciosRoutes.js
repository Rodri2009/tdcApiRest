// backend/routes/serviciosRoutes.js
// Rutas para gestión de Servicios (Depilación, Masajes, etc.)
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { checkPermiso } = require('../middleware/checkPermiso');
const {
    // Profesionales
    getProfesionales,
    getProfesionalById,
    createProfesional,
    updateProfesional,
    deleteProfesional,
    // Catálogo de servicios
    getServiciosCatalogo,
    getServicioById,
    createServicio,
    updateServicio,
    deleteServicio,
    // Precios
    getPreciosServicios,
    createPrecioServicio,
    updatePrecioServicio,
    deletePrecioServicio,
    // Turnos/Agenda
    getTurnos,
    getTurnoById,
    createTurno,
    updateTurno,
    deleteTurno,
    // Tipos
    getTiposServicio,
    createTipoServicio,
    updateTipoServicio,
    deleteTipoServicio
} = require('../controllers/serviciosController');

// =============================================================================
// RUTAS PÚBLICAS (para mostrar en el frontend público)
// =============================================================================

// Tipos de servicio (público)
router.get('/tipos', getTiposServicio);

// Catálogo de servicios activos (público)
router.get('/catalogo', getServiciosCatalogo);
router.get('/catalogo/:id', getServicioById);

// Profesionales activos (público - para mostrar info)
router.get('/profesionales/lista', getProfesionales);

// Precios vigentes (público - para mostrar precios)
router.get('/precios/lista', getPreciosServicios);

// Turnos disponibles (público - para reservar)
router.get('/turnos/disponibles', getTurnos);

// =============================================================================
// RUTAS PROTEGIDAS (solo admin con permiso config.servicios)
// =============================================================================

// --- Tipos de Servicio ---
router.post('/tipos', protect, requireAdmin, checkPermiso('config.servicios'), createTipoServicio);
router.put('/tipos/:id', protect, requireAdmin, checkPermiso('config.servicios'), updateTipoServicio);
router.delete('/tipos/:id', protect, requireAdmin, checkPermiso('config.servicios'), deleteTipoServicio);

// --- Profesionales ---
router.get('/profesionales/:id', protect, requireAdmin, getProfesionalById);
router.post('/profesionales', protect, requireAdmin, checkPermiso('config.servicios'), createProfesional);
router.put('/profesionales/:id', protect, requireAdmin, checkPermiso('config.servicios'), updateProfesional);
router.delete('/profesionales/:id', protect, requireAdmin, checkPermiso('config.servicios'), deleteProfesional);

// --- Catálogo de Servicios ---
router.post('/catalogo', protect, requireAdmin, checkPermiso('config.servicios'), createServicio);
router.put('/catalogo/:id', protect, requireAdmin, checkPermiso('config.servicios'), updateServicio);
router.delete('/catalogo/:id', protect, requireAdmin, checkPermiso('config.servicios'), deleteServicio);

// --- Precios ---
router.post('/precios', protect, requireAdmin, checkPermiso('config.servicios'), createPrecioServicio);
router.put('/precios/:id', protect, requireAdmin, checkPermiso('config.servicios'), updatePrecioServicio);
router.delete('/precios/:id', protect, requireAdmin, checkPermiso('config.servicios'), deletePrecioServicio);

// --- Turnos/Agenda ---
router.get('/turnos', protect, requireAdmin, getTurnos);
router.get('/turnos/:id', protect, requireAdmin, getTurnoById);
router.post('/turnos', protect, requireAdmin, checkPermiso('solicitudes.crear'), createTurno);
router.put('/turnos/:id', protect, requireAdmin, checkPermiso('solicitudes.editar'), updateTurno);
router.delete('/turnos/:id', protect, requireAdmin, checkPermiso('solicitudes.eliminar'), deleteTurno);

module.exports = router;
