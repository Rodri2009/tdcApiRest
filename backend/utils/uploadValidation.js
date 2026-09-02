const fs = require('fs');
const path = require('path');

const MAX_UPLOAD_SIZE = {
    jpg: 5 * 1024 * 1024,
    jpeg: 5 * 1024 * 1024,
    png: 5 * 1024 * 1024
};

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

const isSuspiciousName = (name) => {
    if (!name || typeof name !== 'string') return true;
    const normalized = name.trim();
    if (!normalized || normalized.includes('..') || normalized.includes('/') || normalized.includes('\\')) return true;
    if (/\s{2,}/.test(normalized)) return true;
    if (/\.(php|php[0-9]+|asp|aspx|jsp|js|html|htm|svg|xml|exe|bat|cmd|sh|py)$/i.test(normalized)) return true;
    if (/[^a-zA-Z0-9._-]/.test(normalized)) return true;
    return false;
};

const sanitizeFileName = (originalName) => {
    const baseName = (originalName || '').trim();
    if (isSuspiciousName(baseName)) {
        throw new Error('Nombre de archivo sospechoso o inválido');
    }

    const ext = path.extname(baseName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error('Solo se permiten archivos JPG, JPEG y PNG');
    }

    const safeBase = path.basename(baseName, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 80) || 'upload';

    return `${safeBase}${ext}`;
};

const detectImageKind = (buffer) => {
    if (!buffer || buffer.length < 8) return null;

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'jpg';
    }

    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return 'png';
    }

    return null;
};

const validateUploadFile = (buffer, originalName, mimeType) => {
    try {
        const mime = (mimeType || '').toLowerCase();
        const ext = path.extname((originalName || '').trim() || '').toLowerCase();

        if (!ALLOWED_MIME_TYPES.has(mime)) {
            return { ok: false, reason: 'Tipo MIME no permitido' };
        }

        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return { ok: false, reason: 'Extensión no permitida' };
        }

        const detected = detectImageKind(buffer);
        if (!detected) {
            return { ok: false, reason: 'Archivo no coincide con un JPG o PNG válido' };
        }

        const normalizedExt = `.${detected}`;
        if (
            (mime === 'image/jpeg' && detected !== 'jpg') ||
            (mime === 'image/png' && detected !== 'png')
        ) {
            return { ok: false, reason: 'Tipo MIME y contenido no coinciden' };
        }

        if (buffer.length > MAX_UPLOAD_SIZE[detected]) {
            return { ok: false, reason: `Archivo supera el máximo permitido (${MAX_UPLOAD_SIZE[detected] / (1024 * 1024)}MB)` };
        }

        return {
            ok: true,
            extension: normalizedExt,
            detectedType: detected,
            safeName: sanitizeFileName(originalName)
        };
    } catch (err) {
        return { ok: false, reason: err.message || 'Archivo inválido' };
    }
};

const ensureDirectory = (dirPath) => {
    fs.mkdirSync(dirPath, { recursive: true });
};

module.exports = {
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES,
    MAX_UPLOAD_SIZE,
    sanitizeFileName,
    validateUploadFile,
    ensureDirectory,
    detectImageKind
};
