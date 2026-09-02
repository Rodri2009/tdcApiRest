const path = require('path');
const fs = require('fs');
const { logVerbose, logError, logWarning } = require('../lib/debugFlags');
const { validateUploadFile } = require('../utils/uploadValidation');

const tryRecoverFlyerUrl = (solicitudId) => {
    if (!solicitudId) return null;

    try {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'flyers');
        if (!fs.existsSync(uploadDir)) return null;

        const files = fs.readdirSync(uploadDir);
        const pattern = `solicitud_${solicitudId}.`;
        const found = files.find(f => f.startsWith(pattern));

        if (found) {
            const recoveredUrl = `/uploads/flyers/${found}`;
            logVerbose(`[UPLOADS] ✓ Flyer auto-recuperado para solicitud ${solicitudId}: ${recoveredUrl}`);
            return recoveredUrl;
        }
    } catch (err) {
        logWarning(`[UPLOADS] Error al intentar recuperar flyer para solicitud ${solicitudId}:`, err.message);
    }

    return null;
};

const uploadFlyerPublic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió archivo.' });
        }

        const fileBuffer = fs.readFileSync(req.file.path);
        const validation = validateUploadFile(fileBuffer, req.file.originalname, req.file.mimetype);

        if (!validation.ok) {
            fs.unlink(req.file.path, () => { });
            return res.status(400).json({ message: validation.reason });
        }

        const finalFilename = validation.safeName;
        const finalPath = path.join(path.dirname(req.file.path), finalFilename);

        if (req.file.filename !== finalFilename) {
            fs.renameSync(req.file.path, finalPath);
        }

        const url = `/uploads/flyers/${finalFilename}`;
        logVerbose(`[UPLOADS] ✓ Flyer subido: ${url}`);
        return res.status(200).json({ url });
    } catch (err) {
        logError('Error subiendo flyer:', err);
        return res.status(500).json({ message: 'Error subiendo flyer.' });
    }
};

module.exports = {
    uploadFlyerPublic,
    tryRecoverFlyerUrl
};
