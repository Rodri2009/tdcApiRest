/**
 * HtmlSaver - Guarda snapshots HTML de páginas Puppeteer para diagnóstico.
 * Los archivos antiguos se eliminan automáticamente a las 24 horas para evitar
 * acumulación de artefactos de depuración.
 */
const fs = require('fs');
const path = require('path');

class HtmlSaver {
    /**
     * @param {string} baseDir - Directorio base donde guardar los snapshots
     * @param {number} maxAgeMs - Edad máxima permitida antes de purgar archivos
     */
    constructor(baseDir = './pages-downloaded', maxAgeMs = 24 * 60 * 60 * 1000) {
        this.baseDir = baseDir;
        this.maxAgeMs = maxAgeMs;
        try {
            if (!fs.existsSync(this.baseDir)) {
                fs.mkdirSync(this.baseDir, { recursive: true });
            }
            this.cleanupOldFiles();
        } catch (e) {
            console.warn('[HtmlSaver] No se pudo crear directorio:', e.message);
        }
    }

    /**
     * Elimina snapshots más viejos de 24hs.
     */
    cleanupOldFiles() {
        if (!fs.existsSync(this.baseDir)) return;

        try {
            const now = Date.now();
            const files = fs.readdirSync(this.baseDir);

            for (const file of files) {
                const fullPath = path.join(this.baseDir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isFile() && (now - stat.mtimeMs) > this.maxAgeMs) {
                    fs.unlinkSync(fullPath);
                    console.log(`[HtmlSaver] Archivo expirado eliminado: ${fullPath}`);
                }
            }
        } catch (error) {
            console.warn('[HtmlSaver] Error limpiando archivos viejos:', error.message);
        }
    }

    /**
     * Guarda el HTML actual de la página con una etiqueta descriptiva
     * @param {Object} page - Puppeteer Page
     * @param {string} label - Etiqueta para el nombre del archivo
     */
    async savePage(page, label = 'snapshot') {
        try {
            this.cleanupOldFiles();

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${label}-${timestamp}.html`;
            const filepath = path.join(this.baseDir, filename);
            const html = await page.content();
            fs.writeFileSync(filepath, html, 'utf-8');
            console.log(`[HtmlSaver] Snapshot guardado: ${filepath}`);
            return filepath;
        } catch (error) {
            console.warn('[HtmlSaver] Error guardando snapshot:', error.message);
            return null;
        }
    }
}

module.exports = HtmlSaver;
