const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const uploadsController = require('../controllers/uploadsController');

// Storage específico para flyers: backend/uploads/flyers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'flyers');
        try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* noop */ }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = (file.originalname && file.originalname.indexOf('.') !== -1)
            ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase()
            : (file.mimetype === 'image/png' ? '.png' : '.jpg');
        const tmpName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, tmpName);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Solo JPEG/PNG.'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 3 * 1024 * 1024 } }); // 3 MB

// Público: subir flyer (campo multipart/form-data: 'flyer')
router.post('/flyers', upload.single('flyer'), uploadsController.uploadFlyerPublic);

module.exports = router;
