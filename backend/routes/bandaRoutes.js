// backend/routes/bandaRoutes.js
// Rutas para gestión de bandas/artistas

const express = require('express');
const router = express.Router();
const bandaController = require('../controllers/bandaController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configuración de multer para uploads
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

// GET /api/bandas - Obtener todas las bandas
router.get('/', bandaController.obtenerBandas);

// GET /api/bandas/instrumentos - Obtener catálogo de instrumentos
router.get('/instrumentos', bandaController.obtenerInstrumentos);

// GET /api/bandas/buscar?q=... - Buscar bandas por nombre
router.get('/buscar', bandaController.buscarBandas);

// GET /api/bandas/sync-logos - Sincronizar logos del filesystem con BD (público)
router.get('/sync-logos', bandaController.syncLogos);

// GET /api/bandas/sync-flyers - Sincronizar flyers del filesystem con BD (público)
router.get('/sync-flyers', bandaController.syncFlyers);

// POST /api/bandas/upload - Subir logo (público, sin autenticación)
router.post('/upload', upload.single('logo'), bandaController.uploadLogo);

// GET /api/bandas/:id - Obtener banda específica
router.get('/:id', bandaController.obtenerBandaPorId);

// POST /api/bandas - Crear nueva banda (requiere autenticación)
router.post('/', protect, bandaController.crearBanda);

// PUT /api/bandas/:id - Actualizar banda (requiere autenticación)
router.put('/:id', protect, bandaController.actualizarBanda);

// DELETE /api/bandas/:id - Eliminar banda (requiere autenticación)
router.delete('/:id', protect, bandaController.eliminarBanda);

module.exports = router;
