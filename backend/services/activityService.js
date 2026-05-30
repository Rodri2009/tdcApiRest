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
async function scrapeActivity(page, verbose = true, dateFrom = null, dateTo = null, sequenceOffset = 0) {
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

                                    const rawTitle = (item.title || '').trim();
                                    const rawDescription = (item.description || '').trim();
                                    const looksLikePerson = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4}$/.test(rawDescription);
                                    const genericTitle = /^(?:transferencia(?: recibida| enviada)?|ingreso|egreso|pago(?:s)?|compra|venta|income|in_money|out|payment|deposito|acreditad[oa]|abonad[oa]|recibid[oa]|cobro)$/i.test(rawTitle);
                                    const title = genericTitle && looksLikePerson ? rawDescription : rawTitle || rawDescription;
                                    const description = title !== rawDescription ? rawDescription : rawTitle;

                                    return {
                                        id: item.id || `activity-${idx}`,
                                        name: title,
                                        title,
                                        category: normCategory,
                                        description: description || '',
                                        amount: item.amount ? item.amount.fraction : null,
                                        currency: (item.amount && item.amount.currency_id) || 'ARS',
                                        symbol: (item.amount && item.amount.symbol) || '$',
                                        dateTime: item.grouperDate?.value || item.date || item._groupDate || null,
                                        // Use item.creationDate when available, otherwise fallback to mapped DOM time
                                        creationDate: item.creationDate || timeByIdOrIdx,
                                        // Nota: Mercado Pago puede entregar códigos internos como transfer_mo_payout_movement
                                        // o subcategories de pago que no son directos. Los normalizamos aquí para que el servicio
                                        // trate estos casos como ingresos, pagos o transferencias estandarizadas.
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
                        return results.map((item, idx) => {
                            const rawTitle = (item.title || '').trim();
                            const rawDescription = (item.description || '').trim();
                            const looksLikePerson = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4}$/.test(rawDescription);
                            const genericTitle = /^(?:transferencia(?: recibida| enviada)?|ingreso|egreso|pago(?:s)?|compra|venta|income|in_money|out|payment|deposito|acreditad[oa]|abonad[oa]|recibid[oa]|cobro)$/i.test(rawTitle);
                            const title = genericTitle && looksLikePerson ? rawDescription : rawTitle || rawDescription;
                            const description = title !== rawDescription ? rawDescription : rawTitle;
                            return {
                                id: item.id || `activity-${idx}`,
                                name: title,
                                title,
                                category: item.category || item.subCategory || '',
                                description: description || '',
                                amount: item.amount ? item.amount.fraction : null,
                                currency: item.amount ? item.amount.currency_id : 'ARS',
                                symbol: item.amount ? item.amount.symbol : '$',
                                dateTime: item.grouperDate?.value || item.creationDate || null,
                                creationDate: item.creationDate || null,
                                type: item.entity || (item.category === 'transfers' ? 'transfer' : item.category),
                                raw: JSON.stringify(item).slice(0, 300),
                                _isStructured: true,
                                _source: 'in-page-json'
                            };
                        });
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
            } else if (transactions && transactions.length > 0) {
                // no-op: ocultamos la lista RAW para reducir ruido
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

                    // NEW FALLBACK: Mercado Pago current markup uses grouped date blocks with .group-divider + .list-group-items
                    const groupBlocks = Array.from(document.querySelectorAll('#_R_qllie_ > div'));
                    if (groupBlocks.length > 0) {
                        const groupedItems = [];

                        groupBlocks.forEach((group) => {
                            const groupDate = group.querySelector('.group-divider')?.textContent.trim() || '';
                            const rows = Array.from(group.querySelectorAll('.list-group-items .andes-ui-list__item.fuji-activities'));

                            rows.forEach((row, idx) => {
                                const title = row.querySelector('.fuji-activities__title')?.textContent.trim() || '';
                                const description = row.querySelector('.fuji-activities__description')?.textContent.trim() || '';
                                const amountEl = row.querySelector('.andes-ui-money-amount__fraction');
                                const amountText = amountEl ? amountEl.textContent.trim() : row.querySelector('.fuji-activities__amount')?.textContent.trim() || '';
                                const sign = row.querySelector('.andes-ui-money-amount__negative-symbol') ? '-' : '+';
                                const timeEl = row.querySelector('time.fuji-activities__date');
                                const timeText = timeEl?.textContent.trim() || '';
                                const href = row.querySelector('a.andes-ui-list__item-actionable')?.href || row.querySelector('a')?.href || '';
                                const raw = row.innerText || row.textContent || '';
                                const computedDateTime = groupDate ? `${groupDate} ${timeText}` : timeText;
                                const creationDate = computedDateTime || null;

                                groupedItems.push({
                                    id: href ? href.split('/').pop() : (row.id || `tx-${idx}`),
                                    title: title || description || '',
                                    description: description || '',
                                    amount: `${sign}${amountText}`.replace(/\s+/g, ''),
                                    currency: 'ARS',
                                    symbol: '$',
                                    dateTime: computedDateTime,
                                    creationDate,
                                    date: groupDate || '',
                                    time: timeText,
                                    href,
                                    raw,
                                    _source: 'dom-fuji-activities-grouped'
                                });
                            });
                        });

                        if (groupedItems.length > 0) {
                            return groupedItems;
                        }
                    }

                    // NEW FALLBACK: Mercado Pago current markup uses fuji-activities rows inside an Andes UI list
                    const fujiRows = Array.from(document.querySelectorAll('li.andes-ui-list__item.fuji-activities'));
                    if (fujiRows.length > 0) {
                        return fujiRows.map((row, idx) => {
                            const title = row.querySelector('.fuji-activities__title')?.textContent.trim() || '';
                            const description = row.querySelector('.fuji-activities__description')?.textContent.trim() || '';
                            const amountEl = row.querySelector('.andes-ui-money-amount__fraction');
                            const amountText = amountEl ? amountEl.textContent.trim() : row.querySelector('.fuji-activities__amount')?.textContent.trim() || '';
                            const sign = row.querySelector('.andes-ui-money-amount__negative-symbol') ? '-' : '+';
                            const amount = `${sign}${amountText}`.replace(/\s+/g, '');
                            const timeEl = row.querySelector('time.fuji-activities__date');
                            const timeText = timeEl?.textContent.trim() || '';
                            const dateLabel = timeEl?.getAttribute('aria-label')?.trim() || '';
                            const isoDate = timeEl?.getAttribute('datetime')?.trim() || '';
                            const groupDate = row.closest('.list-group-items')?.previousElementSibling?.textContent.trim() || '';
                            const href = row.querySelector('a.andes-ui-list__item-actionable')?.href || '';
                            const raw = row.innerText || row.textContent || '';
                            const computedDateTime = dateLabel
                                ? `${dateLabel} ${timeText}`
                                : (groupDate ? `${groupDate} ${timeText}` : timeText);
                            const computedCreationDate = dateLabel && timeText
                                ? `${dateLabel} ${timeText}`
                                : isoDate && timeText
                                    ? `${isoDate} ${timeText}`
                                    : isoDate
                                        ? `${isoDate}T00:00:00.000Z`
                                        : null;
                            return {
                                id: href ? href.split('/').pop() : (row.id || `tx-${idx}`),
                                title: title || description || '',
                                description: description || '',
                                amount: amount,
                                currency: 'ARS',
                                symbol: '$',
                                dateTime: computedDateTime,
                                creationDate: computedCreationDate,
                                date: groupDate || '',
                                time: timeText,
                                href,
                                raw,
                                _source: 'dom-fuji-activities'
                            };
                        });
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
                const spanishDate = (dateStr || '').match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?/i);

                const isoFromParts = (y, m, d, h, mn) => {
                    try {
                        // Convertir hora Argentina (UTC-3) a UTC
                        const utcMillis = Date.UTC(y, m - 1, d, (h || 0) + 3, mn || 0);
                        return new Date(utcMillis).toISOString();
                    } catch (e) {
                        return null;
                    }
                };

                // Manejar "Hoy" y "Ayer" (grupo del día actual/anterior en MP)
                const baseArgDate = new Date(Date.now() + 3 * 3600 * 1000);
                const trimmedDate = (dateStr || '').trim().toLowerCase();
                if (trimmedDate === 'hoy' || trimmedDate === 'ayer') {
                    const base = new Date(baseArgDate);
                    if (trimmedDate === 'ayer') base.setUTCDate(base.getUTCDate() - 1);
                    if (timeMatch) {
                        return isoFromParts(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(),
                            Number(timeMatch[1]), Number(timeMatch[2]));
                    }
                    return isoFromParts(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
                }

                if (spanishDate) {
                    const day = Number(spanishDate[1]);
                    const monthName = spanishDate[2].toLowerCase();
                    const month = monthMap[monthName] || (new Date()).getMonth() + 1;
                    const year = spanishDate[3] ? Number(spanishDate[3]) : (new Date()).getFullYear();
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
                console.log('[ActivityService] Fragment discard: amount=%d, title="%s", date="%s"', tx.amount, tx.title || tx.description || tx.raw || '', tx.dateTime || tx.creationDate || '');
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

            // Extraer nombre/descripción significativa para la clave de deduplicación
            const titleSource = (tx.title || tx.description || tx.raw || '').toLowerCase();
            const nameMatch = titleSource.match(/^([a-záéíóúñ0-9\s]+)/i);
            const fallbackName = titleSource.replace(/[^a-záéíóúñ0-9\s]/gi, ' ').trim().substring(0, 50);
            const name = (nameMatch && nameMatch[1]) ? nameMatch[1].trim().substring(0, 50) : fallbackName;

            // Crear clave: tipo + nombre + monto + timestamp
            // Incluir más información para diferenciar transacciones similares
            const typePattern = keywords.join('|') || 'OTHER';
            const amountRounded = Math.abs(tx.amount);
            const timestamp = (tx.dateTime || tx.creationDate || '').substring(0, 19) || 'unknown'; // YYYY-MM-DDTHH:MM:SS
            const key = `${typePattern}|${name}|${amountRounded}|${timestamp}`;

            if (!seen.has(key)) {
                seen.set(key, tx);
                deduplicated.push(tx);
                // Deduplicación detectada (silencioso en logs normales)
            } else {
                const existing = seen.get(key);
                const existingLabel = `${existing.title || existing.description || existing.raw || 'sin título'} | ${existing.dateTime || existing.creationDate || 'sin fecha'} | ${existing.amount}`;
                const duplicateLabel = `${tx.title || tx.description || tx.raw || 'sin título'} | ${tx.dateTime || tx.creationDate || 'sin fecha'} | ${tx.amount}`;
                if ((tx.raw || '').length > (existing.raw || '').length) {
                    const idx = deduplicated.indexOf(existing);
                    if (idx >= 0) deduplicated[idx] = tx;
                    seen.set(key, tx);
                    console.log('[ActivityService] Duplicate found, replacing existing transaction with richer one: key="%s" | existing="%s" | new="%s"', key, existingLabel, duplicateLabel);
                } else {
                    console.log('[ActivityService] Duplicate found, discarding transaction: key="%s" | existing="%s" | duplicate="%s"', key, existingLabel, duplicateLabel);
                }
            }
        }

        // If we used plantilla (STRATEGY 0), enrich with creationDate from DOM
        // since plantilla doesn't have precise timestamps
        // NOTE: This enrichment happens INSIDE page.evaluate() via STRATEGY 0 modification
        // The transactions object should already have creationDate if DOM extraction was successful

        console.log(`[ActivityService] Scraped ${transactions.length} transacciones crudas desde MP, ${withAmount.length} con monto significativo, deduplicadas a ${deduplicated.length} transacciones finales`);
        console.log('[ActivityService] Detalle de conteos: crudo=%d, significativos=%d, finales=%d', transactions.length, withAmount.length, deduplicated.length);

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

            const filteredDeduplicated = (dateFrom && dateTo)
                ? deduplicated.filter(tx => {
                    const txDate = parseMercadoPagoDate(tx.creationDate || tx.dateTime || '');
                    return !isNaN(txDate) && txDate >= dateFrom && txDate <= dateTo;
                })
                : deduplicated;

            console.log(`[🕷️  SCRAPER] ┌── FINAL TRAS NORMALIZACIÓN Y DEDUPLICACIÓN (hora Argentina = lo que ves en MP) ──`);
            console.log(`[🕷️  SCRAPER] │ Total transacciones después de deduplicar: ${filteredDeduplicated.length}`);
            console.log(`[🕷️  SCRAPER] └── Fin resumen de página`);
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

    const parseMpDate = parseMercadoPagoDate;

    const getArgentinaDateParts = (date) => {
        const parts = new Intl.DateTimeFormat('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).formatToParts(date);
        const result = {};
        for (const part of parts) {
            if (part.type !== 'literal') result[part.type] = part.value;
        }
        return result;
    };

    const formatArgentinaDateLabel = (date) => {
        if (!date) return '';
        const parts = getArgentinaDateParts(date);
        const nowParts = getArgentinaDateParts(new Date());
        const isToday = parts.year === nowParts.year && parts.month === nowParts.month && parts.day === nowParts.day;
        if (isToday) return 'Hoy';
        const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(date);
        return `${Number(parts.day)} de ${monthName}`;
    };

    const formatArgentinaHour = (date) => {
        if (!date) return '';
        const parts = getArgentinaDateParts(date);
        return `${parts.hour}:${parts.minute} hs`;
    };

    const formatAmount = (amount) => {
        if (amount === undefined || amount === null || amount === '') return '';
        const value = Number(amount);
        if (isNaN(value)) return String(amount);
        const formatted = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.abs(value));
        return value < 0 ? `-${formatted}` : `${formatted}`;
    };

    const buildTransactionLogItem = (tx) => {
        const dateValue = parseMpDate(tx.creationDate || tx.dateTime || tx.grouperDate?.value || '');
        const titulo = (tx.name || tx.title || tx.description || '').trim();
        const descripcion = tx.description && tx.description !== titulo ? tx.description.trim() : '';
        return {
            fecha: formatArgentinaDateLabel(dateValue),
            hora: formatArgentinaHour(dateValue),
            titulo,
            descripcion,
            monto: formatAmount(tx.amount),
        };
    };

    const formatArgentinaPeriod = (date) => {
        if (!date) return '';
        const label = formatArgentinaDateLabel(date);
        const hour = formatArgentinaHour(date);
        return `${label} a las ${hour}`;
    };

    const groupTransactionsByDate = (transactions) => {
        const grouped = new Map();
        for (const tx of transactions) {
            const dateValue = parseMpDate(tx.creationDate || tx.dateTime || tx.grouperDate?.value || '');
            const label = formatArgentinaDateLabel(dateValue) || 'Sin fecha';
            if (!grouped.has(label)) grouped.set(label, []);
            grouped.get(label).push({ tx, dateValue });
        }
        return Array.from(grouped.entries()).map(([label, items]) => ({
            label,
            items: items.sort((a, b) => b.dateValue - a.dateValue).map((item) => item.tx)
        })).sort((a, b) => {
            const aDate = parseMpDate(a.items[0]?.creationDate || a.items[0]?.dateTime || a.items[0]?.grouperDate?.value || '');
            const bDate = parseMpDate(b.items[0]?.creationDate || b.items[0]?.dateTime || b.items[0]?.grouperDate?.value || '');
            return bDate - aDate;
        });
    };

    const logPageTransactions = (pageNumber, transactions) => {
        console.log(`[ActivityService] Página actual: ${pageNumber}`);
        if (!transactions || transactions.length === 0) {
            console.log('[ActivityService]   No hay transacciones del período en esta página.');
            return;
        }
        const grouped = groupTransactionsByDate(transactions);
        grouped.forEach((group) => {
            console.log(`[ActivityService]   Fecha ${group.label}`);
            group.items.forEach((tx, index) => {
                const item = buildTransactionLogItem(tx);
                console.log(`    transacción ${index + 1}: ${item.hora} | ${item.titulo} | ${item.descripcion || 'sin descripción'} | ${item.monto}`);
            });
        });
    };

    // ── PAUSAR EL WATCH SERVICE ──────────────────────────────────────────────
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
        const limitedPages = typeof maxPages === 'number' && !Number.isNaN(maxPages) && maxPages > 0 ? maxPages : Infinity;
        const pageLimitLabel = Number.isFinite(limitedPages) ? limitedPages : 'Ilimitado';
        if (dateFrom && dateTo) {
            console.log(`[🕷️  SCRAPER] Petición: Período buscado ${formatArgentinaPeriod(dateFrom)} → ${formatArgentinaPeriod(dateTo)}, Cantidad de páginas: ${pageLimitLabel}`);
        }
        if (dateFrom && dateTo) {
            console.log(`[ActivityService] Período buscado desde el ${formatArgentinaPeriod(dateFrom)} hasta el ${formatArgentinaPeriod(dateTo)}`);
        }
        console.log('[ActivityService] Se pausa el timer de MP...');
        console.log('[ActivityService] 🔄 Iniciando scraping paginado de todas las actividades...');
        emit({ type: 'status', message: '🔄 Iniciando scraping...' });

        const ensureActivitiesPage = async () => {
            try {
                const currentUrl = page.url();
                console.log(`[ActivityService] currentUrl before scraping: ${currentUrl}`);
                if (!currentUrl || !currentUrl.includes('/activities')) {
                    console.log('[ActivityService] Navegando a https://www.mercadopago.com.ar/activities...');
                    await page.goto('https://www.mercadopago.com.ar/activities', { waitUntil: 'networkidle2', timeout: 45000 });
                    try {
                        await page.waitForTimeout(2000);
                    } catch (waitErr) {
                        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 2000)));
                    }
                    console.log('[ActivityService] currentUrl after navigation:', page.url());
                }
            } catch (err) {
                console.warn('[ActivityService] ⚠️  Error al navegar a activities:', err.message);
            }
        };

        await ensureActivitiesPage();

        const urlValidation = await validateCurrentUrl(page, '/activities');
        if (!urlValidation.valid) {
            throw new Error(`URL validation failed: ${urlValidation.reason}`);
        }

        console.log('[ActivityService] 🔒 Intentando congelar timers de MP...');
        emit({ type: 'status', message: '🔒 Pausando refresh automático de MP...' });

        let freezeSuccess = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await page.evaluate(() => {
                    const origSetTimeout = window.setTimeout;
                    const origSetInterval = window.setInterval;
                    window.setTimeout = () => -1;
                    window.setInterval = () => -1;

                    try {
                        const highId = origSetInterval(() => { }, 99999999);
                        for (let i = 1; i <= Math.min(highId, 10000); i++) {
                            clearTimeout(i);
                            clearInterval(i);
                        }
                    } catch (e) { }

                    console.log('✅ Timers básicos congelados');
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
        const pageResults = [];
        let pageCount = 0;
        let hasNextPage = true;
        let domRefreshCount = 0;
        let navigationErrors = 0;
        let prevPageFingerprint = null;
        let periodFoundInPages = false;
        let pageLogOffset = 0;
        const seenTransactionIds = new Set();
        const seenTransactionKeys = new Set();

        const buildTransactionLogKey = (tx) => {
            const timestamp = tx.creationDate || tx.dateTime || '';
            const title = (tx.title || tx.description || '').trim().replace(/\s+/g, ' ').substring(0, 120);
            const amount = tx.amount !== undefined && tx.amount !== null ? String(tx.amount) : '';
            if (tx.id) return `ID|${tx.id}`;
            return `KEY|${timestamp}|${amount}|${title}`;
        };

        const findNextButtonHandle = async () => {
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
                try {
                    const handle = await page.$(selector);
                    if (handle) return handle;
                } catch (e) {
                    // ignore selector lookup failures
                }
            }

            const buttons = await page.$$('button, a[role="button"], div[role="button"]');
            for (const btn of buttons) {
                try {
                    const text = await page.evaluate(el => el.innerText || el.textContent || '', btn);
                    if (/siguiente|next/i.test(text)) return btn;
                } catch (e) {
                    // ignore evaluation failures
                }
            }
            return null;
        };

        const getPageRowsFingerprint = async () => {
            return page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('li.andes-ui-list__item.fuji-activities')).slice(0, 20);
                const summaries = rows.map(row => {
                    const timeEl = row.querySelector('time.fuji-activities__date, time[datetime]');
                    const dateText = timeEl ? (timeEl.getAttribute('datetime') || timeEl.getAttribute('title') || timeEl.textContent || '').trim() : '';
                    const titleEl = row.querySelector('.fuji-activities__title, h3, h4, [class*=\"title\"], [data-testid*=\"merchant\"], [data-testid*=\"title\"]');
                    const titleText = titleEl ? titleEl.textContent.trim() : '';
                    const amountEl = row.querySelector('.andes-ui-money-amount__fraction, .fuji-activities__amount, [class*=\"amount\"], [data-testid*=\"amount\"], [data-test=\"amount\"]');
                    let amountText = amountEl ? amountEl.textContent.trim() : '';
                    if (!amountText) {
                        const text = row.innerText || '';
                        const match = text.match(/[+\-]\s*\$?[0-9]+(?:[\.,][0-9]{2,3})*/);
                        amountText = match ? match[0].trim() : '';
                    }
                    return `${dateText}|${titleText}|${amountText}`.replace(/\s+/g, ' ');
                });
                if (summaries.length > 0) {
                    return summaries.join('||');
                }
                const text = document.body.innerText || '';
                return `BODY|${text.slice(0, 200)}`;
            });
        };

        while (hasNextPage && pageCount < limitedPages) {
            pageCount++;
            console.log(`
[🕷️  SCRAPER] ═══ INICIO DE EXTRACCIÓN PÁGINA ${pageCount} ═══`);
            emit({ type: 'page_start', page: pageCount, maxPages: Number.isFinite(limitedPages) ? limitedPages : null });

            let countBefore = 0;
            try {
                countBefore = await page.evaluate(() => document.querySelectorAll('li.andes-ui-list__item.fuji-activities').length);
            } catch (err) {
                if (err.message && err.message.includes('Execution context was destroyed')) {
                    console.warn('[ActivityService] 🔄 ALERTA: Refresh detectado ANTES del scraping');
                    await page.waitForTimeout(2000);
                    countBefore = 0;
                } else {
                    throw err;
                }
            }

            console.log(`[ActivityService] ↳ Elementos detectados antes: ${countBefore}`);

            try {
                const pageResult = await scrapeActivity(page, true, dateFrom, dateTo, pageLogOffset);
                if (pageResult && pageResult.transactions && Array.isArray(pageResult.transactions)) {
                    const fingerprint = pageResult.transactions
                        .slice(0, 10)
                        .map(tx => `${tx.dateTime || tx.creationDate || ''}|${tx.title || tx.description || ''}|${tx.amount}`)
                        .join(';');

                    if (prevPageFingerprint !== null && fingerprint === prevPageFingerprint) {
                        console.warn(`[ActivityService] 🔁 PÁGINA DUPLICADA detectada en página ${pageCount} — MP redirigió al inicio. Abortando.`);
                        emit({ type: 'page_duplicate', page: pageCount, message: `🔁 Página ${pageCount} = Página ${pageCount - 1}: MP redirigió al inicio. Scraping detenido para evitar datos incorrectos.` });
                        hasNextPage = false;
                    } else {
                        prevPageFingerprint = fingerprint;
                        const rawPageTransactions = pageResult.transactions || [];
                        const uniquePageTransactions = [];
                        rawPageTransactions.forEach(tx => {
                            const txKey = buildTransactionLogKey(tx);
                            if (seenTransactionKeys.has(txKey)) {
                                console.warn(`[ActivityService] 🔁 Transacción duplicada detectada entre páginas: ${txKey}`);
                                return;
                            }
                            seenTransactionKeys.add(txKey);
                            if (tx.id) {
                                if (seenTransactionIds.has(tx.id)) {
                                    console.warn(`[ActivityService] 🔁 Transacción duplicada por ID entre páginas: ${tx.id} | ${tx.title || tx.description || ''} | ${tx.amount}`);
                                    return;
                                }
                                seenTransactionIds.add(tx.id);
                            }
                            uniquePageTransactions.push(tx);
                        });

                        const filteredPageTransactions = (dateFrom && dateTo)
                            ? uniquePageTransactions.filter(tx => {
                                const txDate = parseMpDate(tx.creationDate || tx.dateTime || '');
                                return txDate && txDate >= dateFrom && txDate <= dateTo;
                            })
                            : uniquePageTransactions;

                        logPageTransactions(pageCount, filteredPageTransactions);

                        allTransactions = allTransactions.concat(uniquePageTransactions);
                        pageResults.push({
                            page: pageCount,
                            transactions: uniquePageTransactions,
                            filteredTransactions: filteredPageTransactions
                        });

                        let pageHasPeriod = false;
                        if (dateFrom && dateTo) {
                            pageHasPeriod = filteredPageTransactions.length > 0;
                            if (rawPageTransactions.length > 0) {
                                const lastTx = rawPageTransactions[rawPageTransactions.length - 1];
                                const lastTxDate = parseMpDate(lastTx.creationDate || lastTx.dateTime || '');
                                if (lastTxDate && lastTxDate < dateFrom) {
                                    console.log(`[ActivityService] ✅ Fecha objetivo alcanzada en página ${pageCount}: última transacción es ${lastTxDate.toISOString()} (anterior a ${dateFrom.toISOString()})`);
                                    hasNextPage = false;
                                }
                            }
                            if (pageHasPeriod) periodFoundInPages = true;
                        }

                        console.log(`[🕷️  SCRAPER] ${rawPageTransactions.length} transacciones en página ${pageCount} (${filteredPageTransactions.length} dentro del período). Total acumulado: ${allTransactions.length}`);
                        if (pageHasPeriod) {
                            console.log(`[🕷️  SCRAPER] ✅ Período buscado encontrado en esta página`);
                        } else if (dateFrom && dateTo) {
                            console.log(`[🕷️  SCRAPER] ⏸️  Período NO encontrado en esta página (transacciones fuera de rango)`);
                        }
                        const pageSummary = {
                            type: 'page_done',
                            page: pageCount,
                            count: filteredPageTransactions.length,
                            rawCount: rawPageTransactions.length,
                            total: allTransactions.length,
                            sampleDates: rawPageTransactions.slice(0, 4).map(tx => ({
                                title: tx.title,
                                creationDate: tx.creationDate || null,
                                dateTime: tx.dateTime || null
                            }))
                        };
                        if (filteredPageTransactions.length > 0) {
                            const firstTx = filteredPageTransactions[0];
                            const lastTx = filteredPageTransactions[filteredPageTransactions.length - 1];
                            pageSummary.firstTransaction = {
                                id: firstTx.id,
                                title: firstTx.title || firstTx.description || '',
                                amount: firstTx.amount,
                                dateTime: firstTx.creationDate || firstTx.dateTime || null
                            };
                            pageSummary.lastTransaction = {
                                id: lastTx.id,
                                title: lastTx.title || lastTx.description || '',
                                amount: lastTx.amount,
                                dateTime: lastTx.creationDate || lastTx.dateTime || null
                            };
                        }
                        emit(pageSummary);
                        pageLogOffset += filteredPageTransactions.length;
                    }
                }
            } catch (err) {
                if (err.message && err.message.includes('Execution context was destroyed')) {
                    console.warn(`[ActivityService] 🔄 ALERTA: Refresh durante scraping en página ${pageCount}`);
                    navigationErrors++;
                    emit({ type: 'warning', message: `⚠️ Página ${pageCount}: refresh detectado, reintentando...` });
                    await page.waitForTimeout(2000);
                } else {
                    console.warn(`[ActivityService] ⚠️  Error extrayendo página ${pageCount}:`, err.message);
                    emit({ type: 'warning', message: `⚠️ Página ${pageCount}: ${err.message}` });
                }
            }

            let countAfter = 0;
            try {
                countAfter = await page.evaluate(() => document.querySelectorAll('li.andes-ui-list__item.fuji-activities').length);
            } catch (err) {
                if (err.message && err.message.includes('Execution context was destroyed')) {
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

            if (Number.isFinite(limitedPages) && pageCount >= limitedPages) {
                console.log(`[ActivityService] ⚠️  LÍMITE de ${limitedPages} páginas alcanzado; no se intentará avanzar a la siguiente página`);
                hasNextPage = false;
            } else if (hasNextPage) {
                try {
                    const pageUrl = new URL(page.url());
                    const currentPageNum = Number(pageUrl.searchParams.get('page')) || 1;
                    const nextPageNum = currentPageNum + 1;
                    pageUrl.searchParams.set('page', String(nextPageNum));
                    const nextUrl = pageUrl.toString();

                    console.log(`[ActivityService] ➡️  Navegando a página siguiente: ${nextUrl}`);
                    await page.goto(nextUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                    await page.waitForFunction(() => {
                        return document.querySelectorAll('li.andes-ui-list__item.fuji-activities').length > 0 || document.querySelector('#_r_30_');
                    }, { polling: 'mutation', timeout: 15000 });
                    console.log(`[ActivityService] ✅ Página siguiente cargada: ${nextPageNum}`);
                } catch (err) {
                    navigationErrors++;
                    console.warn(`[ActivityService] ⚠️ No se pudo navegar a siguiente página: ${err.message}`);
                    hasNextPage = false;
                }
            }

            console.log(`[🕷️  SCRAPER] ═══ FIN DE EXTRACCIÓN PÁGINA ${pageCount} ═══
`);
        }

        console.log('\n\n[🕷️  SCRAPER] ╔════════════════════════════════════════╗');
        console.log('[🕷️  SCRAPER] ║  FIN DE ESCRAPEADO PARA IMPORTACIÓN   ║');
        console.log('[🕷️  SCRAPER] ╚════════════════════════════════════════╝');
        if (dateFrom && dateTo) {
            if (periodFoundInPages) {
                console.log('[🕷️  SCRAPER] ✅ PERÍODO BUSCADO: Encontrado en el scraping realizado');
            } else if (Number.isFinite(limitedPages) && pageCount >= limitedPages) {
                console.log(`[🕷️  SCRAPER] ⚠️  PERÍODO BUSCADO: NO encontrado (se alcanzó límite de ${limitedPages} páginas)`);
            } else {
                console.log('[🕷️  SCRAPER] ✅ PERÍODO BUSCADO: No hay más transacciones (fin del historial)');
            }
        }
        console.log(`[ActivityService] Total de páginas recorridas: ${pageCount}`);
        console.log(`[ActivityService] Total de transacciones: ${allTransactions.length}`);
        console.log(`[ActivityService] Errores de navegación detectados: ${navigationErrors}
`);

        const seenTransactions = new Map();
        const dedupedTransactions = [];
        let duplicateCount = 0;

        const buildTransactionDedupKey = (tx) => {
            const normalizedTitle = (tx.title || tx.description || tx.raw || '').trim().replace(/\s+/g, ' ').substring(0, 120);
            const amount = tx.amount !== undefined && tx.amount !== null ? tx.amount : '';
            const timestamp = tx.creationDate || tx.dateTime || '';
            const normalizedTimestamp = timestamp ? timestamp.replace(/:\d{2}\.\d{3}Z$/, ':00.000Z') : '';
            const stableId = tx.id && !/^(activity-|tx-|mp_)/.test(tx.id) ? tx.id : null;
            const rawHash = tx.raw ? crypto.createHash('md5').update(tx.raw.trim()).digest('hex') : '';
            if (stableId) {
                return `ID|${stableId}`;
            }
            if (rawHash) {
                return `HASH|${rawHash}`;
            }
            return `FALLBACK|${normalizedTitle}|${amount}|${normalizedTimestamp}`;
        };

        allTransactions.forEach(tx => {
            const key = buildTransactionDedupKey(tx);
            if (!seenTransactions.has(key)) {
                seenTransactions.set(key, tx);
                dedupedTransactions.push(tx);
            } else {
                duplicateCount++;
                const existing = seenTransactions.get(key);
                const existingLabel = `${existing.title || existing.description || existing.raw || 'sin título'} | ${existing.creationDate || existing.dateTime || 'sin fecha'} | ${existing.amount}`;
                const duplicateLabel = `${tx.title || tx.description || tx.raw || 'sin título'} | ${tx.creationDate || tx.dateTime || 'sin fecha'} | ${tx.amount}`;
                if ((tx.raw || '').length > (existing.raw || '').length) {
                    const idx = dedupedTransactions.indexOf(existing);
                    if (idx >= 0) dedupedTransactions[idx] = tx;
                    seenTransactions.set(key, tx);
                    console.log('[ActivityService] Duplicate found, replacing existing transaction with richer one: key="%s" | existing="%s" | new="%s"', key, existingLabel, duplicateLabel);
                } else {
                    console.log('[ActivityService] Duplicate found, discarding transaction: key="%s" | existing="%s" | duplicate="%s"', key, existingLabel, duplicateLabel);
                }
            }
        });

        if (duplicateCount > 0) {
            console.log(`[ActivityService] 🔄 Deduplicación: ${allTransactions.length} → ${dedupedTransactions.length} (eliminados ${duplicateCount} duplicados entre páginas)`);
        }

        const matchesPeriod = (tx) => {
            if (!dateFrom || !dateTo) return true;
            const rawDate = tx.creationDate || tx.dateTime || tx.grouperDate?.value;
            if (!rawDate) return false;
            const txDate = parseMercadoPagoDate(rawDate);
            return txDate !== null && txDate >= dateFrom && txDate <= dateTo;
        };

        const finalTransactions = (dateFrom && dateTo)
            ? dedupedTransactions.filter(matchesPeriod)
            : dedupedTransactions;

        if (dateFrom && dateTo && finalTransactions.length !== dedupedTransactions.length) {
            console.log(`[ActivityService] ✅ Filtrado final por período: ${dedupedTransactions.length} → ${finalTransactions.length}`);
        }

        if (dateFrom && dateTo) {
            const transactionsForLog = finalTransactions.map(buildTransactionLogItem);
            console.log('[ActivityService] 📝 Transacciones dentro del período:');
            console.log(JSON.stringify(transactionsForLog, null, 2));
        }

        let pageComparison = null;
        if (pageResults.length >= 2) {
            const normalizeTx = (tx) => `${tx.id || ''}|${tx.amount || ''}|${tx.creationDate || tx.dateTime || ''}|${(tx.title || tx.description || '').trim()}`;
            const page1Txs = pageResults[0].transactions || [];
            const page2Txs = pageResults[1].transactions || [];
            const page1Keys = new Set(page1Txs.map(normalizeTx));
            const page2Keys = new Set(page2Txs.map(normalizeTx));
            const onlyPage1 = page1Txs.filter(tx => !page2Keys.has(normalizeTx(tx)));
            const onlyPage2 = page2Txs.filter(tx => !page1Keys.has(normalizeTx(tx)));
            const commonCount = page1Txs.filter(tx => page2Keys.has(normalizeTx(tx))).length;
            pageComparison = {
                page1Count: page1Txs.length,
                page2Count: page2Txs.length,
                commonCount,
                onlyPage1Count: onlyPage1.length,
                onlyPage2Count: onlyPage2.length,
                onlyPage1Sample: onlyPage1.slice(0, 5).map(tx => ({ id: tx.id, dateTime: tx.creationDate || tx.dateTime || null, title: tx.title || tx.description || '', amount: tx.amount })),
                onlyPage2Sample: onlyPage2.slice(0, 5).map(tx => ({ id: tx.id, dateTime: tx.creationDate || tx.dateTime || null, title: tx.title || tx.description || '', amount: tx.amount }))
            };
            console.log(`[ActivityService] 🔎 Comparación página 1 vs 2: página1=${page1Txs.length} página2=${page2Txs.length} comunes=${commonCount} solo1=${onlyPage1.length} solo2=${onlyPage2.length}`);
            if (onlyPage1.length > 0 || onlyPage2.length > 0) {
                console.log(`[ActivityService] 🔎 Muestras diferencias: solo página1=${onlyPage1.length}, solo página2=${onlyPage2.length}`);
            }
        }

        emit({ type: 'scraping_done', total: finalTransactions.length, pages: pageCount, navigationErrors, duplicatesRemoved: duplicateCount });
        if (domRefreshCount > 0) {
            console.warn(`[ActivityService] • Refreshes detectados: ${domRefreshCount}`);
        }
        if (navigationErrors > 0) {
            console.warn(`[ActivityService] • Errores de navegación: ${navigationErrors}`);
        }

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
            transactions: finalTransactions,
            totalPages: pageCount,
            totalCount: finalTransactions.length,
            refreshsDetected: domRefreshCount,
            navigationErrors,
            duplicatesRemoved: duplicateCount,
            source: 'manual-pagination',
            pageResults,
            pageComparison
        };
    } catch (err) {
        console.error('[ActivityService] ❌ Error en scraping paginado:', err.message);
        throw err;
    } finally {
        if (watchService) {
            try {
                watchService.start();
                console.log('[ActivityService] ▶️  TransactionWatchService reanudado');
                console.log('[ActivityService] Se reanuda el timer de MP...');
                emit({ type: 'status', message: '▶️ Watch service reanudado' });
            } catch (e) {
                console.warn('[ActivityService] ⚠️  No se pudo reanudar watch service:', e.message);
            }
        }
    }
}


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
 * Parse a Mercado Pago date string into a UTC Date.
 * Supports ISO strings, Argentina-local strings, Spanish labels, Hoy/Ayer, and human-readable group dates.
 */
