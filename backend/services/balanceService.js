const { validateCurrentUrl } = require('../lib/urlValidator');
const metrics = require('../lib/metrics');

// In-memory cache (fallback) — devuelve último balance conocido si Puppeteer falla
let _lastBalanceCache = null;
let _lastBalanceTs = 0;
const BALANCE_TTL_MS = 45 * 1000; // 30-60s recommended (ajustable)

/**
 * Extrae el balance de Mercado Pago desde la página /banking/balance
 * El balance está embebido en JSON dentro de un <script> en el HTML
 */
async function scrapeBalance(page) {
    try {
        // Validar que estamos en la página correcta
        const urlValidation = await validateCurrentUrl(page, '/banking/balance');
        if (!urlValidation.valid) {
            throw new Error(`URL validation failed: ${urlValidation.reason}`);
        }

        // Diagnostics: log URL and presence of expected markers inside the page
        const urlNow = page.url();
        console.log('[BalanceService] scrapeBalance - currentUrl=', urlNow);
        const diagnostics = await page.evaluate(() => {
            return {
                hasWindowN: !!window._n,
                hasWindowNctxR: !!(window._n && window._n.ctx && window._n.ctx.r),
                hasAppProps: !!(window._n && window._n.ctx && window._n.ctx.r && window._n.ctx.r.appProps),
                hasFractionSelector: !!document.querySelector('[data-andes-money-amount-fraction], .andes-money-amount__fraction'),
                fractionText: document.querySelector('[data-andes-money-amount-fraction], .andes-money-amount__fraction')?.textContent?.trim() || null
            };
        });
        console.log('[BalanceService] diagnostics:', diagnostics);

        // 1) Intentar extraer estructura JS in-page (más robusto)
        try {
            const inPage = await page.evaluate(() => {
                try {
                    return window._n?.ctx?.r?.appProps?.pageProps?.myMoney || null;
                } catch (e) {
                    return null;
                }
            });

            if (inPage && inPage.result && inPage.result.balanceAvailable && inPage.result.balanceAvailable.result) {
                const amt = inPage.result.balanceAvailable.result.sections?.available?.amount;
                const value = amt?.value || {};
                const raw = value.raw ?? null;
                const fraction = value.fraction ?? null;
                const cents = value.cents ?? null;
                const currency = value.currencyId || amt?.currency || 'ARS';
                const symbol = value.symbol || (amt && amt.symbol) || '$';

                const available = raw != null
                    ? Number(raw)
                    : (fraction ? Number(String(fraction).replace(/\./g, '')) + (cents ? Number(cents) / 100 : 0) : null);

                if (available != null && !Number.isNaN(available)) {
                    const balance = {
                        available: Number(available),
                        currency,
                        symbol,
                        lastUpdated: new Date().toISOString(),
                        source: 'mercadopago'
                    };
                    console.log('[BalanceService] Balance extracted (in-page):', balance);
                    return balance;
                }
            }
        } catch (e) {
            // continuar a siguientes estrategias
            console.warn('[BalanceService] in-page extraction failed:', e && e.message);
        }

        // 2) Fallback: intentar extraer desde el DOM (selectores visibles)
        try {
            const domResult = await page.evaluate(() => {
                const fraction = document.querySelector('[data-andes-money-amount-fraction], .andes-money-amount__fraction')?.textContent?.trim() || null;
                const cents = document.querySelector('[data-andes-money-amount-cents], .andes-money-amount__cents')?.textContent?.trim() || null;
                const symbol = document.querySelector('[data-andes-money-amount-currency] .andes-money-amount__currency-symbol, .andes-money-amount__currency-symbol')?.textContent?.trim() || '$';
                return { fraction, cents, symbol };
            });

            console.log('[BalanceService] domResult:', domResult);

            // Parse visible text into numeric value (supports fraction + cents or fraction with separators)
            if (domResult && domResult.fraction) {
                const rawFraction = String(domResult.fraction).trim();
                const rawCents = domResult.cents ? String(domResult.cents).trim() : null;

                // Normalize fraction: handle thousand separators and decimal separators
                function normalizeNumberText(txt) {
                    if (!txt) return null;
                    // If contains both dot and comma, assume dot is thousand sep and comma is decimal
                    if (txt.indexOf('.') !== -1 && txt.indexOf(',') !== -1) {
                        return txt.replace(/\./g, '').replace(/,/g, '.');
                    }
                    // If contains comma but no dot, treat comma as decimal separator
                    if (txt.indexOf(',') !== -1 && txt.indexOf('.') === -1) {
                        return txt.replace(/,/g, '.');
                    }
                    // Otherwise remove thousand separators (commas) and keep dot as decimal
                    return txt.replace(/,/g, '');
                }

                const normFraction = normalizeNumberText(rawFraction);
                let available = null;

                if (rawCents) {
                    const centsOnly = rawCents.replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
                    const integerPart = normFraction ? normFraction.replace(/\./g, '') : '0';
                    available = Number(`${integerPart}.${centsOnly}`);
                } else if (normFraction) {
                    // Try to parse normalized fraction directly
                    available = Number(normFraction);
                }

                if (available != null && !Number.isNaN(available)) {
                    const balance = {
                        available,
                        currency: 'ARS',
                        symbol: domResult.symbol || '$',
                        lastUpdated: new Date().toISOString(),
                        source: 'mercadopago'
                    };
                    console.log('[BalanceService] Balance extracted (DOM):', balance);
                    return balance;
                }
            }
        } catch (e) {
            console.warn('[BalanceService] DOM extraction failed:', e && e.message);
        }

        // 3) Fallback antiguo: buscar JSON embebido con patrón legacy
        // Obtener el HTML
        const html = await page.content();

        // Buscar el JSON embebido que contiene el balance (legacy)
        const balanceMatch = html.match(/"balance":\s*\{[\s\S]*?"amount"\s*:\s*(\{[\s\S]*?\})/);

        if (balanceMatch && balanceMatch[1]) {
            try {
                const amountJson = JSON.parse(balanceMatch[1]);
                const available = amountJson?.value ? Number(`${String(amountJson.value.fraction).replace(/\./g, '')}.${amountJson.value.cents || '00'}`) : null;
                if (available != null && !Number.isNaN(available)) {
                    const balance = {
                        available,
                        currency: amountJson.currencyId || 'ARS',
                        symbol: amountJson.symbol || '$',
                        lastUpdated: new Date().toISOString(),
                        source: 'mercadopago'
                    };
                    console.log('[BalanceService] Balance extracted (legacy JSON):', balance);
                    return balance;
                }
            } catch (e) {
                /* fallthrough */
            }
        }

        // 4) Fallback local: utilizar "plantillas" HTML guardadas como copia de seguridad
        try {
            const fs = require('fs');
            const path = require('path');
            const plantillaDir = path.resolve(__dirname, '..', '..', 'plantillas');

            if (fs.existsSync(plantillaDir)) {
                const allFiles = await fs.promises.readdir(plantillaDir);
                const candidates = allFiles.filter(f => /banking[_\-]balance/i.test(f) || /banking\/balance/i.test(f));

                if (candidates.length > 0) {
                    // elegir la plantilla más reciente (por mtime)
                    let chosen = candidates[0];
                    let chosenMtime = 0;
                    for (const fname of candidates) {
                        try {
                            const st = await fs.promises.stat(path.join(plantillaDir, fname));
                            if ((st.mtimeMs || 0) > chosenMtime) {
                                chosen = fname;
                                chosenMtime = st.mtimeMs || 0;
                            }
                        } catch (e) { /* ignore */ }
                    }

                    const content = await fs.promises.readFile(path.join(plantillaDir, chosen), 'utf8');

                    // intentar extraer el objeto asignado a _n.ctx.r (JSON válido)
                    const ctxMatch = content.match(/_n\.ctx\.r\s*=\s*(\{[\s\S]*?\})\s*;/);
                    let parsed = null;

                    if (ctxMatch && ctxMatch[1]) {
                        try {
                            parsed = JSON.parse(ctxMatch[1]);
                        } catch (e) {
                            parsed = null;
                        }
                    }

                    // si no vino en el objeto completo, buscar directamente appProps
                    if (!parsed) {
                        const appMatch = content.match(/"appProps"\s*:\s*(\{[\s\S]*?\})\s*(,\s*"mainEntry"|\}|;)/);
                        if (appMatch && appMatch[1]) {
                            try {
                                parsed = { appProps: JSON.parse(appMatch[1]) };
                            } catch (e) {
                                parsed = null;
                            }
                        }
                    }

                    if (parsed && parsed.appProps && parsed.appProps.pageProps && parsed.appProps.pageProps.myMoney) {
                        const mp = parsed.appProps.pageProps.myMoney.result || parsed.appProps.pageProps.myMoney;
                        const amt = mp?.balanceAvailable?.result?.sections?.available?.amount || mp?.result?.balanceAvailable?.result?.sections?.available?.amount;
                        const value = amt?.value || {};
                        const raw = value.raw ?? null;
                        const fraction = value.fraction ?? null;
                        const cents = value.cents ?? null;

                        const available = raw != null
                            ? Number(raw)
                            : (fraction ? Number(String(fraction).replace(/\./g, '')) + (cents ? Number(cents) / 100 : 0) : null);

                        if (available != null && !Number.isNaN(available)) {
                            const balance = {
                                available: Number(available),
                                currency: value.currencyId || 'ARS',
                                symbol: value.symbol || '$',
                                lastUpdated: new Date().toISOString(),
                                source: 'plantilla'
                            };

                            // METRICS & LOGGING for plantilla fallback
                            try {
                                metrics.increment('fallback_balance');
                                metrics.set('fallback_balance_last_file', chosen);
                                metrics.set('fallback_balance_last_ts', new Date().toISOString());
                            } catch (e) { /* never fail extraction because of metrics */ }

                            console.info('[FallbackMetrics][Balance] plantilla used -> file=%s available=%s', chosen, balance.available);
                            return balance;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[BalanceService] plantilla fallback failed:', e && e.message);
        }

        throw new Error('Balance JSON no encontrado en la página');

        console.log(`[BalanceService] Balance extracted: $${balance.available} ${balance.currency}`);
        return balance;

    } catch (err) {
        console.error('[BalanceService] Error:', err.message);
        throw err;
    }
}

/**
 * Navega a la página de balance y actualiza si es necesario
 */
async function getBalance(page, fresh = false) {
    const maxAttempts = 3;
    const balanceSelector = '[data-andes-money-amount-fraction], .finance-money-section__amount';

    const pageLock = require('../lib/pageLock');

    // Si no se solicita fresh, devolver cache si está disponible y no expiró
    if (!fresh && _lastBalanceCache && (Date.now() - _lastBalanceTs) < BALANCE_TTL_MS) {
        console.log('[BalanceService] Returning cached balance (TTL ok)');
        return _lastBalanceCache;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // SERIALIZAMOS navegación + espera + extracción para evitar race conditions
            const result = await pageLock.runExclusive(async () => {
                const currentUrl = page.url();

                // Si fresh=true o no estamos en la página de balance, navegar
                if (fresh || !currentUrl.includes('/banking/balance')) {
                    console.log(`[BalanceService] Attempt ${attempt}: Navigating to /banking/balance...`);
                    await page.goto('https://www.mercadopago.com.ar/banking/balance', {
                        waitUntil: 'networkidle2',
                        timeout: 30000
                    });
                }

                // Esperar a que el balance se cargue en el DOM o que el objeto in-page esté listo
                const waitTimeout = 20000;
                try {
                    await Promise.race([
                        page.waitForSelector(balanceSelector, { timeout: waitTimeout }),
                        page.waitForFunction(() => !!(window._n && window._n.ctx && window._n.ctx.r && window._n.ctx.r.appProps), { timeout: waitTimeout })
                    ]);
                    console.log('[BalanceService] balance page appears to be rendered (selector or in-page object found)');
                } catch (err) {
                    console.warn('[BalanceService] balance page did not render within timeout, continuing to extraction attempts');
                    // esperar un breve periodo adicional antes de intentar extracción
                    await page.waitForTimeout(2000);
                }

                // Intentar extraer el balance
                return await scrapeBalance(page);
            });

            // Guardar en cache exitoso
            try {
                if (result && result.available != null) {
                    _lastBalanceCache = result;
                    _lastBalanceTs = Date.now();
                }
            } catch (e) {
                /* ignore cache errors */
            }

            return result;

        } catch (err) {
            const msg = String(err.message || err).toLowerCase();
            // Non-retriable errors: redirect / login / captcha
            if (msg.includes('url validation failed') || msg.includes('redirecci') || msg.includes('captcha') || msg.includes('login')) {
                // Si hay error de sesión/redirección, usar caché si está disponible
                if (_lastBalanceCache) {
                    console.warn(`[BalanceService] Session issue detected (${msg}). Returning cached balance.`);
                    return _lastBalanceCache;
                }
                throw new Error(err.message || msg);
            }

            // Treat Puppeteer timing/frame errors as transient and retry when possible
            if (msg.includes('requesting main frame too early') || msg.includes('cannot find context with specified id') || msg.includes('target closed') || msg.includes('navigation')) {
                console.warn(`[BalanceService] Transient puppeteer error detected: ${msg}. Will retry if attempts remain.`);
                if (attempt < maxAttempts) {
                    const backoffMs = 500 + Math.floor(Math.random() * 1500);
                    await page.waitForTimeout(backoffMs);
                    continue;
                }
            }

            console.warn(`[BalanceService] Attempt ${attempt} failed: ${err.message || msg}`);
            if (attempt < maxAttempts) {
                const backoffMs = 1000 + Math.floor(Math.random() * 2000);
                await page.waitForTimeout(backoffMs);
                continue;
            }

            // Si todas las tentativas fallan, usar caché como último recurso
            if (_lastBalanceCache) {
                console.warn(`[BalanceService] All attempts failed. Returning cached balance as fallback.`);
                return _lastBalanceCache;
            }

            throw new Error(err.message || msg);
        }
    }
}


/**
 * Precarga el caché de balance al iniciar el servidor
 * Se ejecuta una sola vez para tener datos disponibles
 * en caso de que haya errores de sesión posteriores
 */
async function warmupCache(page) {
    try {
        console.log('[BalanceService] Warmup: Precargando balance...');
        const balance = await getBalance(page, true);
        if (balance && balance.available != null) {
            console.log('[BalanceService] ✅ Warmup exitoso: balance precargado');
            return balance;
        }
    } catch (err) {
        // Silent fail — el warmup es un best-effort, no bloquea startup
        console.warn('[BalanceService] ⚠️ Warmup falló (best-effort):', err.message);
    }
    return null;
}

module.exports = {
    getBalance,
    scrapeBalance,
    warmupCache
};
