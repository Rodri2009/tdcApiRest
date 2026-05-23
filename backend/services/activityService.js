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

        // STRATEGY 1: If plantilla failed, try window._n in-page structured data
        // Supports both new API (pageProps.listData.groups) and old API (pageProps.activities.results)
        if (!transactions || transactions.length === 0) {
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
                            // CRITICAL FIX: Detectar la zona horaria del navegador para conversiones correctas
                            const timeMap = {};
                            try {
                                // Detectar offset de zona horaria del navegador (en minutos)
                                // getTimezoneOffset() devuelve -(hours from UTC) * 60
                                // Ej: UTC-3 (Argentina) → devuelve 180 (positivo)
                                // Ej: UTC+3 (Moscú) → devuelve -180 (negativo)
                                const browserTzOffsetMinutes = new Date().getTimezoneOffset();
                                const browserTzOffsetHours = browserTzOffsetMinutes / 60;  // Positivo = west of UTC, Negativo = east
                                
                                // El HTML siempre muestra en zona horaria local del navegador
                                // Para convertir a UTC: restar el offset del navegador
                                // Ej si navegador es UTC+3: offset = -180min = -3h
                                //   Restar -3 = sumar 3, para pasar de UTC+3 a UTC
                                const correctionHours = -browserTzOffsetHours;
                                
                                // Mapa: data-transaction-id → datetime
                                document.querySelectorAll('li[data-transaction-id] time.fuji-activities__date, li[data-transaction-id] time[datetime]').forEach(timeEl => {
                                    const li = timeEl.closest('li[data-transaction-id]');
                                    if (li) {
                                        const txId = li.getAttribute('data-transaction-id');
                                        const iso = timeEl.getAttribute('datetime');
                                        const raw = (timeEl.getAttribute('title') || timeEl.textContent || '').trim();
                                        const tm = raw.match(/(\d{1,2}):(\d{2})/);
                                        let creationDate = null;
                                        if (iso && tm) {
                                            try {
                                                // iso format: "2026-05-22" (fecha del navegador)
                                                // tm: ["17:42", "17", "42"] (hora del navegador)
                                                // Crear fecha UTC y aplicar corrección para pasar a UTC
                                                const d = new Date(iso + 'T00:00:00Z');
                                                const displayHour = Number(tm[1]);
                                                const displayMin = Number(tm[2]);
                                                const utcHour = displayHour + correctionHours;
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
                                // Fallback: si no encontramos por ID, busca por posición
                                if (Object.keys(timeMap).length === 0) {
                                    const browserTzOffsetMinutes = new Date().getTimezoneOffset();
                                    const correctionHours = -(browserTzOffsetMinutes / 60);
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
                                                const utcHour = displayHour + correctionHours;
                                                d.setUTCHours(utcHour, displayMin, 0, 0);
                                                creationDate = d.toISOString();
                                            } catch (e) { }
                                        } else if (iso) {
                                            creationDate = iso + 'T00:00:00.000Z';
                                        }
                                        timeMap[idx] = creationDate;
                                    });
                                }
                            } catch (e) { }

                            return flat.map((item, idx) => {
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
                            });
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

            if (transactions && transactions.length > 0) {
                console.info('[ActivityService] Extracted %d structured activities from in-page object', transactions.length);
                // Log sample transactions with their timestamps
                console.log('[🕷️  SCRAPER] 📊 Sample de transacciones extraídas:');
                transactions.slice(0, 5).forEach((tx, idx) => {
                    console.log(`  [${idx}] ID: ${tx.id} | Tipo: ${tx.type} | Monto: ${tx.amount} | dateTime: ${tx.dateTime} | creationDate: ${tx.creationDate}`);
                });
            } else {
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

        // Aplicar fix de zona horaria a timestamps (sin logs detallados - muy ruidoso)
        deduplicated.forEach((tx) => {
            if (tx.dateTime) {
                tx.dateTime = _fixTimestampUTC(tx.dateTime);
            }
            if (tx.creationDate) {
                tx.creationDate = _fixTimestampUTC(tx.creationDate);
            }
        });

        // Log first 10 transactions for debugging (only if verbose)
        if (verbose) {
            console.log(`[ActivityService] 📋 MUESTRA DE TRANSACCIONES EXTRAÍDAS (primeras 10):`);
            deduplicated.slice(0, 10).forEach((tx, idx) => {
                console.log(`  [${idx}] ${tx.dateTime || tx.creationDate} | ${(tx.title || 'sin título').substring(0, 50)} | $${tx.amount}`);
            });
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
 * @returns {Object} {transactions: [], totalPages: number, totalCount: number}
 */
async function scrapeActivityAllPages(page, maxPages = 20, onProgress = null) {
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

        while (hasNextPage && pageCount < maxPages) {
            pageCount++;
            console.log(`\n[ActivityService] 📄 PÁGINA ${pageCount}:`);
            console.log(`[ActivityService] ───────────────────────────────────────`);
            emit({ type: 'page_start', page: pageCount, maxPages });

            // ANTES: Obtener count de elementos para detectar si se refrescan
            let countBefore = 0;
            try {
                countBefore = await page.evaluate(() => {
                    return document.querySelectorAll('li.ui-rowfeed-container, [data-testid="transaction-item"]').length;
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
                    const fingerprint = pageResult.transactions
                        .slice(0, 5)
                        .map(tx => `${tx.dateTime || tx.creationDate || ''}|${tx.title || tx.description || ''}|${tx.amount}`)
                        .join(';');

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
                        prevPageFingerprint = fingerprint;
                        allTransactions = allTransactions.concat(pageResult.transactions);
                        console.log(`[ActivityService] ✅ Extraídas ${pageResult.transactions.length} transacciones (total acumulado: ${allTransactions.length})`);
                        emit({
                            type: 'page_done',
                            page: pageCount,
                            count: pageResult.transactions.length,
                            total: allTransactions.length,
                            transactions: pageResult.transactions.map(tx => ({
                                id: tx.id,
                                title: tx.title || tx.description || '',
                                amount: tx.amount,
                                dateTime: tx.dateTime || tx.creationDate || null,
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
                    return document.querySelectorAll('li.ui-rowfeed-container, [data-testid="transaction-item"]').length;
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
                    // Buscar el botón
                    let nextButton = await page.$('#_R_2nll2e_');

                    if (!nextButton) {
                        nextButton = await page.$('button[aria-label*="siguiente"]');
                    }
                    if (!nextButton) {
                        nextButton = await page.$('button[aria-label*="Siguiente"]');
                    }

                    if (nextButton) {
                        // Verificar si está deshabilitado
                        let isDisabled = false;
                        try {
                            isDisabled = await nextButton.evaluate(btn => btn.disabled || btn.getAttribute('aria-disabled') === 'true');
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

                            // Guardar primer item ANTES del click
                            let firstItemBefore = null;
                            try {
                                firstItemBefore = await page.evaluate(() => {
                                    const items = document.querySelectorAll('li.ui-rowfeed-container, [data-testid="transaction-item"]');
                                    return items.length > 0 ? items[0].textContent.slice(0, 40) : null;
                                });
                            } catch (err) {
                                if (!err.message.includes('Execution context was destroyed')) throw err;
                            }

                            // Hacer el click
                            await nextButton.click();

                            // Esperar (AUMENTADO a 3 segundos para que MPs refresh completo se termine)
                            console.log('[ActivityService] ⏳ Esperando 3s para estabilización...');
                            await page.waitForTimeout(3000);

                            // Verificar si el contenido cambió
                            let firstItemAfter = null;
                            let contentChanged = true;
                            try {
                                firstItemAfter = await page.evaluate(() => {
                                    const items = document.querySelectorAll('li.ui-rowfeed-container, [data-testid="transaction-item"]');
                                    return items.length > 0 ? items[0].textContent.slice(0, 40) : null;
                                });

                                if (firstItemBefore === firstItemAfter && firstItemBefore) {
                                    console.warn(`[ActivityService] ⚠️  Contenido NO cambió (mismo primer item)`);
                                    contentChanged = false;
                                    retryCount++;
                                } else {
                                    console.log(`[ActivityService] ✓ Contenido CAMBIÓ, nueva página cargada`);
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

                            // Esperar a que DOM se actualice
                            if (contentChanged) {
                                try {
                                    await page.waitForFunction(
                                        () => document.querySelectorAll('li.ui-rowfeed-container, [data-testid="transaction-item"]').length > 0,
                                        { timeout: 3000 }
                                    );
                                } catch (e) {
                                    console.warn('[ActivityService] ⚠️  Timeout esperando DOM');
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
                console.warn(`[ActivityService] ⚠️  MAX REINTENTOS alcanzados en página ${pageCount} → deteniendo`);
                hasNextPage = false;
            }

            // Límite de páginas
            if (pageCount >= maxPages) {
                console.log(`[ActivityService] ⚠️  LÍMITE de ${maxPages} páginas alcanzado`);
                hasNextPage = false;
            }
        }

        console.log(`\n[ActivityService] ═══════════════════════════════════════════`);
        console.log(`[ActivityService] ✅ SCRAPING COMPLETADO`);
        console.log(`[ActivityService] ═══════════════════════════════════════════`);
        console.log(`[ActivityService] • Transacciones extraídas: ${allTransactions.length}`);
        console.log(`[ActivityService] • Páginas paginadas: ${pageCount}`);

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
