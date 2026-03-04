const sessionValidator = require('../utils/sessionValidator');

const LOGIN_URL = 'https://www.mercadolibre.com/jms/mla/lgz/login?platform_id=MP&go=https%3A%2F%2Fwww.mercadopago.com.ar%2F&loginType=explicit';
const LOGIN_TIMEOUT = 120000; // 120 segundos

/**
 * Inicializa la sesión de Mercado Pago
 * Verifica si existe sesión activa, si no, pide al usuario que inicie sesión manualmente
 * @param {Object} page - Página de Puppeteer
 * @param {Object} config - Configuración del navegador
 */
async function initialize(page, config) {
    try {
        console.log('[Mercado Pago] Iniciando proceso de autenticación...');

        // Primero, intenta validar si ya hay una sesión activa
        const hasActiveSession = await sessionValidator.validateSession(page);

        if (hasActiveSession) {
            console.log('✅ [Mercado Pago] Sesión activa detectada - sistema permanecerá activo.');
            // Navegar automáticamente a la sección de actividades
            await navigateToActivities(page);
        } else {
            // No hay sesión activa, navega a la URL de login
            console.log('[Mercado Pago] Sesión no detectada. Navegando a página de login...');
            await page.goto(LOGIN_URL, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Forzar viewport de escritorio para evitar responsive design
            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                isLandscape: true
            });

            // Emular user agent de escritorio
            await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

            // Ejecutar script para forzar modo escritorio
            await page.evaluate(() => {
                // Forzar viewport meta tag
                const viewport = document.querySelector('meta[name=viewport]');
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                }

                // Simular resize de ventana para forzar redibujo
                window.dispatchEvent(new Event('resize'));
            });

            // Mostrar mensaje al usuario
            console.log('');
            console.log('⚠️  [Mercado Pago] Sesión no detectada. Por favor, completa el inicio de sesión manualmente en la ventana del navegador. Tienes 120 segundos.');
            console.log('💡 La página está configurada en modo escritorio (1920x1080).');
            console.log('');

            // Espera a que se establezca la sesión
            // Usa waitForFunction para verificar cambios en la página que indiquen un login exitoso
            await waitForSessionEstablishment(page);

            // Verifica nuevamente que la sesión está activa
            const sessionConfirmed = await sessionValidator.validateSession(page);

            if (sessionConfirmed) {
                console.log('✅ [Mercado Pago] Sesión activa detectada.');
                // Navegar automáticamente a la sección de actividades
                await navigateToActivities(page);
            } else {
                throw new Error('La sesión no se estableció en el tiempo límite');
            }
        }

    } catch (error) {
        console.error('❌ [Mercado Pago] Error en inicialización:', error.message);
        throw error;
    }
}

/**
 * Espera a que se establezca la sesión observando cambios en la página
 * @param {Object} page - Página de Puppeteer
 * @private
 */
async function waitForSessionEstablishment(page) {
    try {
        // Intenta esperar a que aparezca un elemento que indica sesión activa
        // O que la URL cambie significativamente
        // Con timeout de LOGIN_TIMEOUT ms

        await Promise.race([
            // Opción 1: Espera a que aparezca un elemento de usuario
            page.waitForFunction(
                () => {
                    const selectors = [
                        '.user-profile',
                        '[data-testid="user-menu"]',
                        '.andes-avatar',
                        '.navbar__account'
                    ];
                    return selectors.some(sel => document.querySelector(sel) !== null);
                },
                { timeout: LOGIN_TIMEOUT }
            ).catch(() => null),

            // Opción 2: Espera a un cambio significativo en el contenido
            page.waitForFunction(
                () => {
                    const content = document.body.innerHTML;
                    return content.includes('logout') || content.includes('Mi cuenta');
                },
                { timeout: LOGIN_TIMEOUT }
            ).catch(() => null),

            // Opción 3: Espera a que la URL cambie (redirección después de login)
            page.waitForFunction(
                () => !window.location.href.includes('login'),
                { timeout: LOGIN_TIMEOUT }
            ).catch(() => null)
        ]);

        await page.waitForTimeout(2000); // Espera adicional para que se estabilice
        console.log('[Mercado Pago] Sesión establecida, validando...');

    } catch (error) {
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
            throw new Error(`Timeout esperando autenticación (${LOGIN_TIMEOUT / 1000} segundos)`);
        }
        throw error;
    }
}

/**
 * Navega automáticamente a la sección de actividades de Mercado Pago
 * @param {Object} page - Página de Puppeteer
 * @private
 */
async function navigateToActivities(page) {
    try {
        console.log('[Mercado Pago] Navegando a la sección de actividades...');

        // Esperar a que la página cargue completamente
        await page.waitForTimeout(3000);

        // Intentar hacer clic en el elemento de actividades usando múltiples selectores
        const activitiesSelectors = [
            '#ACTIVITIES',  // Por ID
            'a[href*="/activities"]',  // Por href
            '[data-label="ACTIVITIES"]',  // Por data-label
            '.navigation__sidebar__section-item[data-id="ACTIVITIES"]',  // Combinado
            'a.navigation__sidebar__section-item span:contains("Actividad")'  // Por texto
        ];

        let clicked = false;
        for (const selector of activitiesSelectors) {
            try {
                // Verificar si el elemento existe
                const element = await page.$(selector);
                if (element) {
                    // Verificar si es visible
                    const isVisible = await page.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
                    }, element);

                    if (isVisible) {
                        await element.click();
                        console.log(`[Mercado Pago] ✅ Clic en elemento de actividades: ${selector}`);
                        clicked = true;
                        break;
                    }
                }
            } catch (error) {
                // Continuar con el siguiente selector
                continue;
            }
        }

        if (!clicked) {
            // Si no se pudo hacer clic, intentar navegar directamente a la URL
            console.log('[Mercado Pago] Intentando navegación directa a /activities...');
            await page.goto('https://www.mercadopago.com.ar/activities', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            console.log('[Mercado Pago] ✅ Navegación directa a actividades completada');
        }

        // Esperar a que cargue la página de actividades
        await page.waitForTimeout(3000);

        // Verificar que estamos en la página correcta
        const currentUrl = page.url();
        if (currentUrl.includes('/activities')) {
            console.log('[Mercado Pago] ✅ Navegación a actividades completada exitosamente');
            console.log('[Mercado Pago] 📊 Lista de transacciones debería estar visible');
        } else {
            console.log('[Mercado Pago] ⚠️  Navegación completada pero URL no contiene /activities');
        }

    } catch (error) {
        console.warn('[Mercado Pago] Error al navegar a actividades:', error.message);
        // No lanzar error, continuar con el sistema
    }
}

module.exports = {
    initialize
};
