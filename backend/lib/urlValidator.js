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
        const allowedAuthRedirectPatterns = [
            /(?:^|\.)mercadolibre\.com(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%-]*)*\/(?:login|auth|user-legal-id-social)(?:[/?#]|$)/i,
            /(?:^|\.)mercadopago\.com(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%-]*)*\/(?:login|auth|security)(?:[/?#]|$)/i,
            /(?:^|\.)mercadolibre\.com.*\/login\//i,
            /(?:^|\.)mercadolibre\.com.*\/user-legal-id-social/i,
            /(?:^|\.)mercadolibre\.com.*\/msl\/login\//i,
            /(?:^|\.)mercadolibre\.com.*\/jms\//i
        ];
        const isAuthRedirect = allowedAuthRedirectPatterns.some(pattern => pattern.test(currentUrl));
        // Patrones de bloqueo/error comunes.
        // Usamos coincidencias con límites de path para evitar falsos positivos en hashes,
        // tokens o URLs de login de Mercadopago.
        const blockedPatterns = [
            /\/error(?:\/|$)/i,
            /\/blocked(?:\/|$)/i,
            /\/banned(?:\/|$)/i,
            /\/suspended(?:\/|$)/i,
            /\/challenge(?:\/|$)/i,
            /\/security(?:\/|$)/i,
            /(?:^|\.)cloudflare(?:\/|$)/i,
            /(?:^|\/)captcha(?:\/|$)/i,
            /(?:^|\/)(?:403|429|503)(?:\/|$)/i
        ];

        // Verificar si la URL contiene patrones de bloqueo reales
        const isBlocked = blockedPatterns.some(pattern => pattern.test(currentUrl));

        if (isBlocked) {
            console.warn('[urlValidator] Bloqueo detectado, currentUrl=', currentUrl);
            return {
                valid: false,
                reason: `Posible bloqueo detectado: URL contiene patrón peligroso`,
                currentUrl,
                expectedPath,
                detectedPattern: blockedPatterns.find(p => p.test(currentUrl))?.toString() || null
            };
        }

        // Si se especifica expectedPath, verificar que estamos en la ruta correcta.
        // Permitimos redirecciones de autenticación conocidas de Mercado Libre/MP sin tratarlas como error.
        if (expectedPath && !currentUrl.includes(expectedPath) && !isAuthRedirect) {
            return {
                valid: false,
                reason: `URL inesperada - posible redirección`,
                currentUrl,
                expectedPath
            };
        }

        // También chequear el status HTTP del documento
        let status = -1;
        try {
            status = await Promise.race([
                page.evaluate(() => {
                    // En el contexto del navegador, podemos acceder al estado
                    // pero no siempre. Devolvemos -1 si no se puede obtener.
                    return document.readyState === 'complete' ? 200 : -1;
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('page.evaluate timeout')), 10000)
                )
            ]);
        } catch (evalErr) {
            // Si falla la evaluación (ej: timeout, contexto destruido), saltamos pero no fallamos
            // La URL ya fue validada arriba
            console.warn('[urlValidator] page.evaluate() falló durante status check:', evalErr.message);
            status = -1;
        }

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
