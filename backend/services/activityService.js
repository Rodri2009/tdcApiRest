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
async function scrapeActivity(page, verbose = true) {
    try {
        // Validar que estamos en la página correcta
        const urlValidation = await validateCurrentUrl(page, '/activities');
        if (!urlValidation.valid) {
            throw new Error(`URL validation failed: ${urlValidation.reason}`);
        }

        // STRATEGY 0: Try reading cached plantilla file (DISABLED)
        // ⚠️  DISABLED: Plantilla has stale/incorrect timestamps and requires complex enrichment
        // STRATEGY 1 (page.evaluate) provides correct Argentina timezone conversion via DOM extraction
        let transactions = null;
        let usedPlantilla = false;

        const ENABLE_PLANTILLA_STRATEGY = false; // Disabled - use STRATEGY 1 instead for accurate timestamps

        if (ENABLE_PLANTILLA_STRATEGY) {
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

                                                // ✅ ENRICH WITH CREATION DATE FROM DOM immediately while page is still available
                                                try {
                                                    console.log('[ActivityService] 🔍 Iniciando enriquecimiento: buscando elementos time en DOM...');
                                                    const domData = await page.evaluate(() => {
                                                        const ARGENTINA_UTC_OFFSET = 3;
                                                        const allTimeElements = Array.from(document.querySelectorAll('[data-transaction-id] time.fuji-activities__date, [data-transaction-id] time[datetime]'));
                                                        console.log('[DOM] Total time elements encontrados:', allTimeElements.length);

                                                        const timeMap = {};
                                                        const debugInfo = [];

                                                        allTimeElements.forEach(timeEl => {
                                                            const txElement = timeEl.closest('[data-transaction-id]');
                                                            if (txElement) {
                                                                const txId = txElement.getAttribute('data-transaction-id');
                                                                const iso = timeEl.getAttribute('datetime');
                                                                const raw = (timeEl.getAttribute('title') || timeEl.textContent || '').trim();
                                                                const tm = raw.match(/(\d{1,2}):(\d{2})/);
                                                                let creationDate = null;

                                                                debugInfo.push({
                                                                    txId: txId ? txId.slice(0, 20) : 'NO-ID',
                                                                    iso: iso ? iso.slice(0, 10) : 'NO-ISO',
                                                                    raw: raw.slice(0, 20),
                                                                    tm: tm ? `${tm[1]}:${tm[2]}` : 'NO-MATCH'
                                                                });

                                                                if (iso && tm) {
                                                                    try {
                                                                        const d = new Date(iso + 'T00:00:00Z');
                                                                        const displayHour = Number(tm[1]);
                                                                        const displayMin = Number(tm[2]);
                                                                        const utcHour = displayHour + ARGENTINA_UTC_OFFSET;
                                                                        d.setUTCHours(utcHour, displayMin, 0, 0);
                                                                        creationDate = d.toISOString();
                                                                    } catch (e) { }
                                                                } else if (iso) {
                                                                    creationDate = iso + 'T00:00:00.000Z';
                                                                }

                                                                if (txId && creationDate) {
                                                                    timeMap[txId] = creationDate;
                                                                }
                                                            }
                                                        });

                                                        return { timeMap, debugInfo };
                                                    });

                                                    console.log('[ActivityService] 🔍 DOM data encontrado:', {
                                                        mappedCount: Object.keys(domData.timeMap).length,
                                                        debugSample: domData.debugInfo.slice(0, 3)
                                                    });

                                                    // Update transactions with creationDate from DOM
                                                    let enrichedCount = 0;
                                                    transactions.forEach(tx => {
                                                        const originalCreation = tx.creationDate;
                                                        if (tx.id && domData.timeMap[tx.id]) {
                                                            tx.creationDate = domData.timeMap[tx.id];
                                                            enrichedCount++;
                                                            console.log(`[ActivityService] ✅ TX[${tx.id.slice(0, 20)}]: ${originalCreation} → ${tx.creationDate}`);
                                                        }
                                                    });

                                                    console.log(`[ActivityService] ✅ Enriquecidas ${enrichedCount}/${transactions.length} transacciones`);
                                                } catch (enrichErr) {
                                                    console.log(`[ActivityService] ⚠️  Error enriqueciendo: ${enrichErr.message}`);
                                                    console.log('[ActivityService] Stack:', enrichErr.stack ? enrichErr.stack.slice(0, 200) : 'N/A');
                                                }
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
        } // END ENABLE_PLANTILLA_STRATEGY if block

        // STRATEGY 1: If plantilla failed, try window._n in-page structured data
        // Supports both new API (pageProps.listData.groups) and old API (pageProps.activities.results)
        if (!transactions || transactions.length === 0) {
            console.log('[🕷️  SCRAPER] 🔍 Iniciando STRATEGY 1: Extracción en-page JSON...');
            transactions = await page.evaluate(() => {
                try {
                    const appProps = window._n?.ctx?.r?.appProps;
                    const pageProps = appProps?.pageProps;

                    // --- NEW API (current MP structure): pageProps.listData.groups ---
                    const groups = pageProps?.listData?.groups;
                    if (Array.isArray(groups) && groups.length > 0) {
                        const flat = [];
                        for (const group of groups) {
                            const groupDate = group.title || null; // e.g. "28 de marzo" o "Hoy"
                            for (const item of (group.items || [])) {
                                flat.push({ ...item, _groupDate: groupDate });
                            }
                        }
                        if (flat.length > 0) {
                            // El JSON de window._n NO incluye la hora de cada movimiento.
                            // La hora real está en <time class="fuji-activities__date"> del DOM.
                            // IMPORTANT: Mercado Pago ALWAYS displays times in Argentine timezone (UTC-3)
                            // regardless of browser timezone. So we always add 3 hours to convert to UTC.
                            console.log(`[🕷️  SCRAPER] 📊 Flat items from JSON: ${flat.length}, mapping times from Argentina (UTC-3)...`);
                            const timeMap = {};
                            try {
                                // Mercado Pago displays time in Argentina timezone (UTC-3)
                                // HTML time: 17:42 (Argentina) = 20:42 UTC (add 3 hours)
                                const ARGENTINA_UTC_OFFSET = 3; // Argentina is UTC-3, so add 3 to get UTC

                                // Mapa: data-transaction-id → datetime
                                document.querySelectorAll('[data-transaction-id] time.fuji-activities__date, [data-transaction-id] time[datetime]').forEach(timeEl => {
                                    const txElement = timeEl.closest('[data-transaction-id]');
                                    if (txElement) {
                                        const txId = txElement.getAttribute('data-transaction-id');
                                        const iso = timeEl.getAttribute('datetime');
                                        const raw = (timeEl.getAttribute('title') || timeEl.textContent || '').trim();
                                        const tm = raw.match(/(\d{1,2}):(\d{2})/);
                                        let creationDate = null;
                                        if (iso && tm) {
                                            try {
                                                // iso format: "2026-05-22" (Argentina date)
                                                // tm: ["17:42", "17", "42"] (Argentina time)
                                                const d = new Date(iso + 'T00:00:00Z');
                                                const displayHour = Number(tm[1]);
                                                const displayMin = Number(tm[2]);
                                                // Convert Argentine time to UTC by adding 3 hours
                                                const utcHour = displayHour + ARGENTINA_UTC_OFFSET;
                                                d.setUTCHours(utcHour, displayMin, 0, 0);
                                                creationDate = d.toISOString();
                                            } catch (e) { }
                                        } else if (iso) {
                                            creationDate = iso + 'T00:00:00.000Z';
                                        }
                                        if (txId && creationDate) {
                                            timeMap[txId] = creationDate;
                                        }
                                    }
                                });
                                console.log(`[🕷️  SCRAPER] ⏰ Times found by ID: ${Object.keys(timeMap).length}`);
                                if (Object.keys(timeMap).length > 0) {
                                    const samples = Object.entries(timeMap).slice(0, 3);
                                    samples.forEach(([id, dt]) => {
                                        console.log(`[🕷️  SCRAPER]   Sample: ID=${id.slice(0, 20)} → ${dt}`);
                                    });
                                }
                                // Fallback: si no encontramos por ID, busca por posición
                                if (Object.keys(timeMap).length === 0) {
                                    console.log(`[🕷️  SCRAPER] ⏰ Fallback to position-based mapping...`);
                                    document.querySelectorAll('time.fuji-activities__date, time[datetime]').forEach((timeEl, idx) => {
                                        const iso = timeEl.getAttribute('datetime');
                                        const raw = (timeEl.getAttribute('title') || timeEl.textContent || '').trim();
                                        const tm = raw.match(/(\d{1,2}):(\d{2})/);
                                        let creationDate = null;
                                        if (iso && tm) {
                                            try {
                                                const d = new Date(iso + 'T00:00:00Z');
                                                const displayHour = Number(tm[1]);
                                                const displayMin = Number(tm[2]);
                                                const utcHour = displayHour + ARGENTINA_UTC_OFFSET;
                                                d.setUTCHours(utcHour, displayMin, 0, 0);
                                                creationDate = d.toISOString();
                                            } catch (e) { }
                                        } else if (iso) {
                                            creationDate = iso + 'T00:00:00.000Z';
                                        }
                                        timeMap[idx] = creationDate;
                                    });
                                    console.log(`[🕷️  SCRAPER] ⏰ Times found by position: ${Object.keys(timeMap).length}`);
                                }
                            } catch (e) {
                                console.log(`[🕷️  SCRAPER] ❌ Time mapping error: ${e.message}`);
                            }

                            return {
                                items: flat.map((item, idx) => {
                                    // Derive a sign-aware category for the normalizer:
                                    // subCategory "in" => income (positive), "out" / category "pays" => payment/transfer (negative)
                                    const sub = (item.subCategory || '').toLowerCase();
                                    const cat = (item.category || '').toLowerCase();
                                    let normCategory;
                                    if (sub === 'in') normCategory = 'income';
                                    else if (sub === 'out') normCategory = 'out';
                                    else if (cat === 'pays') normCategory = 'pays';
                                    else normCategory = cat || sub;

                                    // Try to get creationDate by ID first, then by index
                                    const timeByIdOrIdx = timeMap[item.id] || timeMap[idx] || null;

                                    return {
                                        id: item.id || `activity-${idx}`,
                                        title: item.title || item.description || '',
                                        category: normCategory,
                                        description: item.description || '',
                                        amount: item.amount ? item.amount.fraction : null,
                                        currency: (item.amount && item.amount.currency_id) || 'ARS',
                                        symbol: (item.amount && item.amount.symbol) || '$',
                                        dateTime: item._groupDate || null,
                                        // ISO datetime preciso del DOM (fecha + hora)
                                        creationDate: timeByIdOrIdx,
                                        type: sub === 'in' ? 'income'
                                            : cat === 'pays' ? 'payment'
                                                : sub === 'out' ? 'transfer'
                                                    : (cat || 'unknown'),
                                        raw: JSON.stringify(item).slice(0, 300),
                                        _isStructured: true,
                                        _source: 'in-page-json'
                                    };
                                }),
                                _debugTimeMapSize: Object.keys(timeMap).length,
                                _debugTimeSamples: Object.entries(timeMap).slice(0, 2).map(([k, v]) => `${k.slice(0, 20)}→${v}`)
                            };
                        }

                        if (transactions && transactions.items) {
                            transactions = transactions.items;
                        }
                    }

                    // --- OLD API (fallback): pageProps.activities.results ---
                    const results = pageProps?.activities?.results || [];
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

            // Helper: muestra hora argentina (UTC-3) para comparar con lo que se ve en la web
            const toArgTime = (isoUtc) => {
                if (!isoUtc) return '??:??';
                try {
                    const d = new Date(isoUtc);
                    const argH = String((d.getUTCHours() - 3 + 24) % 24).padStart(2, '0');
                    const argM = String(d.getUTCMinutes()).padStart(2, '0');
                    const argD = String(d.getUTCDate()).padStart(2, '0');
                    const argMo = String(d.getUTCMonth() + 1).padStart(2, '0');
                    // Adjust date if hour went negative
                    if (d.getUTCHours() < 3) {
                        const prev = new Date(d.getTime() - 3 * 60 * 60 * 1000);
                        return `${String(prev.getUTCDate()).padStart(2, '0')}/${String(prev.getUTCMonth() + 1).padStart(2, '0')} ${argH}:${argM} ARG`;
                    }
                    return `${argD}/${argMo} ${argH}:${argM} ARG`;
                } catch (e) { return isoUtc; }
            };

            const logTransactions = (txList, label) => {
                console.log(`\n[🕷️  SCRAPER] ${label}: ${txList.length} transacciones`);
                txList.forEach((tx, idx) => {
                    const dateObj = new Date(tx.creationDate || tx.dateTime || '');
                    const dateStr = !isNaN(dateObj) ? dateObj.toISOString().replace('T', ' ').substring(0, 19) : 'sin fecha';
                    const type = tx.type || tx.category || '';
                    const typeStr = type ? ` (${type})` : '';
                    const sign = (tx.amount || 0) < 0 ? '' : '+';
                    const absAmt = Math.abs(tx.amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 });
                    console.log(`[🕷️  SCRAPER] ${idx + 1} ${dateStr} ${(tx.title || 'sin nombre').substring(0, 40).padEnd(40)} ${typeStr}  $${sign}${absAmt}`);
                });
            };

            if (transactions && Array.isArray(transactions.items)) {
                transactions = transactions.items;
                logTransactions(transactions, 'EN VIVO desde MP');
            } else if (transactions && transactions.length > 0) {
                logTransactions(transactions, 'EN VIVO desde MP');
            } else {
                console.log('[🕷️  SCRAPER] ⚠️  Strategy 1 (in-page JSON) returned 0 transactions, trying fallback...');
                // 2) STRATEGY 2: Fallback a DOM scraping (menos confiable pero parseable)
                // Improved: be more selective to avoid date/filter selectors
                transactions = await page.evaluate(() => {
                    const items = [];

                    // FIRST try structured sections (date header + rows)
                    const feedSections = document.querySelectorAll('section.activity-feed');
                    feedSections.forEach((sec, sidx) => {
                        const dateHeader = sec.querySelector('h2.activity-feed__title');
                        const sectionDate = dateHeader ? dateHeader.textContent.trim() : null;
                        const rows = sec.querySelectorAll('li.ui-rowfeed-container');
                        rows.forEach((row, ridx) => {
                            try {
                                const raw = row.innerText || row.textContent || '';
                                const amountEl = row.querySelector('.andes-money-amount');
                                const amountText = amountEl ? amountEl.textContent.trim() : null;
                                const dateEl = row.querySelector('p.ui-rowfeed-date');
                                const timeText = dateEl ? dateEl.textContent.trim() : null;
                                const titleEl = row.querySelector('.ui-rowfeed-title');
                                const descEl = row.querySelector('.ui-rowfeed-description__text');
                                const name = titleEl ? titleEl.textContent.trim() : '';
                                const desc = descEl ? descEl.textContent.trim() : '';
                                let dateTimeStr = null;
                                if (sectionDate) {
                                    dateTimeStr = sectionDate + ' ' + (timeText || '');
                                } else if (timeText) {
                                    dateTimeStr = timeText;
                                }
                                items.push({
                                    id: row.getAttribute('data-transaction-id') || `tx-${sidx}-${ridx}`,
                                    raw,
                                    amount: amountText,
                                    dateTime: dateTimeStr,
                                    date: sectionDate || '',
                                    time: timeText || '',
                                    name,
                                    title: name,
                                    description: desc
                                });
                            } catch (e) {
                                // ignore
                            }
                        });
                    });
                    if (items.length > 0) {
                        return items;
                    }

                    // FALLBACK generic selectors if section parsing found nothing
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

                if (transactions && transactions.length > 0) {
                    console.info('[ActivityService] ✅ STRATEGY 2 exitosa: Extracted %d transactions from DOM (fallback)', transactions.length);
                    console.log('[🕷️  SCRAPER] 📊 Sample de transacciones extraídas (DOM):');
                    transactions.slice(0, 5).forEach((tx, idx) => {
                        console.log(`  [${idx}] ID: ${tx.id} | Tipo: ${tx.type} | Monto: ${tx.amount}`);
                    });
                    console.log(`[🕷️  SCRAPER] 📊 Total extracted: ${transactions.length} (first 5 shown above)`);
                } else {
                    console.log('[🕷️  SCRAPER] ❌ Strategy 2 también falló: 0 transacciones extraídas');
                    transactions = [];
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

                // Manejar "Hoy" y "Ayer" (grupo del día actual/anterior en MP)
                const trimmedDate = (dateStr || '').trim().toLowerCase();
                if (trimmedDate === 'hoy' || trimmedDate === 'ayer') {
                    const base = new Date();
                    if (trimmedDate === 'ayer') base.setDate(base.getDate() - 1);
                    if (timeMatch) {
                        return isoFromParts(base.getFullYear(), base.getMonth() + 1, base.getDate(),
                            Number(timeMatch[1]), Number(timeMatch[2]));
                    }
                    return isoFromParts(base.getFullYear(), base.getMonth() + 1, base.getDate());
                }

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
                // Fragmento descartado (silencioso en logs normales)
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
            const name = (nameMatch && nameMatch[1]) ? nameMatch[1].trim().substring(0, 50) : '';

            // Crear clave: tipo + nombre + monto + timestamp
            // Incluir más caracteres del nombre y el timestamp para evitar falsos duplicados
            // cuando hay múltiples transferencias del mismo monto de diferentes personas
            const typePattern = keywords.join('|') || 'OTHER';
            const amountRounded = Math.abs(tx.amount);
            const timestamp = (tx.dateTime || tx.creationDate || '').substring(0, 19); // YYYY-MM-DDTHH:MM:SS
            const key = `${typePattern}|${name}|${amountRounded}|${timestamp}`;

            if (!seen.has(key)) {
                seen.set(key, tx);
                deduplicated.push(tx);
                // Deduplicación detectada (silencioso en logs normales)
            } else {
                // Esta es duplicada - comparar cuál tiene más información
                const existing = seen.get(key);
                if ((tx.raw || '').length > (existing.raw || '').length) {
                    // El nuevo tiene más info, reemplazar
                    const idx = deduplicated.indexOf(existing);
                    if (idx >= 0) deduplicated[idx] = tx;
                    seen.set(key, tx);
                } else {
                    // Duplicate descartado, manteniendo existente
                }
            }
        }

        // If we used plantilla (STRATEGY 0), enrich with creationDate from DOM
        // since plantilla doesn't have precise timestamps
        // NOTE: This enrichment happens INSIDE page.evaluate() via STRATEGY 0 modification
        // The transactions object should already have creationDate if DOM extraction was successful

        console.log(`[ActivityService] Scraped ${transactions.length} transactions, ${withAmount.length} with significant amount, deduplicated to ${deduplicated.length}`);

        // ✅ REMOVED: _fixTimestampUTC was adding +3 hours again to already-correct UTC timestamps
        // STRATEGY 1 already converts Argentina time to UTC correctly: display_hour + 3 = UTC hour
        // Example: 17:42 Argentina → 20:42 UTC (already correct)
        // _fixTimestampUTC was making it: 20:42 UTC + 3 hours → 23:42 UTC (WRONG)
        //
        // deduplicated.forEach((tx) => {
        //     if (tx.dateTime) {
        //         tx.dateTime = _fixTimestampUTC(tx.dateTime);
        //     }
        //     if (tx.creationDate) {
        //         tx.creationDate = _fixTimestampUTC(tx.creationDate);
        //     }
        // });

        // Log after normalization – show Argentina time to match what's on the MP page
        if (verbose) {
            const toArg = (iso) => {
                if (!iso) return '??:??';
                try {
                    const d = new Date(iso);
                    const h = (d.getUTCHours() - 3 + 24) % 24;
                    const adjusted = d.getUTCHours() < 3 ? new Date(d.getTime() - 3 * 3600000) : d;
                    return `${String(adjusted.getUTCDate()).padStart(2, '0')}/${String(adjusted.getUTCMonth() + 1).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} ARG`;
                } catch (e) { return iso; }
            };
            console.log(`[🕷️  SCRAPER] ┌── RESULTADO FINAL (hora Argentina = lo que ves en MP) ──`);
            deduplicated.forEach((tx, idx) => {
                const absAmt = Math.abs(tx.amount || 0);
                const sign = (tx.amount || 0) >= 0 ? '+' : '-';
                const formatted = absAmt.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                const amt = `$${sign}${formatted}`;
                const name = (tx.title || 'sin título').substring(0, 32);
                console.log(`[🕷️  SCRAPER] │ [${String(idx + 1).padStart(2)}] ${toArg(tx.creationDate || tx.dateTime)} | ${name.padEnd(32)} | ${amt}`);
            });
            console.log(`[🕷️  SCRAPER] └── ${deduplicated.length} transacciones totales ───────────────`);
        }

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
 * Pagina a través de TODAS las actividades/transacciones en MP
 * Usa el botón "Página siguiente" (#_R_2nll2e_) para avanzar
 * Acumula todas las transacciones de todas las páginas
 * 
 * @param {Object} page - Página de Puppeteer
 * @param {number} maxPages - Máximo de páginas a paginar (default: 20)
 * @param {Function} onProgress - Callback para emitir eventos
 * @param {Date} dateFrom - Fecha inicio para filtro (opcional)
 * @param {Date} dateTo - Fecha fin para filtro (opcional)
 * @returns {Object} {transactions: [], totalPages: number, totalCount: number}
 */
async function scrapeActivityAllPages(page, maxPages = 20, onProgress = null, dateFrom = null, dateTo = null) {
    const emit = (data) => {
        if (onProgress) onProgress(data);
    };

    // ── PAUSAR EL WATCH SERVICE ──────────────────────────────────────────────
    // TransactionWatchService llama a page.goto('/activities') cada 3-7s en el
    // MISMO mpPage. Eso resetea la paginación desde Node.js, fuera del browser.
    // El freeze de JS del browser no puede detener esto. Pausamos el watcher.
    let watchService = null;
    let watchWasActive = false;
    try {
        const { getWatchService } = require('../controllers/watchController');
        watchService = getWatchService();
        if (watchService && watchService.isActive) {
            watchWasActive = true;
            watchService.stop();
            console.log('[ActivityService] ⏸️  TransactionWatchService pausado para scraping');
            emit({ type: 'status', message: '⏸️ Watch service pausado (evita resets de página)' });
        }
    } catch (e) {
        console.warn('[ActivityService] ⚠️  No se pudo pausar watch service:', e.message);
    }

    try {
        console.log('\n\n[🕷️  SCRAPER] ╔════════════════════════════════════════╗');
        console.log('[🕷️  SCRAPER] ║  INICIO DEL SCRAPING PARA IMPORTACIÓN  ║');
        console.log('[🕷️  SCRAPER] ╚════════════════════════════════════════╝');
        if (dateFrom && dateTo) {
            const fmtFrom = dateFrom.toISOString().replace('T', ' ').substring(0, 19);
            const fmtTo = dateTo.toISOString().replace('T', ' ').substring(0, 19);
            console.log(`[🕷️  SCRAPER] Petición: Período buscado ${fmtFrom} → ${fmtTo}, Cantidad de páginas: ${maxPages}`);
        }
        console.log('[ActivityService] 🔄 Iniciando scraping paginado de todas las actividades...');
        emit({ type: 'status', message: '🔄 Iniciando scraping...' });

        // Validar que estamos en la página correcta
        const urlValidation = await validateCurrentUrl(page, '/activities');
        if (!urlValidation.valid) {
            throw new Error(`URL validation failed: ${urlValidation.reason}`);
        }

        // 🔒 PROTECCIÓN: Intentar pausar refresh automático de MP con reintentos
        console.log('[ActivityService] 🔒 Intentando congelar timers de MP...');
        emit({ type: 'status', message: '🔒 Pausando refresh automático de MP...' });

        let freezeSuccess = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                // Timeout corto para evitar que el contexto se destruya
                await page.evaluate(() => {
                    // Congelar timers simples (lo más crítico)
                    const origSetTimeout = window.setTimeout;
                    const origSetInterval = window.setInterval;
                    window.setTimeout = () => -1;
                    window.setInterval = () => -1;

                    // Cancelar timers existentes
                    try {
                        const highId = origSetInterval(() => { }, 99999999);
                        for (let i = 1; i <= Math.min(highId, 10000); i++) {
                            clearTimeout(i);
                            clearInterval(i);
                        }
                    } catch (e) { }

                    console.log('✅ Timers básicos congelados');
                }).catch(err => {
                    // Ignora errores de contexto - continúa de todas formas
                    if (err.message.includes('context')) {
                        console.warn('[ActivityService] Contexto destruido durante freeze, continuando...');
                    } else {
                        throw err;
                    }
                });

                freezeSuccess = true;
                break;
            } catch (err) {
                if (attempt < 2) {
                    await page.waitForTimeout(300);
                }
            }
        }

        if (freezeSuccess) {
            console.log('[ActivityService] ✅ Congelamiento ejecutado');
            emit({ type: 'status', message: '✅ Refresh de MP pausado' });
        } else {
            console.warn('[ActivityService] ⚠️ Congelamiento incompleto');
            emit({ type: 'warning', message: '⚠️ Congelamiento parcial - puede haber interferencias' });
        }

        let allTransactions = [];
        let pageCount = 0;
        let hasNextPage = true;
        let domRefreshCount = 0;
        let navigationErrors = 0;
        let prevPageFingerprint = null; // Para detectar redirección a página anterior
        let periodFoundInPages = false;

        while (hasNextPage && pageCount < maxPages) {
            pageCount++;
            console.log(`\n[🕷️  SCRAPER] ═══ INICIO DE EXTRACCIÓN PÁGINA ${pageCount} ═══`);
            emit({ type: 'page_start', page: pageCount, maxPages });

            // ANTES: Obtener count de elementos para detectar si se refrescan
            let countBefore = 0;
            try {
                countBefore = await page.evaluate(() => {
                    return document.querySelectorAll('[data-transaction-id]').length;
                }).catch(err => {
                    console.warn('[ActivityService] Contexto destruido al contar elementos');
                    return 0;
                });
            } catch (err) {
                if (err.message.includes('Execution context was destroyed')) {
                    console.warn('[ActivityService] 🔄 ALERTA: Refresh detectado ANTES del scraping');
                    await page.waitForTimeout(2000);
                    countBefore = 0;
                } else {
                    throw err;
                }
            }

            console.log(`[ActivityService] ↳ Elementos detectados antes: ${countBefore}`);

            // Extraer transacciones de la página actual
            try {
                const pageResult = await scrapeActivity(page);
                if (pageResult && pageResult.transactions && Array.isArray(pageResult.transactions)) {
                    // ── DETECCIÓN DE PÁGINA DUPLICADA ────────────────────────────────
                    // Si la página tiene el mismo contenido que la anterior, MP nos
                    // redirigió al inicio (el freeze no pudo evitar la navegación).
                    // Usar 10 primeros items para fingerprint más robusta
                    const fingerprint = pageResult.transactions
                        .slice(0, 10)
                        .map(tx => `${tx.dateTime || tx.creationDate || ''}|${tx.title || tx.description || ''}|${tx.amount}`)
                        .join(';');

                    console.log(`[ActivityService] 🔍 Fingerprint de página ${pageCount}: ${fingerprint.slice(0, 80)}...`);

                    if (prevPageFingerprint !== null && fingerprint === prevPageFingerprint) {
                        console.warn(`[ActivityService] 🔁 PÁGINA DUPLICADA detectada en página ${pageCount} — MP redirigió al inicio. Abortando.`);
                        emit({
                            type: 'page_duplicate',
                            page: pageCount,
                            message: `🔁 Página ${pageCount} = Página ${pageCount - 1}: MP redirigió al inicio. Scraping detenido para evitar datos incorrectos.`
                        });
                        hasNextPage = false;
                        // Quitar las transacciones de esta página (son duplicadas)
                        // NO las agregamos a allTransactions
                    } else {
                        console.log(`[ActivityService] ✅ Página ${pageCount} contiene datos NUEVOS (diferentes a anterior)`);
                        prevPageFingerprint = fingerprint;
                        allTransactions = allTransactions.concat(pageResult.transactions);
                        // Verificar si el período buscado está en esta página
                        let pageHasPeriod = false;
                        if (dateFrom && dateTo) {
                            pageHasPeriod = pageResult.transactions.some(tx => {
                                const txDate = new Date(tx.creationDate || tx.dateTime || '');
                                return !isNaN(txDate) && txDate >= dateFrom && txDate <= dateTo;
                            });
                            if (pageHasPeriod) periodFoundInPages = true;
                        }
                        console.log(`[🕷️  SCRAPER] ${pageResult.transactions.length} transacciones (total acumulado: ${allTransactions.length})`);
                        if (pageHasPeriod) {
                            console.log(`[🕷️  SCRAPER] ✅ Período buscado encontrado en esta página`);
                        } else if (dateFrom && dateTo) {
                            console.log(`[🕷️  SCRAPER] ⏸️  Período NO encontrado en esta página (transacciones fuera de rango)`);
                        }
                        emit({
                            type: 'page_done',
                            page: pageCount,
                            count: pageResult.transactions.length,
                            total: allTransactions.length,
                            transactions: pageResult.transactions.map(tx => ({
                                id: tx.id,
                                title: tx.title || tx.description || '',
                                amount: tx.amount,
                                dateTime: tx.creationDate || tx.dateTime || null,
                                category: tx.category || ''
                            }))
                        });
                    }
                    // ── FIN DETECCIÓN ─────────────────────────────────────────────────
                }
            } catch (err) {
                if (err.message.includes('Execution context was destroyed')) {
                    console.warn(`[ActivityService] 🔄 ALERTA: Refresh durante scraping en página ${pageCount}`);
                    navigationErrors++;
                    emit({ type: 'warning', message: `⚠️ Página ${pageCount}: refresh detectado, reintentando...` });
                    await page.waitForTimeout(2000);
                } else {
                    console.warn(`[ActivityService] ⚠️  Error extrayendo página ${pageCount}:`, err.message);
                    emit({ type: 'warning', message: `⚠️ Página ${pageCount}: ${err.message}` });
                }
            }

            // DESPUÉS: Verificar si DOM se refrescó
            let countAfter = 0;
            try {
                countAfter = await page.evaluate(() => {
                    return document.querySelectorAll('[data-transaction-id]').length;
                });
            } catch (err) {
                if (err.message.includes('Execution context was destroyed')) {
                    console.warn('[ActivityService] 🔄 ALERTA: Refresh detectado DESPUÉS del scraping');
                    navigationErrors++;
                    await page.waitForTimeout(2000);
                    countAfter = 0;
                } else {
                    throw err;
                }
            }

            console.log(`[ActivityService] ↳ Elementos detectados después: ${countAfter}`);

            if (countAfter < countBefore && countAfter > 0) {
                console.warn(`[ActivityService] ⚠️  REFRESH DETECTADO: ${countBefore} → ${countAfter} elementos`);
                domRefreshCount++;
            }

            // Clickear botón "Página siguiente"
            let clickSuccessful = false;
            let retryCount = 0;
            const maxRetries = 3;

            while (!clickSuccessful && retryCount < maxRetries) {
                try {
                    // Buscar el botón "Siguiente" en varias variantes
                    let nextButton = await page.evaluateHandle(() => {
                        const selectors = [
                            '#_R_2nll2e_',
                            'button[aria-label*="siguiente"]',
                            'button[aria-label*="Siguiente"]',
                            'button[title*="siguiente"]',
                            'button[title*="Siguiente"]',
                            'button[id*="next"]',
                            '[data-testid*="next"]',
                            '[class*="next"]'
                        ];
                        for (const selector of selectors) {
                            const el = document.querySelector(selector);
                            if (el) return el;
                        }
                        const candidates = Array.from(document.querySelectorAll('button, a[role="button"], div[role="button"]'));
                        return candidates.find(el => /siguiente|next/i.test(el.innerText || el.textContent || '')) || null;
                    });

                    if (nextButton) {
                        const isElementHandle = typeof nextButton.asElement === 'function';
                        if (!isElementHandle || !nextButton.asElement()) {
                            nextButton = null;
                        }
                    }

                    if (nextButton) {
                        // Verificar si está deshabilitado
                        let isDisabled = false;
                        try {
                            isDisabled = await nextButton.evaluate(btn => btn.disabled || btn.getAttribute('aria-disabled') === 'true' || btn.getAttribute('disabled') === 'true');
                        } catch (err) {
                            if (err.message.includes('Execution context was destroyed')) {
                                console.warn('[ActivityService] 🔄 Refresh antes de evaluar botón');
                                navigationErrors++;
                                await page.waitForTimeout(2000);
                                retryCount++;
                                continue;
                            }
                            throw err;
                        }

                        if (isDisabled) {
                            console.log('[ActivityService] ⏹️  Botón DESHABILITADO → última página alcanzada');
                            hasNextPage = false;
                            clickSuccessful = true;
                        } else {
                            console.log(`[ActivityService] ➡️  Clickeando "Siguiente" (intento ${retryCount + 1}/${maxRetries})...`);

                            // Guardar primer fingerprint ANTES del click
                            let firstItemBefore = null;
                            try {
                                firstItemBefore = await page.evaluate(() => {
                                    const buildFingerprint = (item) => {
                                        if (!item) return null;
                                        const id = item.id || item.transaction_id || item.txId || '';
                                        const title = item.title || item.description || item.name || '';
                                        const amount = item.amount || item.value || item.monto || '';
                                        return `${id}|${title}|${amount}`;
                                    };

                                    const jsonGroups = window._n?.ctx?.r?.appProps?.pageProps?.listData?.groups;
                                    if (Array.isArray(jsonGroups) && jsonGroups.length > 0) {
                                        const firstItem = jsonGroups[0]?.items?.[0];
                                        const fingerprint = buildFingerprint(firstItem);
                                        if (fingerprint) return fingerprint;
                                    }

                                    const fallbackItems = Array.from(document.querySelectorAll('[data-transaction-id], [data-testid="transaction-item"], .activity-row, [class*="TransactionItem"], [class*="rowfeed"]'));
                                    return fallbackItems.length > 0 ? fallbackItems[0].textContent.trim().slice(0, 80) : null;
                                });
                            } catch (err) {
                                if (!err.message.includes('Execution context was destroyed')) throw err;
                            }

                            // Hacer el click
                            console.log(`[ActivityService] 🖱️  Click en "Siguiente" ejecutado`);
                            await nextButton.click();

                            // Esperar para que el click tenga efecto y MP actualice la página
                            console.log('[ActivityService] ⏳ Esperando 5s para estabilización de página...');
                            await page.waitForTimeout(5000);

                            // Verificar si el contenido cambió
                            let firstItemAfter = null;
                            let contentChanged = false;
                            try {
                                firstItemAfter = await page.evaluate(() => {
                                    const buildFingerprint = (item) => {
                                        if (!item) return null;
                                        const id = item.id || item.transaction_id || item.txId || '';
                                        const title = item.title || item.description || item.name || '';
                                        const amount = item.amount || item.value || item.monto || '';
                                        return `${id}|${title}|${amount}`;
                                    };

                                    const jsonGroups = window._n?.ctx?.r?.appProps?.pageProps?.listData?.groups;
                                    if (Array.isArray(jsonGroups) && jsonGroups.length > 0) {
                                        const firstItem = jsonGroups[0]?.items?.[0];
                                        const fingerprint = buildFingerprint(firstItem);
                                        if (fingerprint) return fingerprint;
                                    }

                                    const fallbackItems = Array.from(document.querySelectorAll('[data-transaction-id], [data-testid="transaction-item"], .activity-row, [class*="TransactionItem"], [class*="rowfeed"]'));
                                    return fallbackItems.length > 0 ? fallbackItems[0].textContent.trim().slice(0, 80) : null;
                                });

                                // Verificar si realmente cambió el contenido
                                if (firstItemBefore === firstItemAfter) {
                                    // Contenido no cambió
                                    if (firstItemBefore === null && firstItemAfter === null) {
                                        console.warn(`[ActivityService] ⚠️  Ambos NULL en intento ${retryCount + 1}: página probablemente no cargó`);
                                    } else {
                                        console.warn(`[ActivityService] ⚠️  CONTENIDO NO CAMBIÓ en intento ${retryCount + 1}: "${firstItemBefore ? firstItemBefore.slice(0, 40) : 'NULL'}"`);
                                    }
                                    contentChanged = false;
                                    retryCount++;
                                } else {
                                    // Contenido cambió
                                    console.log(`[ActivityService] ✅ CONTENIDO CAMBIÓ detectado:`);
                                    console.log(`[ActivityService]    ANTES: "${firstItemBefore ? firstItemBefore.slice(0, 40) : 'NULL'}"`);
                                    console.log(`[ActivityService]    DESPUÉS: "${firstItemAfter ? firstItemAfter.slice(0, 40) : 'NULL'}"`);
                                    contentChanged = true;
                                    clickSuccessful = true;
                                }
                            } catch (err) {
                                if (err.message.includes('Execution context was destroyed')) {
                                    console.warn('[ActivityService] 🔄 Refresh después del click, reintentando...');
                                    navigationErrors++;
                                    await page.waitForTimeout(2000);
                                    retryCount++;
                                } else {
                                    throw err;
                                }
                            }

                            // Esperar a que la página cambie en el modelo de datos de MP
                            if (contentChanged) {
                                try {
                                    await page.waitForFunction(
                                        (beforeFingerprint) => {
                                            const buildFingerprint = (item) => {
                                                if (!item) return null;
                                                const id = item.id || item.transaction_id || item.txId || '';
                                                const title = item.title || item.description || item.name || '';
                                                const amount = item.amount || item.value || item.monto || '';
                                                return `${id}|${title}|${amount}`;
                                            };
                                            const jsonGroups = window._n?.ctx?.r?.appProps?.pageProps?.listData?.groups;
                                            if (Array.isArray(jsonGroups) && jsonGroups.length > 0) {
                                                const firstItem = jsonGroups[0]?.items?.[0];
                                                const fingerprint = buildFingerprint(firstItem);
                                                if (fingerprint && fingerprint !== beforeFingerprint) return true;
                                            }
                                            const fallbackItems = Array.from(document.querySelectorAll('[data-transaction-id], [data-testid="transaction-item"], .activity-row, [class*="TransactionItem"], [class*="rowfeed"]'));
                                            const current = fallbackItems.length > 0 ? fallbackItems[0].textContent.trim().slice(0, 80) : null;
                                            return current && current !== beforeFingerprint;
                                        },
                                        { timeout: 8000 },
                                        firstItemBefore
                                    );
                                } catch (e) {
                                    console.warn('[ActivityService] ⚠️  Timeout esperando nueva página');
                                }
                            }
                        }
                    } else {
                        console.log('[ActivityService] ⏹️  Botón SIGUIENTE NO ENCONTRADO → fin de paginación');
                        hasNextPage = false;
                        clickSuccessful = true;
                    }
                } catch (err) {
                    if (err.message.includes('Execution context was destroyed')) {
                        console.warn(`[ActivityService] 🔄 Execution context destroyed (reintentos: ${retryCount + 1}/${maxRetries})`);
                        navigationErrors++;
                        await page.waitForTimeout(2000);
                        retryCount++;
                    } else {
                        console.warn(`[ActivityService] ⚠️  Error paginando:`, err.message);
                        hasNextPage = false;
                        clickSuccessful = true;
                    }
                }
            }

            if (retryCount >= maxRetries) {
                console.warn(`[ActivityService] ⚠️  MAX REINTENTOS (${maxRetries}) alcanzados en página ${pageCount} → deteniendo`);
                hasNextPage = false;
            }

            // Límite de páginas
            if (pageCount >= maxPages) {
                console.log(`[ActivityService] ⚠️  LÍMITE de ${maxPages} páginas alcanzado`);
                hasNextPage = false;
            }

            console.log(`[🕷️  SCRAPER] ═══ FIN DE EXTRACCIÓN PÁGINA ${pageCount} ═══\n`);
        }

        console.log(`\n[🕷️  SCRAPER] ╔════════════════════════════════════════╗`);
        console.log(`[🕷️  SCRAPER] ║  FIN DE ESCRAPEADO PARA IMPORTACIÓN   ║`);
        console.log(`[🕷️  SCRAPER] ╚════════════════════════════════════════╝`);
        if (dateFrom && dateTo) {
            if (periodFoundInPages) {
                console.log(`[🕷️  SCRAPER] ✅ PERÍODO BUSCADO: Encontrado en el scraping realizado`);
            } else if (pageCount >= maxPages) {
                console.log(`[🕷️  SCRAPER] ⚠️  PERÍODO BUSCADO: NO encontrado (se alcanzó límite de ${maxPages} páginas)`);
            } else {
                console.log(`[🕷️  SCRAPER] ✅ PERÍODO BUSCADO: No hay más transacciones (fin del historial)`);
            }
        }
        console.log(`[ActivityService] Total de páginas recorridas: ${pageCount}`);
        console.log(`[ActivityService] Total de transacciones: ${allTransactions.length}`);
        console.log(`[ActivityService] Errores de navegación detectados: ${navigationErrors}\n`);

        // ── DEDUPLICACIÓN GLOBAL ─────────────────────────────────────────────
        // Mercado Pago puede devolver transacciones duplicadas entre páginas
        // Usar timestamp + monto como clave para detectar duplicados
        const seenTransactions = new Map();
        const dedupedTransactions = [];
        let duplicateCount = 0;

        allTransactions.forEach(tx => {
            const timestamp = tx.dateTime || tx.creationDate || 'unknown';
            const amount = tx.amount || 0;
            const key = `${timestamp}|${amount}`;

            if (!seenTransactions.has(key)) {
                seenTransactions.set(key, true);
                dedupedTransactions.push(tx);
            } else {
                duplicateCount++;
            }
        });

        if (duplicateCount > 0) {
            console.log(`[ActivityService] 🔄 Deduplicación: ${allTransactions.length} → ${dedupedTransactions.length} (eliminados ${duplicateCount} duplicados entre páginas)`);
        }

        emit({
            type: 'scraping_done',
            total: dedupedTransactions.length,
            pages: pageCount,
            navigationErrors,
            duplicatesRemoved: duplicateCount
        });
        if (domRefreshCount > 0) {
            console.warn(`[ActivityService] • Refreshes detectados: ${domRefreshCount}`);
        }
        if (navigationErrors > 0) {
            console.warn(`[ActivityService] • Errores de navegación: ${navigationErrors}`);
        }

        // 🔓 RESTAURAR timers/listeners después del scraping
        console.log('[ActivityService] 🔓 Restaurando timers/listeners de MP...');
        try {
            await page.evaluate(() => {
                if (window._origSetInterval) window.setInterval = window._origSetInterval;
                if (window._origSetTimeout) window.setTimeout = window._origSetTimeout;
                if (window._origRAF) window.requestAnimationFrame = window._origRAF;
                if (window._origRIC) window.requestIdleCallback = window._origRIC;
                if (window._origAEL) EventTarget.prototype.addEventListener = window._origAEL;
                if (window._origFetch) window.fetch = window._origFetch;
                if (window._OrigWS) window.WebSocket = window._OrigWS;
                if (window._OrigES) window.EventSource = window._OrigES;
                console.log('✓ Timers/listeners restaurados');
            });
        } catch (e) {
            console.warn('[ActivityService] ⚠️  No se pudo restaurar timers:', e.message);
        }

        return {
            transactions: dedupedTransactions,
            totalPages: pageCount,
            totalCount: dedupedTransactions.length,
            refreshsDetected: domRefreshCount,
            navigationErrors,
            duplicatesRemoved: duplicateCount,
            source: 'manual-pagination'
        };

    } catch (err) {
        console.error('[ActivityService] ❌ Error en scraping paginado:', err.message);
        throw err;
    } finally {
        // ── REANUDAR EL WATCH SERVICE ────────────────────────────────────────
        // Siempre intentar reiniciar, independiente de si estaba activo antes.
        // start() es idempotente (ignora si ya está activo).
        if (watchService) {
            try {
                watchService.start();
                console.log('[ActivityService] ▶️  TransactionWatchService reanudado');
                emit({ type: 'status', message: '▶️ Watch service reanudado' });
            } catch (e) {
                console.warn('[ActivityService] ⚠️  No se pudo reanudar watch service:', e.message);
            }
        }
    }
}

/**
 * Presiona el botón refresh de la página (si existe) o recarga
 */
async function refreshActivityPage(page, verbose = true) {
    try {
        if (verbose) console.log('[ActivityService] Attempting to refresh page...');

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
                    if (verbose) console.log('[ActivityService] Refresh button clicked');
                    break;
                }
            } catch (e) {
                // continuar con siguiente selector
            }
        }

        // Si no se encontró botón, simplemente recargar la página
        if (!refreshed) {
            if (verbose) console.log('[ActivityService] No refresh button found, reloading page...');
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

async function getActivity(page, fresh = false, verbose = true) {
    try {
        // Si no se solicita fresh, devolver cache si está disponible y no expiró
        if (!fresh && _lastActivityCache && (Date.now() - _lastActivityTs) < ACTIVITY_TTL_MS) {
            if (verbose) console.log('[ActivityService] Returning cached activity (TTL ok)');
            return _lastActivityCache;
        }

        // Serializar navegación/refresh/scrape para evitar que otro proceso (balance/watch)
        // nos pise la navegación (race conditions).
        const activity = await pageLock.runExclusive(async () => {
            const currentUrl = page.url();

            // Si fresh=true o no estamos en activities, navegar
            if (fresh || !currentUrl.includes('/activities')) {
                if (verbose) console.log('[ActivityService] Navigating to /activities...');
                await page.goto('https://www.mercadopago.com.ar/activities', {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                await page.waitForTimeout(2000);
            }

            // Si fresh=true, intentar refrescar la página
            if (fresh) {
                await refreshActivityPage(page, verbose);
            }

            return await scrapeActivity(page, verbose);
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

/**
 * Corrige timestamps que vienen de serverMP
 * serverMP envía hora local de Argentina pero con tag UTC (Z)
 * Esto causa un offset de -3 horas en la visualización
 */
function _fixTimestampUTC(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') return timestamp;

    try {
        const date = new Date(timestamp);
        // Sumar 3 horas (180 minutos) para compensar offset ART
        date.setUTCHours(date.getUTCHours() + 3);
        return date.toISOString();
    } catch (e) {
        console.warn(`[TIMESTAMP_FIX] ❌ Error: ${e.message}`);
        return timestamp;
    }
}

module.exports = {
    getActivity,
    scrapeActivity,
    scrapeActivityAllPages,
    refreshActivityPage,
    warmupCache
};
