const path = require('path');
const fs = require('fs');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

/**
 * Auto-recuperar URL del flyer si existe en disco pero no en BD
 * Busca archivos con patrón: solicitud_${solicitudId}.png o solicitud_${solicitudId}.jpg
 * @param {number} solicitudId - ID de la solicitud
 * @returns {string|null} URL recuperada o null si no existe
 */
const tryRecoverFlyerUrl = (solicitudId) => {
    if (!solicitudId) return null;

    try {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'flyers');
        if (!fs.existsSync(uploadDir)) return null;

        const files = fs.readdirSync(uploadDir);
        // Buscar archivos que coincidan con: solicitud_${id}.png o solicitud_${id}.jpg
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

// Devuelve la URL pública del archivo subido
const uploadFlyerPublic = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No se recibió archivo.' });
        const finalFilename = req.file.filename;
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
