// backend/routes/bandasRoutes.js
// Rutas para gestión de bandas/artistas

const express = require('express');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
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

// Subir logo (público - acepta multipart/form-data con campo 'logo' y opcional 'nombre')
// Nota: Se utiliza multer para almacenar en /uploads/bandas con nombre controlado.
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'bandas');
        try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* noop */ }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Nombre temporal: timestamp + random
        const ext = (file.originalname && file.originalname.indexOf('.') !== -1) ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : (file.mimetype === 'image/png' ? '.png' : '.jpg');
        const tmpName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, tmpName);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') cb(null, true);
    else cb(new Error('Tipo de archivo no permitido'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 3 * 1024 * 1024 } });

router.post('/upload', upload.single('logo'), bandasController.uploadLogoPublic);

// =============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================================================

// Crear banda (puede ser público con datos básicos o admin con todos los datos)
router.post('/', bandasController.createBanda);

// Actualizar banda (público - para que usuarios puedan editar sus propias bandas)
router.put('/', bandasController.updateBandaPublic);

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
// Nuevo endpoint: detalle completo (evita consultas antiguas problemáticas)
router.get('/detalle/:id', bandasController.getBandaDetalle);
// Detalle de una banda (público)
router.get('/:id', bandasController.getBandaById);

// Actualizar banda (requiere permiso config.bandas)
router.put('/:id', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.updateBanda);

// Eliminar (desactivar) banda (requiere permiso config.bandas)
router.delete('/:id', protect, requireAdmin, checkPermiso('config.bandas'), bandasController.deleteBanda);

// Debug: listar rutas definidas en este router al requerir
logVerbose('DEBUG bandasRoutes: rutas definidas:');
router.stack.forEach(r => {
    if (r.route && r.route.path) {
        logVerbose(' -', Object.keys(r.route.methods).join(',').toUpperCase(), r.route.path);
    }
});

module.exports = router;
