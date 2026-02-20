const path = require('path');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

// Devuelve la URL pública del archivo subido
const uploadFlyerPublic = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No se recibió archivo.' });
        const finalFilename = req.file.filename;
        const url = `/uploads/flyers/${finalFilename}`;
        return res.status(200).json({ url });
    } catch (err) {
        logError('Error subiendo flyer:', err);
        return res.status(500).json({ message: 'Error subiendo flyer.' });
    }
};

module.exports = {
    uploadFlyerPublic
};
