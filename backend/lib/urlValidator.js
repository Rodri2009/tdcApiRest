/**
 * Valida que la URL actual no haya sido redirigida a una página de error/bloqueo
 * Detecta redirecciones comunes causadas por:
 * - Rate limiting
 * - IP baneada
 * - Sesión expirada
 */
async function validateCurrentUrl(page, expectedPath = '') {
    try {
        const currentUrl = page.url();

        if (!currentUrl) {
            return {
                valid: false,
                reason: 'URL no disponible',
                currentUrl: null,
                expectedPath
            };
        }

        // allow bypass via env var for development/debug
        if (process.env.SKIP_URL_VALIDATION === 'true') {
            console.log('[urlValidator] SKIP_URL_VALIDATION=true, skipping checks (currentUrl', currentUrl, ')');
            return { valid: true, currentUrl, expectedPath };
        }

        // Patrones de bloqueo/error comunes
        const blockedPatterns = [
            '/error',
            '/blocked',
            '/banned',
            '/suspended',
            '/challenge',
            '/security',
            '/login',
            'cloudflare',
            'captcha',
            '403', // Forbidden
            '429', // Too Many Requests
            '503'  // Service Unavailable
        ];

        // Verificar si la URL contiene patrones de bloqueo
        const isBlocked = blockedPatterns.some(pattern =>
            currentUrl.toLowerCase().includes(pattern)
        );

        if (isBlocked) {
            console.warn('[urlValidator] Bloqueo detectado, currentUrl=', currentUrl);
            return {
                valid: false,
                reason: `Posible bloqueo detectado: URL contiene patrón peligroso`,
                currentUrl,
                expectedPath,
                detectedPattern: blockedPatterns.find(p =>
                    currentUrl.toLowerCase().includes(p)
                )
            };
        }

        // Si se especifica expectedPath, verificar que estamos en la ruta correcta
        if (expectedPath && !currentUrl.includes(expectedPath)) {
            return {
                valid: false,
                reason: `URL inesperada - posible redirección`,
                currentUrl,
                expectedPath
            };
        }

        // También chequear el status HTTP del documento
        const status = await page.evaluate(() => {
            // En el contexto del navegador, podemos acceder al estado
            // pero no siempre. Devolvemos -1 si no se puede obtener.
            return document.readyState === 'complete' ? 200 : -1;
        });

        return {
            valid: true,
            currentUrl,
            expectedPath,
            status
        };

    } catch (err) {
        return {
            valid: false,
            reason: `Error al validar URL: ${err.message}`,
            error: err.message
        };
    }
}

module.exports = {
    validateCurrentUrl
};
