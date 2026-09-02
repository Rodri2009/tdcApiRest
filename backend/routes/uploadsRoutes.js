const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const uploadsController = require('../controllers/uploadsController');
const { logVerbose, logWarning } = require('../lib/debugFlags');
const { sanitizeFileName, validateUploadMetadata, ensureDirectory, MAX_UPLOAD_SIZE } = require('../utils/uploadValidation');

const UPLOAD_BASE_DIR = path.join(__dirname, '..', 'uploads', 'flyers');
ensureDirectory(UPLOAD_BASE_DIR);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            ensureDirectory(UPLOAD_BASE_DIR);
            cb(null, UPLOAD_BASE_DIR);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        try {
            const solicitudId = req.query.solicitudId;
            const validated = validateUploadMetadata(file.originalname, file.mimetype);
            if (!validated.ok) {
                return cb(new Error(validated.reason));
            }

            const safeName = sanitizeFileName(file.originalname);
            const ext = path.extname(safeName).toLowerCase();
            const finalName = solicitudId
                ? `solicitud_${solicitudId}${ext}`
                : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

            logVerbose(`[UPLOADS] Flyer guardado: ${finalName}`);
            cb(null, finalName);
        } catch (err) {
            logWarning('[UPLOADS] Error al preparar nombre de archivo', err.message);
            cb(err);
        }
    }
});

const fileFilter = (req, file, cb) => {
    try {
        const validation = validateUploadMetadata(file.originalname, file.mimetype);
        if (!validation.ok) {
            return cb(new Error(validation.reason), false);
        }
        cb(null, true);
    } catch (err) {
        cb(new Error('Archivo inválido'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_UPLOAD_SIZE.jpg,
        files: 1
    }
});

router.post('/flyers', upload.single('flyer'), uploadsController.uploadFlyerPublic);

module.exports = router;
