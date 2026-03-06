const { validateCurrentUrl } = require('../lib/urlValidator');
const metrics = require('../lib/metrics');
const crypto = require('crypto');

// In-memory cache (fallback) — devuelve última actividad conocida si Puppeteer falla
let _lastActivityCache = null;
let _lastActivityTs = 0;
const ACTIVITY_TTL_MS = 10 * 1000; // 5-10s recomendado

/**
 * Extrae la lista de transacciones de la página /activities
 * Intenta primero extraer desde el objeto in-page (más limpio), después DOM, luego plantilla
 */
async function scrapeActivity(page) {
    try {
        // Validar que estamos en la página correcta
        const urlValidation = await validateCurrentUrl(page, '/activities');
        if (!urlValidation.valid) {
            throw new Error(`URL validation failed: ${urlValidation.reason}`);
        }

        // STRATEGY 0: Intenta plantilla PRIMERO (datos más confiables cuando las plantillas están well-formed)
        let transactions = null;
        let usedPlantilla = false;

        try {
            const fs = require('fs');
            const path = require('path');
            const plantillaDir = path.resolve(__dirname, '..', '..', 'plantillas');

            if (fs.existsSync(plantillaDir)) {
                const files = await fs.promises.readdir(plantillaDir);
                const candidates = files.filter(f => /activities/i.test(f));

                if (candidates.length > 0) {
                    // elegir el más reciente
                    let chosen = candidates[0];
                    let chosenMtime = 0;
                    for (const fname of candidates) {
                        try {
                            const st = await fs.promises.stat(path.join(plantillaDir, fname));
                            if ((st.mtimeMs || 0) > chosenMtime) {
                                chosen = fname;
                                chosenMtime = st.mtimeMs || 0;
                            }
                        } catch (e) { }
                    }

                    try {
                        const content = await fs.promises.readFile(path.join(plantillaDir, chosen), 'utf8');

                        // Simple approach: find activities object start and extract large chunk
                        const activStart = content.indexOf('{"isFetching":false');
                        if (activStart >= 0) {
                            try {
                                // Extract a very large chunk
                                const chunkSize = 300000;
                                const chunk = content.substring(activStart, Math.min(activStart + chunkSize, content.length));

                                // Simple regex to find results wrap: just match "results":[... and get everything u until ]}
                                // Use a more lenient regex that captures multiple objects
                                const resultsStartIdx = chunk.indexOf('"results":[');
                                const resultsEndIdx = chunk.lastIndexOf(']}'); // Get the LAST ]} which closes the array

                                if (resultsStartIdx >= 0 && resultsEndIdx > resultsStartIdx) {
                                    // Extract from results to ]}
                                    const resultsStr = chunk.substring(
                                        resultsStartIdx + 11,  // Skip '"results":[' 
                                        resultsEndIdx         // Up to ]}
                                    ) + ']}';  // Close the array

                                    try {
                                        // Parse as array of objects
                                        const fullJson = '[' + chunk.substring(resultsStartIdx + 11, resultsEndIdx) + ']';
                                        const results = JSON.parse(fullJson);

                                        if (Array.isArray(results) && results.length > 0) {
                                            transactions = results.map((item, idx) => ({
                                                id: item.id || `activity-${idx}`,
                                                title: item.title || item.description || '',
                                                category: item.category || item.subCategory || '',
                                                description: item.description || '',
                                                amount: item.amount ? item.amount.fraction : null,
                                                currency: item.amount ? item.amount.currency_id : 'ARS',
                                                symbol: item.amount ? item.amount.symbol : '$',
                                                dateTime: item.grouperDate?.value || item.creationDate || null,
                                                creationDate: item.creationDate || null,
                                                type: item.entity || (item.category === 'transfers' ? 'transfer' : item.category),
                                                raw: JSON.stringify(item).slice(0, 300),
                                                _isStructured: true,
                                                _source: 'plantilla'
                                            }));
                                            usedPlantilla = true;
                                            console.info('[ActivityService] Extracted %d structured activities from plantilla', transactions.length);
                                        }
                                    } catch (parseErr) {
                                        console.debug('[ActivityService] Failed to parse plantilla results:', parseErr.message);
                                    }
                                } else {
                                    console.debug('[ActivityService] Could not find results array bounds in plantilla');
                                }
                            } catch (e) {
                                console.debug('[ActivityService] Plantilla extraction failed:', e.message);
                            }
                        }
                    } catch (e) {
                        console.debug('[ActivityService] Plantilla read failed:', e.message);
                    }
                }
            }
        } catch (e) {
            console.debug('[ActivityService] Plantilla strategy failed:', e.message);
        }

        // STRATEGY 1: If plantilla failed, try window._n.ctx.r.appProps.activities.results (en-page structured)
        if (!transactions || transactions.length === 0) {
            transactions = await page.evaluate(() => {
                try {
                    const appProps = window._n?.ctx?.r?.appProps;
                    const activities = appProps?.pageProps?.activities;
                    const results = activities?.results || [];

                    if (Array.isArray(results) && results.length > 0) {
                        return results.map((item, idx) => ({
                            id: item.id || `activity-${idx}`,
                            title: item.title || item.description || '',
                            category: item.category || item.subCategory || '',
                            description: item.description || '',
                            amount: item.amount ? item.amount.fraction : null,
                            currency: item.amount ? item.amount.currency_id : 'ARS',
                            symbol: item.amount ? item.amount.symbol : '$',
                            dateTime: item.grouperDate?.value || item.creationDate || null,
                            creationDate: item.creationDate || null,
                            type: item.entity || (item.category === 'transfers' ? 'transfer' : item.category),
                            raw: JSON.stringify(item).slice(0, 300),
                            _isStructured: true,
                            _source: 'in-page-json'
                        }));
                    }
                } catch (e) {
                    // fallthrough to DOM strategy
                }
                return null;
            });

            if (transactions && transactions.length > 0) {
                console.info('[ActivityService] Extracted %d structured activities from in-page object', transactions.length);
            } else {
                // 2) STRATEGY 2: Fallback a DOM scraping (menos confiable pero parseable)
                // Improved: be more selective to avoid date/filter selectors
                transactions = await page.evaluate(() => {
                    const items = [];

                    // More specific selectors: look for transaction rows/cards
                    const txElements = document.querySelectorAll(
                        '[data-testid="transaction-item"],' +                      // standard selector
                        '.activity-row,' +                                         // common class
                        '[class*="TransactionItem"],' +                            // react component
                        '[class*="rowfeed"],' +                                    // internal class
                        'div[role="button"][class*="transaction"],' +              // button-style transaction
                        'div[role="button"]:has([class*="amount"])'                // has amount child
                    );

                    txElements.forEach((el, idx) => {
                        try {
                            const text = el.innerText || el.textContent;

                            // FILTER: Ignore elements that are clearly NOT transactions
                            // Exclude filters, headers, empty rows, date selectors
                            if (!text || text.length < 10 || /^(período|hoy|ayer|filtro|origen|movimiento|imprimir|buscar|dev|aprob)/i.test(text.trim())) {
                                return; // Skip this element
                            }

                            // Also skip if it's mostly numbers/dates without other context
                            const onlyDatesNumbers = /^\d{1,2}[\s/.-]\w+[\s/.-]\d{2,4}$|^últ/i.test(text.trim());
                            if (onlyDatesNumbers) {
                                return;
                            }

                            const amountMatch = text.match(/([-+]?\s*[\d.,]+)\s*(ARS|\$)/);
                            const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}:\d{2}|de\s+\w+)/);

                            // Only add if we found at least a date or some reasonable content
                            if (!amountMatch && !dateMatch && text.length < 50) {
                                return; // Skip unclear entries
                            }

                            const txData = {
                                id: el.getAttribute('data-transaction-id') || `tx-${idx}`,
                                amount: amountMatch ? amountMatch[1].replace(/\s/g, '') : null,
                                currency: amountMatch ? amountMatch[2] : 'ARS',
                                dateTime: dateMatch ? dateMatch[1] : null,
                                raw: text.substring(0, 200),  // capture more context
                                type: text.includes('transferencia') ? 'transfer' :
                                    text.includes('pago') ? 'payment' :
                                        text.includes('ingreso') ? 'income' :
                                            text.includes('compra') ? 'purchase' : 'unknown',
                                _isStructured: false
                            };
                            items.push(txData);
                        } catch (e) {
                            // ignore per-item errors
                        }
                    });

                    return items;
                });

                if (transactions.length > 0) {
                    console.info('[ActivityService] Extracted %d transactions from DOM (fallback)', transactions.length);
                }
            }
        }

        // Ensure transactions is always an array
        if (!Array.isArray(transactions)) {
            transactions = [];
        }

        // -------------------------
        // Normalizar transacciones (backend)
        // - amount => number (sign heuristics, especially for structured data)
        // - dateTime => ISO when possible
        // - type    => mejor clasificación por keywords
        // -------------------------
        try {
            const monthMap = {
                enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
                julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
            };

            function parseNumberText(txt) {
                if (!txt) return null;
                const s = String(txt).trim();
                const hasDot = s.indexOf('.') !== -1;
                const hasComma = s.indexOf(',') !== -1;
                let clean = s;

                // Formato argentino: . = miles, , = decimales
                if (hasDot && hasComma) {
                    // Formato: 1.000,50 → 1000.50
                    clean = s.replace(/\./g, '').replace(/,/g, '.');
                } else if (hasDot && !hasComma) {
                    // Formato: 8.700 o 1.5
                    // En Argentina: punto típicamente es separador de miles, NO decimal
                    // Eliminar TODOS los puntos (son miles)
                    clean = s.replace(/\./g, '');
                } else if (!hasDot && hasComma) {
                    // Formato: 1,50 → 1.50
                    clean = s.replace(/,/g, '.');
                } else {
                    // Formato: 1000 o 1500 (sin separador)
                    clean = s;
                }

                clean = clean.replace(/[^0-9.\-]/g, '');
                const n = parseFloat(clean);
                return Number.isFinite(n) ? n : null;
            }

            function detectSignFromText(text, value, structuredData) {
                if (value == null) return null;
                const lc = (text || '').toLowerCase();

                // For structured data: check category/type
                if (structuredData) {
                    if (structuredData.category && /^(transfers|out|payment|purchase|compra|costo|fee|withdrawal|retiro)/i.test(structuredData.category)) {
                        return -Math.abs(value);
                    }
                    if (structuredData.category && /^(in_money|income|ingreso|topup|deposit|acreditacion|abono)/i.test(structuredData.category)) {
                        return Math.abs(value);
                    }
                }

                // negative indicators
                const neg = /transferencia enviada|transferencia-?enviada|pag(o|ó)|compra|enviad[oa]|debito|d[eé]bito|egreso|retirad[oa]/i;
                const pos = /ingreso|ingresad[oa]|acreditad[oa]|abonad[oa]|recibid[oa]|credito/i;
                if (neg.test(lc)) return -Math.abs(value);
                if (pos.test(lc)) return Math.abs(value);
                // fallback: if text contains a standalone '-' before amount, treat negative
                if (/\-\s*\$|\-\s*\d/.test(text)) return -Math.abs(value);
                return value;
            }

            function guessType(category, description, current) {
                const cat = (category || '').toLowerCase();
                const desc = (description || '').toLowerCase();
                const combined = cat + ' ' + desc;

                if (/transfer|enviad[oa]|enviada/i.test(combined)) return 'transfer';
                if (/pago|pag(o|ó)|abono|cobro|cargo|payment/i.test(combined)) return 'payment';
                if (/ingreso|acreditad|abonad|recibid|in_money|cvu/i.test(combined)) return 'income';
                if (/compra|venta|mastercard|visa|debito|purchase/i.test(combined)) return 'purchase';
                if (/retiro|extracci[oó]n|cajero|withdrawal/i.test(combined)) return 'withdrawal';
                return current || 'unknown';
            }

            function parseDateTimeFromText(dateStr, timeStr, creationDate) {
                // Priority: creationDate (ISO) > grouperDate → dateTime > fallback
                if (creationDate && /^\d{4}-\d{2}-\d{2}T/.test(creationDate)) {
                    return creationDate;
                }

                const monthMap = {
                    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
                    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
                };

                const timeMatch = (timeStr || '').match(/(\d{1,2}):(\d{2})/);
                const spanishDate = (dateStr || '').match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);

                const isoFromParts = (y, m, d, h, mn) => {
                    try { return new Date(y, m - 1, d, h || 0, mn || 0).toISOString(); } catch (e) { return null; }
                };

                if (spanishDate) {
                    const day = Number(spanishDate[1]);
                    const monthName = spanishDate[2].toLowerCase();
                    const month = monthMap[monthName] || (new Date()).getMonth() + 1;
                    const year = (new Date()).getFullYear();
                    if (timeMatch) {
                        const [h, mi] = timeMatch.slice(1, 3).map(Number);
                        return isoFromParts(year, month, day, h, mi);
                    }
                    return isoFromParts(year, month, day);
                }

                if (timeMatch) {
                    const [h, mi] = timeMatch.slice(1, 3).map(Number);
                    const now = new Date();
                    return isoFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate(), h, mi);
                }

                // fallback to dd/mm/yyyy patterns
                const dm = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (dm) {
                    const d = Number(dm[1]); const m = Number(dm[2]); const y = Number(dm[3]);
                    return isoFromParts(y, m, d);
                }

                return creationDate || null;
            }

            // Apply normalization in-place
            transactions = transactions.map(t => {
                // dom-precise: monto ya calculado correctamente, solo normalizar formato
                if (t._source === 'dom-precise') {
                    const amountValue = (t.amount !== null && t.amount !== undefined)
                        ? Number(Number(t.amount).toFixed(2))
                        : null;
                    const type = guessType('', t.description, null);
                    return {
                        ...t,
                        amount: amountValue,
                        currency: t.currency || 'ARS',
                        // Mantener date y time separados; también componer dateTime para compat
                        date: t.date || '',
                        time: t.time || '',
                        dateTime: t.date && t.time ? `${t.date} ${t.time}` : (t.date || t.time || null),
                        type,
                        name: (t.name || '').substring(0, 100),
                        title: (t.name || '').substring(0, 100),
                        description: (t.description || '').substring(0, 200)
                    };
                }

                // Para estrategias plantilla / in-page-json
                let amountValue = null;
                if (t._isStructured && t.amount) {
                    amountValue = parseNumberText(t.amount);
                    amountValue = detectSignFromText(t.title + ' ' + (t.description || ''), amountValue, { category: t.category });
                } else {
                    const full = (t.raw || '').replace(/\s+/g, ' ').trim();
                    const numRegex = /([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/g;
                    const nums = [];
                    let m;
                    while ((m = numRegex.exec(full)) !== null) nums.push(m[1]);
                    if (nums.length > 0) {
                        amountValue = parseNumberText(nums[0]);
                        amountValue = detectSignFromText(full, amountValue);
                    }
                }

                let dateTimeIso = null;
                if (t._isStructured) {
                    const gVal = t.dateTime;
                    dateTimeIso = parseDateTimeFromText(gVal, gVal, t.creationDate);
                } else {
                    dateTimeIso = parseDateTimeFromText(t.dateTime, t.dateTime, null);
                }

                const type = guessType(t.category || t.type, t.description || t.title, t.type);

                return {
                    ...t,
                    amount: amountValue !== null ? Number(Number(amountValue).toFixed(2)) : (t.amount || null),
                    currency: t.currency || 'ARS',
                    dateTime: dateTimeIso || t.dateTime || null,
                    date: t.date || '',
                    time: t.time || '',
                    type,
                    name: (t.name || t.title || t.description || '').substring(0, 100),
                    title: (t.title || t.description || '').substring(0, 100),
                    description: (t.description || '').substring(0, 200)
                };
            });

            console.info('[ActivityService] Normalized transactions — count=%d', transactions.length);
        } catch (e) {
            console.warn('[ActivityService] normalization failed:', e && e.message);
        }

        // -------------------------
        // DEDUPLICACIÓN AGRESIVA: eliminar fragmentos DOM del mismo movimiento
        // Estrategia: buscar por patrón de contenido + monto principal
        // (Mercado Pago a menudo reparte un movimiento en múltiples elementos DOM)
        // -------------------------

        // Paso 1: Filtrar transacciones sin monto o con montos muy pequeños que son fragmentos
        // Fragmentos típicos: 8, 9, 10, 11, 19, 20 ARS (números sueltos del DOM)
        const withAmount = transactions.filter(tx => {
            if (tx.amount === null || tx.amount === undefined) return false;
            // Eliminar amounts muy pequeños (<30 ARS) que probablemente son fragmentos
            const absAmount = Math.abs(tx.amount);
            if (absAmount < 30 && absAmount > 0) {
                console.debug('[ActivityService] Filtering out small fragment: %d (raw: %s)', tx.amount, tx.raw.substring(0, 40));
                return false;
            }
            return true;
        });

        // Paso 2: Agrupar por patrón contenido + monto principal
        // Extraer info significativa: palabras clave + monto
        const seen = new Map();
        const deduplicated = [];

        for (const tx of withAmount) {
            // Extraer patrón: palabras clave del raw
            const raw = (tx.raw || '').toLowerCase();
            const keywords = [];

            // Detectar tipo de transacción  
            if (/ingreso|transferencia recibida|acredit|abonado|recibid/.test(raw)) {
                keywords.push('INGRESO');
            } else if (/enviada|transferencia enviada|debito|egreso|pagado|compra/.test(raw)) {
                keywords.push('EGRESO');
            }

            // Extraer nombre/descripción significativa (primeras palabras antes de símbolos)
            const nameMatch = raw.match(/^([a-záéíóú\s]+)/i);
            const name = (nameMatch && nameMatch[1]) ? nameMatch[1].trim().substring(0, 20) : '';

            // Crear clave: tipo + nombre + monto (sin hora ni fragmentos menores)
            // Esto agrupa "Ingreso de dinero 1.500 Con transferencia 19:00" 
            // con "Ingreso de dinero 1.500" y "Con transferencia 19:00"
            const typePattern = keywords.join('|') || 'OTHER';
            const amountRounded = Math.abs(tx.amount);
            const key = `${typePattern}|${name}|${amountRounded}`;

            if (!seen.has(key)) {
                seen.set(key, tx);
                deduplicated.push(tx);
                console.debug('[ActivityService] Keeping tx: %s (raw: %s)', key, tx.raw.substring(0, 40));
            } else {
                // Esta es duplicada - comparar cuál tiene más información
                const existing = seen.get(key);
                if ((tx.raw || '').length > (existing.raw || '').length) {
                    // El nuevo tiene más info, reemplazar
                    console.debug('[ActivityService] Replacing with more complete: %s', key);
                    const idx = deduplicated.indexOf(existing);
                    if (idx >= 0) deduplicated[idx] = tx;
                    seen.set(key, tx);
                } else {
                    console.debug('[ActivityService] Duplicate (keeping existing): %s', key);
                }
            }
        }

        console.log(`[ActivityService] Scraped ${transactions.length} transactions, ${withAmount.length} with significant amount, deduplicated to ${deduplicated.length}`);
        return {
            transactions: deduplicated,
            count: deduplicated.length,
            lastUpdated: new Date().toISOString(),
            source: usedPlantilla ? 'plantilla' : 'mercadopago'
        };

    } catch (err) {
        console.error('[ActivityService] Scrape error:', err.message);
        throw err;
    }
}