function parseMercadoPagoDate(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    const raw = String(value).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!raw) return null;

    const parseArgDatetime = (year, month, day, hour = 0, minute = 0, second = 0) => {
        try {
            const utcMillis = Date.UTC(year, month - 1, day, hour + 3, minute, second);
            return new Date(utcMillis);
        } catch (e) {
            return null;
        }
    };

    const getArgentinaNowParts = () => {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).formatToParts(new Date());
        const result = {};
        for (const part of parts) {
            if (part.type !== 'literal') result[part.type] = part.value;
        }
        return {
            year: Number(result.year),
            month: Number(result.month),
            day: Number(result.day),
            hour: Number(result.hour),
            minute: Number(result.minute),
            second: Number(result.second)
        };
    };

    const monthMap = {
        enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
        julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
    };

    const timeMatch = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    const explicitTimezone = /[+-]\d{2}:?\d{2}$/.test(raw);
    const isIsoDate = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(raw);
    if (isIsoDate) {
        if (/Z$/.test(raw) || explicitTimezone) {
            const parsed = new Date(raw);
            return isNaN(parsed) ? null : parsed;
        }
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw)) {
            const [datePart, timePart] = raw.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute, second = '0'] = timePart.split(':').map(Number);
            return parseArgDatetime(year, month, day, hour, minute, second);
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const [year, month, day] = raw.split('-').map(Number);
            return parseArgDatetime(year, month, day, 0, 0, 0);
        }
    }

    const spanishDate = raw.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?/i);
    const hoyMatch = raw.match(/\b(hoy)\b/i);
    const ayerMatch = raw.match(/\b(ayer)\b/i);
    const dmY = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const isoLikeDateSpace = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    const argNow = getArgentinaNowParts();

    if (hoyMatch || ayerMatch) {
        const baseDate = new Date(Date.UTC(argNow.year, argNow.month - 1, argNow.day, argNow.hour, argNow.minute, argNow.second));
        if (ayerMatch) {
            baseDate.setUTCDate(baseDate.getUTCDate() - 1);
        }
        const hour = timeMatch ? Number(timeMatch[1]) : 0;
        const minute = timeMatch ? Number(timeMatch[2]) : 0;
        const second = timeMatch && timeMatch[3] ? Number(timeMatch[3]) : 0;
        return parseArgDatetime(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, baseDate.getUTCDate(), hour, minute, second);
    }

    if (spanishDate) {
        const day = Number(spanishDate[1]);
        const month = monthMap[spanishDate[2].toLowerCase()] || argNow.month;
        const year = spanishDate[3] ? Number(spanishDate[3]) : argNow.year;
        const hour = timeMatch ? Number(timeMatch[1]) : 0;
        const minute = timeMatch ? Number(timeMatch[2]) : 0;
        const second = timeMatch && timeMatch[3] ? Number(timeMatch[3]) : 0;
        return parseArgDatetime(year, month, day, hour, minute, second);
    }

    if (dmY) {
        const day = Number(dmY[1]);
        const month = Number(dmY[2]);
        const year = Number(dmY[3]);
        const hour = timeMatch ? Number(timeMatch[1]) : 0;
        const minute = timeMatch ? Number(timeMatch[2]) : 0;
        const second = timeMatch && timeMatch[3] ? Number(timeMatch[3]) : 0;
        return parseArgDatetime(year, month, day, hour, minute, second);
    }

    if (isoLikeDateSpace) {
        const year = Number(isoLikeDateSpace[1].split('-')[0]);
        const month = Number(isoLikeDateSpace[1].split('-')[1]);
        const day = Number(isoLikeDateSpace[1].split('-')[2]);
        const hour = Number(isoLikeDateSpace[2]);
        const minute = Number(isoLikeDateSpace[3]);
        const second = isoLikeDateSpace[4] ? Number(isoLikeDateSpace[4]) : 0;
        return parseArgDatetime(year, month, day, hour, minute, second);
    }

    if (timeMatch && raw.length <= 8) {
        const year = argNow.year;
        const month = argNow.month;
        const day = argNow.day;
        return parseArgDatetime(year, month, day, Number(timeMatch[1]), Number(timeMatch[2]), timeMatch[3] ? Number(timeMatch[3]) : 0);
    }

    const parsed = new Date(raw);
    return isNaN(parsed) ? null : parsed;
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
    warmupCache,
    parseMercadoPagoDate
};
