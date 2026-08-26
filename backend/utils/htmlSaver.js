/**
 * HtmlSaver - Guarda snapshots HTML de páginas Puppeteer para diagnóstico
 */
const fs = require('fs');
const path = require('path');

class HtmlSaver {
    /**
     * @param {string} baseDir - Directorio base donde guardar los snapshots
     */
    constructor(baseDir = './pages-downloaded') {
        this.baseDir = baseDir;
        try {
            if (!fs.existsSync(this.baseDir)) {
                fs.mkdirSync(this.baseDir, { recursive: true });
            }
        } catch (e) {
            console.warn('[HtmlSaver] No se pudo crear directorio:', e.message);
        }
    }

    /**
     * Guarda el HTML actual de la página con una etiqueta descriptiva
     * @param {Object} page - Puppeteer Page
     * @param {string} label - Etiqueta para el nombre del archivo
     */
    async savePage(page, label = 'snapshot') {
        try {
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
