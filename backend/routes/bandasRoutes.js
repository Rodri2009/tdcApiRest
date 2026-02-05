// backend/routes/bandasRoutes.js
// Rutas para gestión de bandas/artistas

const express = require('express');
const router = express.Router();
const bandasController = require('../controllers/bandasController');
const { protect } = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { checkPermiso } = require('../middleware/checkPermiso');

// =============================================================================
// RUTAS PÚBLICAS
// =============================================================================

// Catálogo de instrumentos
router.get('/instrumentos', bandasController.getInstrumentos);

// Búsqueda rápida de bandas (autocomplete)
router.get('/buscar', bandasController.buscarBandas);

// Listado público de bandas (solo activas y verificadas)
router.get('/', bandasController.getBandas);

// Crear solicitud de fecha (público)
router.post('/solicitudes', bandasController.createSolicitud);

// =============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================================================

// Crear banda (puede ser público con datos básicos o admin con todos los datos)
router.post('/', bandasController.createBanda);

// =============================================================================
// RUTAS DE ADMIN
// =============================================================================

// --- Instrumentos (admin con permiso config.bandas) ---
router.post('/instrumentos', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.createInstrumento);
router.put('/instrumentos/:id', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.updateInstrumento);
router.delete('/instrumentos/:id', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.deleteInstrumento);

// --- Solicitudes (solo admin) ---
router.get('/solicitudes/lista', protect, requireAdmin, bandasController.getSolicitudes);
router.get('/solicitudes/:id', protect, requireAdmin, bandasController.getSolicitudById);
router.put('/solicitudes/:id', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.updateSolicitud);
router.post('/solicitudes/:id/aprobar', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.aprobarSolicitud);
router.post('/solicitudes/:id/rechazar', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.rechazarSolicitud);

// --- Eventos de bandas (lectura para admin, escritura con permiso) ---
// Rutas unificadas: /eventos_confirmados
router.get('/eventos_confirmados', protect, requireAdmin, bandasController.getEventosBandas);
router.get('/eventos_confirmados/:id', protect, requireAdmin, bandasController.getEventoBandaById);

// --- Bandas individuales (rutas con parámetros al final) ---
// Detalle de una banda
router.get('/:id', bandasController.getBandaById);

// Actualizar banda (requiere permiso config.bandas)
router.put('/:id', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.updateBanda);

// Eliminar (desactivar) banda (requiere permiso config.bandas)
router.delete('/:id', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.deleteBanda);

module.exports = router;
