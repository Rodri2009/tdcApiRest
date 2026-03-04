const puppeteer = require('puppeteer');

/**
 * Lanza el navegador Chromium con Puppeteer
 * @param {Object} config - Configuración del navegador
 * @param {string} config.userDataDir - Directorio del perfil de usuario
 * @param {boolean} config.headless - Modo headless (true/false)
 * @returns {Promise<Object>} Instancia del navegador
 */
async function launchBrowser(config) {
    try {
        console.log('[Browser Manager] Iniciando navegador Chromium...');

        // Construir args para Chromium (controla fullscreen con BROWSER_FULLSCREEN=true)
        const chromiumArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-plugins',
            // NO maximizado - permitir interfaz visible
            '--window-size=1920,1000',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--force-device-scale-factor=1',
            '--high-dpi-support=1',
            '--disable-low-end-device-mode',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--metrics-recording-only',
            '--no-crash-upload',
            // Forzar modo escritorio agresivamente
            '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-tools',
            '--disable-component-extensions-with-background-pages',
            '--disable-background-networking',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-ipc-flooding-protection'
        ];

        // Añadir fullscreen solo si se solicita vía env
        if (process.env.BROWSER_FULLSCREEN === 'true') {
            chromiumArgs.unshift('--start-fullscreen');
        }

        const browserConfig = {
            headless: false,  // Usar display :1 de Xvfb para GUI (Debian tiene xvfb instalado)
            userDataDir: config.userDataDir,
            args: chromiumArgs,
            defaultViewport: {
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                isLandscape: true
            }
        };

        const browser = await puppeteer.launch(browserConfig);
        console.log('✅ [Browser Manager] Navegador iniciado correctamente (headless=false con display :1 - Xvfb)');

        return browser;
    } catch (error) {
        console.error('❌ [Browser Manager] Error al iniciar navegador:', error.message);
        throw error;
    }
}

/**
 * Cierra el navegador correctamente
 * @param {Object} browser - Instancia del navegador
 */
async function closeBrowser(browser) {
    try {
        if (browser) {
            console.log('[Browser Manager] Cerrando navegador...');
            await browser.close();
            console.log('✅ [Browser Manager] Navegador cerrado correctamente');
        }
    } catch (error) {
        console.error('❌ [Browser Manager] Error al cerrar navegador:', error.message);
    }
}

module.exports = {
    launchBrowser,
    closeBrowser
};