/**
 * Presiona el botón refresh de la página (si existe) o recarga
 */
async function refreshActivityPage(page) {
    try {
        console.log('[ActivityService] Attempting to refresh page...');

        // Intentar presionar botón refresh (buscar por varios selectores posibles)
        const refreshSelectors = [
            'button[aria-label="Actualizar"]',
            'button[data-testid="refresh-button"]',
            'button:contains("Actualizar")',
            '[class*="refresh"]'
        ];

        let refreshed = false;
        for (const selector of refreshSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn) {
                    await btn.click();
                    refreshed = true;
                    console.log('[ActivityService] Refresh button clicked');
                    break;
                }
            } catch (e) {
                // continuar con siguiente selector
            }
        }

        // Si no se encontró botón, simplemente recargar la página
        if (!refreshed) {
            console.log('[ActivityService] No refresh button found, reloading page...');
            await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
            refreshed = true;
        }

        // Esperar a que se estabilice el DOM
        if (refreshed) {
            await page.waitForTimeout(2000);
        }

        return refreshed;

    } catch (err) {
        console.error('[ActivityService] Refresh error:', err.message);
        throw err;
    }
}

/**
 * Obtiene la actividad con opción de refrescar primero
 */
const pageLock = require('../lib/pageLock');

async function getActivity(page, fresh = false) {
    try {
        // Si no se solicita fresh, devolver cache si está disponible y no expiró
        if (!fresh && _lastActivityCache && (Date.now() - _lastActivityTs) < ACTIVITY_TTL_MS) {
            console.log('[ActivityService] Returning cached activity (TTL ok)');
            return _lastActivityCache;
        }

        // Serializar navegación/refresh/scrape para evitar que otro proceso (balance/watch)
        // nos pise la navegación (race conditions).
        const activity = await pageLock.runExclusive(async () => {
            const currentUrl = page.url();

            // Si fresh=true o no estamos en activities, navegar
            if (fresh || !currentUrl.includes('/activities')) {
                console.log('[ActivityService] Navigating to /activities...');
                await page.goto('https://www.mercadopago.com.ar/activities', {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                await page.waitForTimeout(2000);
            }

            // Si fresh=true, intentar refrescar la página
            if (fresh) {
                await refreshActivityPage(page);
            }

            return await scrapeActivity(page);
        });

        // Actualizar cache
        try {
            if (activity && Array.isArray(activity.transactions)) {
                _lastActivityCache = activity;
                _lastActivityTs = Date.now();
            }
        } catch (e) {
            /* ignore cache errors */
        }

        return activity;

    } catch (err) {
        const msg = String(err.message || err).toLowerCase();
        // Si hay problemas de sesión/redirección, usar caché si está disponible
        if ((msg.includes('url validation failed') || msg.includes('redirecci') || msg.includes('login')) && _lastActivityCache) {
            console.warn(`[ActivityService] Session issue detected (${msg}). Returning cached activity.`);
            return _lastActivityCache;
        }
        throw new Error(`Failed to get activity: ${err.message}`);
    }
}

/**
 * Precarga el caché de actividades al iniciar el servidor
 * Se ejecuta una sola vez para tener datos disponibles
 * en caso de que haya errores de sesión posteriores
 */
async function warmupCache(page) {
    try {
        console.log('[ActivityService] Warmup: Precargando transacciones...');
        const activity = await getActivity(page, true);
        if (activity && Array.isArray(activity.transactions)) {
            console.log('[ActivityService] ✅ Warmup exitoso: transacciones precargadas');
            return activity;
        }
    } catch (err) {
        // Silent fail — el warmup es un best-effort, no bloquea startup
        console.warn('[ActivityService] ⚠️ Warmup falló (best-effort):', err.message);
    }
    return null;
}

module.exports = {
    getActivity,
    scrapeActivity,
    refreshActivityPage,
    warmupCache
};
