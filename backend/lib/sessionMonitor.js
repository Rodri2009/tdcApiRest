// sessionValidator lives in ../utils and may not be present in every
// environment (separado por commits, etc). Cargamos de forma defensiva y
// caemos a función trivial en caso de error para que el módulo pueda
// importarse sin fallar.
let validateSession;
try {
    ({ validateSession } = require('../utils/sessionValidator'));
} catch (err) {
    console.warn('[SessionMonitor] ⚠️  sessionValidator no disponible, usando stub');
    validateSession = async () => true; // siempre válido
}

/**
 * Monitor de sesión - detecta y restaura sesión perdida
 */
class SessionMonitor {
    constructor(page) {
        this.page = page;
        this.isSessionValid = true;
        this.lastCheckTime = null;
        this.checkIntervalMs = 600000; // Chequear cada 10 minutos (NO durante login)
        this.monitorIntervalId = null;
        this.errorCount = 0;
        this.isAuthenticating = true; // Está en fase de autenticación inicial
        this.authenticationTimeoutId = null;
    }

    /**
     * Inicia el monitoreo de sesión
     */
    async start() {
        console.log('[SessionMonitor] Iniciando monitoreo de sesión');
        console.log('[SessionMonitor] ⏳ En modo de autenticación - recovery deshabilitado por 10 minutos');

        // Validar sesión inmediatamente (SOLO VALIDAR, NO RECUPERAR)
        await this._checkSessionWithoutRecovery();

        // Luego chequear periódicamente
        this.monitorIntervalId = setInterval(
            () => this._checkSession(),
            this.checkIntervalMs
        );

        // Después de 10 minutos, permitir intentos de recuperación
        this.authenticationTimeoutId = setTimeout(() => {
            this.isAuthenticating = false;
            console.log('[SessionMonitor] ✅ Autenticación permitida - recovery habilitado');
        }, 600000); // 10 minutos
    }

    /**
     * Detiene el monitoreo
     */
    stop() {
        if (this.monitorIntervalId) {
            clearInterval(this.monitorIntervalId);
            this.monitorIntervalId = null;
        }
        if (this.authenticationTimeoutId) {
            clearTimeout(this.authenticationTimeoutId);
            this.authenticationTimeoutId = null;
        }
        console.log('[SessionMonitor] Monitoreo detenido');
    }

    /**
     * Chequea sesión SIN intentar recuperar (para autenticación inicial)
     */
    async _checkSessionWithoutRecovery() {
        try {
            const isValid = await validateSession(this.page);
            this.isSessionValid = isValid;
            this.lastCheckTime = new Date().toISOString();
            console.debug('[SessionMonitor] ✓ Sesión validada (sin recovery):', isValid);
        } catch (err) {
            console.error('[SessionMonitor] Error en validación inicial:', err.message);
        }
    }

    /**
     * Chequea si la sesión está potencialmente perdida
     */
    async _checkSession() {
        try {
            const wasValid = this.isSessionValid;

            // Intentar validar sesión
            const isValid = await validateSession(this.page);

            if (!isValid && wasValid) {
                // SESIÓN PERDIDA
                console.error('[SessionMonitor] ❌ SESIÓN PERDIDA DETECTADA');
                this.isSessionValid = false;
                this.errorCount++;

                // Notificar a subscribers
                this._broadcastSessionLost();

                // SOLO intentar recuperar si NO estamos en autenticación inicial
                if (!this.isAuthenticating && this.errorCount <= 3) {
                    console.log(`[SessionMonitor] Intento de recuperación ${this.errorCount}/3`);
                    await this._attemptRecover();
                } else if (this.isAuthenticating) {
                    console.log('[SessionMonitor] ⏸️ Recovery pausado - usuario en autenticación');
                }
            } else if (isValid && !wasValid) {
                // SESIÓN RESTAURADA
                console.log('[SessionMonitor] ✅ SESIÓN RESTAURADA');
                this.isSessionValid = true;
                this.errorCount = 0;
                this._broadcastSessionRestored();
            } else if (isValid) {
                // Todo bien
                console.debug('[SessionMonitor] ✓ Sesión activa');
                this.errorCount = 0;
            }

            this.lastCheckTime = new Date().toISOString();

        } catch (err) {
            console.error('[SessionMonitor] Error en chequeo:', err.message);
        }
    }

    /**
     * Intenta recuperar la sesión
     */
    async _attemptRecover() {
        try {
            console.log('[SessionMonitor] Navegando a home de Mercado Pago...');

            await this.page.goto('https://www.mercadopago.com.ar/home', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await this.page.waitForTimeout(3000);

            // Validar nuevamente
            const isRecovered = await validateSession(this.page);

            if (isRecovered) {
                console.log('[SessionMonitor] ✅ Sesión recuperada');
                this.isSessionValid = true;
                this.errorCount = 0;
                await this._navigateToActivities();
            } else {
                console.log('[SessionMonitor] ❌ No se pudo recuperar sesión');
            }

        } catch (err) {
            console.error('[SessionMonitor] Error en recuperación:', err.message);
        }
    }

    /**
     * Navega a la sección de actividades
     */
    async _navigateToActivities() {
        try {
            const activitiesSelectors = [
                '#ACTIVITIES',
                '[href*="/activities"]',
                'a:contains("Movimientos")',
                'a[href*="/activities"]'
            ];

            for (const selector of activitiesSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await element.click();
                        await this.page.waitForTimeout(3000);
                        console.log('[SessionMonitor] Navegación a actividades completada');
                        return;
                    }
                } catch (e) {
                    // Continuar con siguiente selector
                }
            }
        } catch (err) {
            console.error('[SessionMonitor] Error navegando a actividades:', err.message);
        }
    }

    /**
     * Broadcasts
     */
    _broadcastSessionLost() {
        console.log('[SessionMonitor] 📢 Notificando pérdida de sesión');
        // Aquí podríamos notificar a las transacciones watch u otros servicios
    }

    _broadcastSessionRestored() {
        console.log('[SessionMonitor] 📢 Notificando restauración de sesión');
    }

    /**
     * Obtener estado
     */
    getStatus() {
        return {
            isSessionValid: this.isSessionValid,
            lastCheckTime: this.lastCheckTime,
            errorCount: this.errorCount,
            isMonitoring: this.monitorIntervalId !== null
        };
    }
}

module.exports = SessionMonitor;
