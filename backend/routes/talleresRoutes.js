// backend/routes/talleresRoutes.js
// Rutas para gestión de Talleres/Actividades
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { checkPermiso } = require('../middleware/checkPermiso');
const {
    // Talleristas
    getTalleristas,
    getTalleristaById,
    createTallerista,
    updateTallerista,
    deleteTallerista,
    // Talleres
    getTalleres,
    getTallerById,
    createTaller,
    updateTaller,
    deleteTaller,
    // Precios
    getPreciosTalleres,
    createPrecioTaller,
    updatePrecioTaller,
    deletePrecioTaller,
    // Tipos
    getTiposTaller,
    createTipoTaller,
    updateTipoTaller,
    deleteTipoTaller,
    // Inscripciones
    getInscripciones,
    getInscripcionById,
    createInscripcion,
    updateInscripcion,
    deleteInscripcion
} = require('../controllers/talleresController');

// =============================================================================
// RUTAS PÚBLICAS (para mostrar en el frontend público)
// =============================================================================

// Tipos de taller (público)
router.get('/tipos', getTiposTaller);

// Talleres activos (público)
router.get('/', getTalleres);
router.get('/:id', getTallerById);

// Talleristas activos (público - para mostrar info)
router.get('/talleristas/lista', getTalleristas);

// Precios vigentes (público - para mostrar precios)
router.get('/precios/lista', getPreciosTalleres);

// =============================================================================
// RUTAS PROTEGIDAS (solo admin con permiso config.talleres)
// =============================================================================

// --- Tipos de Taller ---
router.post('/tipos', protect, requireAdmin, checkPermiso('config.talleres'), createTipoTaller);
router.put('/tipos/:id', protect, requireAdmin, checkPermiso('config.talleres'), updateTipoTaller);
router.delete('/tipos/:id', protect, requireAdmin, checkPermiso('config.talleres'), deleteTipoTaller);

// --- Talleristas ---
router.get('/talleristas/:id', protect, requireAdmin, getTalleristaById);
router.post('/talleristas', protect, requireAdmin, checkPermiso('config.talleres'), createTallerista);
router.put('/talleristas/:id', protect, requireAdmin, checkPermiso('config.talleres'), updateTallerista);
router.delete('/talleristas/:id', protect, requireAdmin, checkPermiso('config.talleres'), deleteTallerista);

// --- Talleres ---
router.post('/', protect, requireAdmin, checkPermiso('config.talleres'), createTaller);
router.put('/:id', protect, requireAdmin, checkPermiso('config.talleres'), updateTaller);
router.delete('/:id', protect, requireAdmin, checkPermiso('config.talleres'), deleteTaller);

// --- Precios ---
router.post('/precios', protect, requireAdmin, checkPermiso('config.talleres'), createPrecioTaller);
router.put('/precios/:id', protect, requireAdmin, checkPermiso('config.talleres'), updatePrecioTaller);
router.delete('/precios/:id', protect, requireAdmin, checkPermiso('config.talleres'), deletePrecioTaller);

// --- Inscripciones ---
router.get('/inscripciones', protect, requireAdmin, getInscripciones);
router.get('/inscripciones/:id', protect, requireAdmin, getInscripcionById);
router.post('/inscripciones', protect, requireAdmin, checkPermiso('solicitudes.crear'), createInscripcion);
router.put('/inscripciones/:id', protect, requireAdmin, checkPermiso('solicitudes.editar'), updateInscripcion);
router.delete('/inscripciones/:id', protect, requireAdmin, checkPermiso('solicitudes.eliminar'), deleteInscripcion);

module.exports = router;
