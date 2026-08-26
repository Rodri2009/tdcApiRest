/**
 * Dual Service Manager
 * Integra Mercado Pago + WhatsApp en un único servidor
 * Con control de instancias paralelas y manejo robusto de procesos
 */

const ProcessLockManager = require('./processLockManager');
const { logError, logSuccess, logWarning } = require('./debugFlags');

class DualServiceManager {
    constructor(options = {}) {
        this.port = options.port || 9999;
        this.mpPageRef = null;
        this.waPageRef = null;
        this.mpBrowserRef = null;
        this.waBrowserRef = null;
        this.lockManager = new ProcessLockManager({
            port: this.port,
            pidFile: options.pidFile || `/tmp/server-${this.port}.pid`
        });

        this.services = {
            mp: { ready: false, error: null },
            wa: { ready: false, error: null }
        };
    }

    /**
     * Inicia el servidor con lock exclusivo
     * @returns {Promise<boolean>} true si se pudo inicializar, false si hay otra instancia
     */
    async initialize() {
        try {
            // 1. Verificar que no hay otra instancia corriendo
            const locked = await this.lockManager.acquireLock();
            if (!locked) {
                logError('❌ No se pudo adquirir lock. Hay otra instancia del servidor corriendo.');
                return false;
            }

            logSuccess(`✅ Lock adquirido. Iniciando servidor en puerto ${this.port}...`);

            // 2. Registrar cleanup en señales del SO
            this.setupSignalHandlers();

            // 3. Inicializar servicios en background (no bloquean la API)
            this.initializeServicesBg();

            return true;

        } catch (error) {
            logError(`Error en initialize: ${error.message}`);
            return false;
        }
    }

    /**
     * Inicializa los servicios en background (sin bloquear)
     */
    initializeServicesBg() {
        // Mercado Pago (si está disponible)
        setTimeout(() => {
            this.initializeMercadoPago().catch(err => {
                logWarning(`⚠️ Mercado Pago no disponible: ${err.message}`);
                this.services.mp.error = err.message;
            });
        }, 1000);

        // WhatsApp (si está disponible)
        setTimeout(() => {
            this.initializeWhatsApp().catch(err => {
                logWarning(`⚠️ WhatsApp no disponible: ${err.message}`);
                this.services.wa.error = err.message;
            });
        }, 2000);
    }

    /**
     * Inicializa Mercado Pago
     * @returns {Promise<void>}
     */
    async initializeMercadoPago() {
        try {
            logSuccess('🔄 Inicializando Mercado Pago...');

            // Aquí iría la lógica de inicialización de MP
            // Por ahora es un placeholder

            this.services.mp.ready = true;
            logSuccess('✅ Mercado Pago listo');
        } catch (error) {
            this.services.mp.error = error.message;
            throw error;
        }
    }

    /**
     * Inicializa WhatsApp
     * @returns {Promise<void>}
     */
    async initializeWhatsApp() {
        try {
            logSuccess('🔄 Inicializando WhatsApp...');

            // Aquí iría la lógica de inicialización de WA
            // Por ahora es un placeholder

            this.services.wa.ready = true;
            logSuccess('✅ WhatsApp listo');
        } catch (error) {
            this.services.wa.error = error.message;
            throw error;
        }
    }

    /**
     * Setupea manejadores de señales para cleanup
     */
    setupSignalHandlers() {
        const cleanup = async () => {
            logWarning('⚠️ Señal de cierre recibida. Limpiando recursos...');

            try {
                // Cerrar navegadores
                if (this.mpBrowserRef) {
                    await this.mpBrowserRef.close();
                    logSuccess('✅ Navegador MP cerrado');
                }

                if (this.waBrowserRef) {
                    await this.waBrowserRef.close();
                    logSuccess('✅ Navegador WA cerrado');
                }
            } catch (err) {
                logError(`Error cerrando navegadores: ${err.message}`);
            }

            // Liberar lock
            this.lockManager.releaseLock();

            logSuccess('✅ Cleanup completado. Terminando servidor.');
            process.exit(0);
        };

        process.on('SIGTERM', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGHUP', cleanup);
    }

    /**
     * Obtiene el estado de los servicios
     * @returns {Object}
     */
    getStatus() {
        return {
            port: this.port,
            lock: this.lockManager.getStatus(),
            services: this.services,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Establece referencias a páginas/navegadores
     */
    setMercadoPagoRef(browser, page) {
        this.mpBrowserRef = browser;
        this.mpPageRef = page;
    }

    setWhatsAppRef(browser, page) {
        this.waBrowserRef = browser;
        this.waPageRef = page;
    }

    /**
     * Obtiene referencias
     */
    getMercadoPagoPage() {
        return this.mpPageRef;
    }

    getWhatsAppPage() {
        return this.waPageRef;
    }
}

// Instancia global singleton
const globalServiceManager = new DualServiceManager();

module.exports = {
    DualServiceManager,
    globalServiceManager
};
