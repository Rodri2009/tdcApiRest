(function () {
    const API = '/api/mercadopago';
    const MAX_ITEMS_DEFAULT = 10;

    // Estado global para tracking
    let MAX_ITEMS = MAX_ITEMS_DEFAULT;
    let viewAllMode = false;
    let cajaAbierta = false;  // Estado de caja abierta (true = limpiar tabla, false = mostrar transacciones)
    let cajaMovimientos = [];  // Movimientos registrados desde apertura de caja

    // Funciones auxiliares para persistir estado de caja
    function guardarEstadoCaja() {
        if (cajaAbierta && window._cajaAbiertaId) {
            localStorage.setItem('cajaAbierta', JSON.stringify({
                abierta: true,
                cajaId: window._cajaAbiertaId,
                timestamp: Date.now()
            }));
            console.log('[Estado Caja] Guardado: caja abierta #' + window._cajaAbiertaId);
        } else {
            localStorage.removeItem('cajaAbierta');
            console.log('[Estado Caja] Limpiado: caja cerrada');
        }
    }

    function restaurarEstadoCaja() {
        const stored = localStorage.getItem('cajaAbierta');
        if (!stored) {
            console.log('[Estado Caja] No hay estado guardado');
            return false;
        }
        try {
            const data = JSON.parse(stored);
            // Verificar que no sea antigua (menos de 24h)
            if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('cajaAbierta');
                console.log('[Estado Caja] Estado expirado (>24h), limpiado');
                return false;
            }
            if (data.abierta && data.cajaId) {
                window._cajaAbiertaId = data.cajaId;
                cajaAbierta = true;
                console.log('[Estado Caja] Restaurado: caja abierta #' + data.cajaId);
                return true;
            }
        } catch (e) {
            console.error('[Estado Caja] Error al restaurar:', e.message);
            localStorage.removeItem('cajaAbierta');
        }
        return false;
    }

    // mostrar todos los movimientos por defecto (ingresos y egresos)
    let filterIncome = false;
    let allTransactions = [];
    let authToken = null;  // Token JWT para autenticación
    let lastTransactionState = null;  // Para loguear solo si cambian los datos de transacción
    let sharedWorker = null;  // SharedWorker para SSE persistente entre recargas
    let sseReady = false;      // true cuando worker confirma sse-open
    let directES = null;       // EventSource directo (fallback)

    // Exponer estado global para debugging desde console del navegador
    window._cajaDebug = {
        get cajaAbierta() { return cajaAbierta; },
        get cajaMovimientos() { return cajaMovimientos; },
        get allTransactions() { return allTransactions; },
        get authToken() { return authToken; },
        get _cajaAbiertaId() { return window._cajaAbiertaId; },
        get MAX_ITEMS() { return MAX_ITEMS; },
        get viewAllMode() { return viewAllMode; }
    };
    console.log('[admin_transacciones] Debug object available as window._cajaDebug');

    /* --- Authentication --- */
    async function authenticateAndGetToken() {
        try {
            const storedToken = localStorage.getItem('mpAuthToken') || localStorage.getItem('authToken');
            if (storedToken) {
                authToken = storedToken;
                console.log('[Auth] ✅ Reutilizando token guardado');
                return authToken;
            }

            const response = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Auth failed: ${response.status}`);
            }

            const data = await response.json();
            authToken = data.accessToken;
            if (authToken) {
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('mpAuthToken', authToken);
            }
            console.log('[Auth] ✅ Token obtenido');
            return authToken;
        } catch (err) {
            console.error('[Auth] ❌ Error:', err);
            updateServiceStatus('auth_error');
            return null;
        }
    }

    async function fetchWithAuth(url, options = {}, retryOn401 = true) {
        const token = authToken || localStorage.getItem('authToken') || localStorage.getItem('mpAuthToken') || await authenticateAndGetToken();
        if (!token) {
            throw new Error('Token inválido o expirado');
        }

        const headers = {
            ...(options.headers || {}),
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 && retryOn401) {
            console.warn('[Auth] 🔄 401 recibido, renovando token y reintentando...');
            const refreshedToken = await authenticateAndGetToken();
            if (refreshedToken && refreshedToken !== token) {
                const retryResponse = await fetch(url, {
                    ...options,
                    headers: {
                        ...(options.headers || {}),
                        'Authorization': `Bearer ${refreshedToken}`
                    }
                });
                return retryResponse;
            }
        }

        return response;
    }

    /* --- Configuración de sonido de notificación --- */
    // ELIGE UNO: 'doReMi' | 'coin' | 'bell' | 'success' | 'alert'
    const NOTIFICATION_SOUND = 'coin';

    /* --- AudioContext compartido (singleton) ---
     * El navegador bloquea AudioContext si no hay gesto previo del usuario.
     * Solución: un único contexto que se reanuda con el primer click/tecla.
     */
    let _sharedAudioCtx = null;

    function getAudioCtx() {
        if (!_sharedAudioCtx) {
            _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Si el contexto fue suspendido (política autoplay), reanudar
        if (_sharedAudioCtx.state === 'suspended') {
            _sharedAudioCtx.resume().catch(() => { });
        }
        return _sharedAudioCtx;
    }

    // Reanudar contexto en el primer gesto del usuario (una sola vez)
    function _unlockAudio() {
        if (_sharedAudioCtx && _sharedAudioCtx.state === 'suspended') {
            _sharedAudioCtx.resume().catch(() => { });
        }
        document.removeEventListener('click', _unlockAudio);
        document.removeEventListener('keydown', _unlockAudio);
    }
    document.addEventListener('click', _unlockAudio, { once: true });
    document.addEventListener('keydown', _unlockAudio, { once: true });

    /* --- Sonido de notificación --- */
    function playSoundDoReMi() {
        // Do-Re-Mi: notas agradables para ingresos
        const audioContext = getAudioCtx();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const notes = [
            { freq: 523.25, duration: 0.15 }, // Do
            { freq: 587.33, duration: 0.15 }, // Re
            { freq: 659.25, duration: 0.3 }   // Mi
        ];

        let currentTime = audioContext.currentTime;
        notes.forEach(note => {
            oscillator.frequency.setValueAtTime(note.freq, currentTime);
            gain.gain.setValueAtTime(0.3, currentTime);
            gain.gain.setValueAtTime(0, currentTime + note.duration);
            currentTime += note.duration;
        });

        oscillator.start(audioContext.currentTime);
        oscillator.stop(currentTime);
    }

    function playSoundCoin() {
        // Sonido de moneda (retro gaming) - dos notas descendentes rápidas
        const audioContext = getAudioCtx();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.type = 'square'; // Sonido más retro
        const notes = [
            { freq: 800, duration: 0.08 },   // Nota alta
            { freq: 600, duration: 0.12 }    // Nota baja
        ];

        let currentTime = audioContext.currentTime;
        notes.forEach(note => {
            oscillator.frequency.setValueAtTime(note.freq, currentTime);
            gain.gain.setValueAtTime(0.2, currentTime);
            gain.gain.setValueAtTime(0, currentTime + note.duration);
            currentTime += note.duration;
        });

        oscillator.start(audioContext.currentTime);
        oscillator.stop(currentTime);
    }

    function playSoundBell() {
        // Sonido de campana - nota larga y aguda
        const audioContext = getAudioCtx();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

        oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime); // Do alto
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.6);
    }

    function playSoundSuccess() {
        // Sonido success - pitido corto energético
        const audioContext = getAudioCtx();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(750, audioContext.currentTime);
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.setValueAtTime(0, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    function playSoundAlert() {
        // Sonido de alerta - dos pitidos rápidos
        const audioContext = getAudioCtx();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.type = 'sine';

        // Primer beep
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gain.gain.setValueAtTime(0.25, audioContext.currentTime);
        gain.gain.setValueAtTime(0, audioContext.currentTime + 0.1);

        // Segundo beep (con delay)
        const delayTime = 0.15;
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + delayTime);
        gain.gain.setValueAtTime(0.25, audioContext.currentTime + delayTime);
        gain.gain.setValueAtTime(0, audioContext.currentTime + delayTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + delayTime + 0.15);
    }

    function playIncomeSound() {
        // Selector central de sonidos
        try {
            switch (NOTIFICATION_SOUND) {
                case 'coin': playSoundCoin(); break;
                case 'bell': playSoundBell(); break;
                case 'success': playSoundSuccess(); break;
                case 'alert': playSoundAlert(); break;
                case 'doReMi':
                default: playSoundDoReMi(); break;
            }
        } catch (err) {
            console.debug('[Audio] No se pudo reproducir sonido:', err.message);
        }
    }

    /* --- Comparación inteligente de transacciones (solo loguea si cambia) --- */
    function getTransactionFingerprint(tx) {
        // Crea un "fingerprint" simple para detectar cambios
        if (!tx) return null;
        return `${tx.name}|${tx.description}|${tx.amount}|${tx.date}|${tx.time}`;
    }

    function logTransactionOnChange(tx, msgData) {
        // Solo loguea si los datos cambiaron desde la última vez
        const currentFingerprint = getTransactionFingerprint(tx);

        if (currentFingerprint !== lastTransactionState) {
            lastTransactionState = currentFingerprint;
            console.log('[SSE] 📥 JSON TRANSACCIÓN:', JSON.stringify({
                nombre: tx?.name,
                descripcion: tx?.description,
                monto: tx?.amount,
                fecha: tx?.date,
                hora: tx?.time
            }, null, 2));
        }
    }

    /* --- helpers para conversión de datos --- */
    function parseRaw(raw) {
        if (!raw || typeof raw !== 'string') return { name: '—', desc: '—' };
        const lines = raw.split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l && l !== '$' && l !== '-');
        const name = lines[0] || '—';
        let desc = '—';
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (/^[\d.,]+$/.test(line)) continue;
            if (/hs$/i.test(line)) continue;
            if (line.toLowerCase().includes('dinero')) continue;
            desc = line;
            break;
        }
        return { name, desc };
    }

    function formatDateTime(dt) {
        if (!dt) return { date: '—', time: '—' };
        const d = new Date(dt);
        if (isNaN(d)) {
            console.warn('[formatDateTime] Fecha inválida:', dt);
            return { date: '—', time: '—' };
        }

        // DEBUG: Loguear entrada y conversión
        console.log('[formatDateTime] INPUT dt:', dt);
        console.log('[formatDateTime] Date object:', d);
        console.log('[formatDateTime] ISO String:', d.toISOString());
        console.log('[formatDateTime] getHours() (UTC):', d.getHours());

        const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const mon = shortMonths[d.getMonth()] || '';
        const dd = String(d.getDate());

        // Usar toLocaleString para obtener la hora en zona horaria local (Argentina)
        const localTime = d.toLocaleString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires'
        });

        console.log('[formatDateTime] toLocaleString (es-AR, Buenos Aires):', localTime);

        // Extraer hora y minuto del formato "DD/MM/YYYY, HH:mm"
        const parts = localTime.split(', ');
        const timeParts = parts[1] ? parts[1].split(':') : ['00', '00'];
        const hh = timeParts[0];
        const mi = timeParts[1];

        const result = { date: `${dd} ${mon}`, time: `${hh}:${mi}` };
        console.log('[formatDateTime] RESULTADO:', result);
        console.log('---');

        return result;
    }

    /* --- util --- */
    function escapeHtml(s) {
        if (!s) return '';
        return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
    }

    function parseAmount(str) {
        if (!str && str !== 0) return NaN;
        let s = String(str).trim();
        s = s.replace(/\s/g, '');
        // If string contains both . and , assume . = thousands, , = decimal
        const hasDot = s.indexOf('.') !== -1;
        const hasComma = s.indexOf(',') !== -1;
        if (hasDot && hasComma) {
            s = s.replace(/\./g, '').replace(/,/g, '.');
        } else if (!hasDot && hasComma) {
            s = s.replace(/,/g, '.');
        } else {
            s = s.replace(/,/g, '');
        }
        // Remove any non-digit/.- characters
        s = s.replace(/[^0-9.\-]/g, '');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : NaN;
    }

    function formatCurrency(value) {
        if (typeof value !== 'number' || Number.isNaN(value)) return String(value || '—');
        try {
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
        } catch (e) {
            // fallback simple
            return `${value.toFixed(2)} ARS`;
        }
    }

    /* --- DOM rendering --- */
    function setBalance(balance) {
        const el = document.getElementById('balance-amount');
        if (!balance || typeof balance.available !== 'number') {
            el.textContent = '—';
            return;
        }
        el.textContent = formatCurrency(balance.available);
    }

    function renderTransactions(list) {
        const tbody = document.getElementById('tx-list');
        tbody.innerHTML = '';

        // Si caja está abierta, mostrar solo cajaMovimientos
        if (cajaAbierta) {
            list = Array.isArray(cajaMovimientos) ? cajaMovimientos : [];
            console.log('[renderTransactions] Modo caja abierta: mostrando', list.length, 'movimientos');
        }

        // aplicar filtro por montos positivos SOLO cuando no estamos en modo ‘ver todas’
        let filtered = list;
        if (!viewAllMode && filterIncome) {
            filtered = list.filter(tx => {
                const num = parseAmount(tx.amount);
                return !isNaN(num) && num > 0;
            });
        }

        // Si estamos en modo "ver todas", mostrar todas las transacciones; si no, cortar a MAX_ITEMS
        const displayList = viewAllMode ? list : filtered.slice(0, MAX_ITEMS);

        const totalCount = list.length;           // total real del conjunto completo
        const visibleCount = filtered.length;     // cantidad tras filtro (si aplica)

        displayList.forEach(tx => {
            const tr = document.createElement('tr');

            // NUEVO: Normalizar datos que vienen de dos fuentes (MP o movimientos_caja)
            // Transacciones MP tienen: dateTime, name, amount, payer.name
            // Movimientos caja tienen: creado_en, descripcion, monto

            const isMovimientoCaja = 'creado_en' in tx && !('dateTime' in tx);

            let dateField = isMovimientoCaja ? tx.creado_en : tx.dateTime;
            let nameField = isMovimientoCaja ? tx.descripcion : (tx.name || tx.title || tx.payer?.name || '');
            let amountField = isMovimientoCaja ? tx.monto : tx.amount;

            // intentar normalizar campos faltantes usando 'raw' si es necesario
            let name = nameField || '';
            let desc = tx.description || '';
            // si no hay descripción, mostrar un texto basado en el tipo (traducido)
            if (!desc && tx.type) {
                desc = translateType(tx.type);
            }
            if ((!name || name === '') || (!desc || desc === '')) {
                const parsed = parseRaw(tx.raw || '');
                if (!name || name === '') name = parsed.name;
                if (!desc || desc === '') desc = parsed.desc;
            }
            name = escapeHtml(name || '—');
            desc = escapeHtml(desc || '—');

            // DEBUG: Loguear objeto transacción
            console.log('[renderTransactions] Transacción completa:', tx);
            console.log('[renderTransactions] isMovimientoCaja:', isMovimientoCaja, '| dateField:', dateField, '| nameField:', nameField, '| amountField:', amountField);

            // formato fecha/hora uniforme
            const dt = formatDateTime(dateField);
            const date = escapeHtml(dt.date);
            const time = escapeHtml(dt.time);

            const amtNum = parseAmount(amountField);
            const amtDisplay = isNaN(amtNum)
                ? escapeHtml(String(amountField || '—'))
                : formatCurrency(amtNum);

            if (amtNum > 0) tr.classList.add('income');
            if (amtNum < 0) tr.classList.add('expense');

            tr.innerHTML = `
                <td class="tx-col-name">${name}</td>
                <td class="tx-col-desc">${desc}</td>
                <td class="tx-col-amount">${amtDisplay}</td>
                <td class="tx-col-date">${date}</td>
                <td class="tx-col-time">${time}</td>
            `;

            tbody.appendChild(tr);
        });

        // Actualizar texto del botón "Ver todas"
        const viewAllBtn = document.getElementById('view-all-btn');
        if (viewAllBtn) {
            if (viewAllMode) {
                viewAllBtn.textContent = `Mostrar menos (${totalCount} transacciones totales)`;
            } else {
                viewAllBtn.textContent = `Ver todas las transacciones (${totalCount} totales, ${visibleCount} visibles)`;
            }
        }
    }

    function addTransactionToTop(tx) {
        console.log('[addTransactionToTop] Agregando:', tx);
        console.log('[addTransactionToTop] cajaAbierta:', cajaAbierta);

        if (cajaAbierta) {
            // Si hay caja abierta, agregar SOLO a cajaMovimientos
            cajaMovimientos.unshift(tx);
            console.log('[addTransactionToTop] Agregada a cajaMovimientos. Total:', cajaMovimientos.length);
            renderTransactions(cajaMovimientos);

            // NUEVO: Registrar la transacción de MP en la caja del backend
            registrarMovimientoMPEnCaja(tx);
        } else {
            // Si no hay caja abierta, agregar a allTransactions
            allTransactions.unshift(tx);
            console.log('[addTransactionToTop] Agregada a allTransactions. Total:', allTransactions.length);
            renderTransactions(allTransactions);
        }
    }

    // Registrar una transacción de Mercado Pago en movimientos_caja del backend
    async function registrarMovimientoMPEnCaja(tx) {
        const cajaId = window._cajaAbiertaId;
        if (!cajaId) {
            console.warn('[registrarMovimientoMPEnCaja] No hay caja abierta');
            return;
        }

        const token = authToken || localStorage.getItem('authToken');
        if (!token) {
            console.warn('[registrarMovimientoMPEnCaja] No hay token');
            return;
        }

        try {
            const rawMonto = Number(parseAmount(tx.amount));
            const monto = Number.isFinite(rawMonto) ? Math.abs(rawMonto) : 0;
            if (!Number.isFinite(rawMonto) || monto <= 0) {
                console.warn('[registrarMovimientoMPEnCaja] Monto inválido:', tx.amount);
                return;
            }

            const tipo = rawMonto >= 0 ? 'ingreso' : 'egreso';
            const metodoPagoRaw = (tx.paymentMethod || tx.type || '').toLowerCase();
            const metodoPagoMap = {
                transferencia: 'transferencia',
                transfer: 'transferencia',
                payout: 'transferencia',
                tarjeta: 'tarjeta',
                debit: 'tarjeta',
                credit: 'tarjeta',
                cheque: 'cheque',
                efectivo: 'efectivo',
                cash: 'efectivo'
            };

            const movimiento = {
                tipo,
                categoria: 'mercadopago',
                subcategoria: tx.category || tx.type || metodoPagoRaw || 'transferencia',
                descripcion: (tx.description || tx.title || tx.name || 'Movimiento MP').toString().trim() || 'Movimiento MP',
                monto,
                metodo_pago: metodoPagoMap[metodoPagoRaw] || 'otro',
                comprobante_ref: tx.id || tx.reference || null,
                id_evento_confirmado: null,
                id_solicitud: null
            };

            const res = await fetchWithAuth(`/api/cajas/${cajaId}/movimientos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(movimiento)
            });

            const contentType = res.headers.get('content-type') || '';
            const respuesta = contentType.includes('application/json') ? await res.json() : { message: await res.text() };

            if (res.ok) {
                console.log('[registrarMovimientoMPEnCaja] ✅ Movimiento registrado en BD para caja:', cajaId, respuesta);
            } else {
                console.warn('[registrarMovimientoMPEnCaja] Error:', respuesta.error || respuesta.message || `HTTP ${res.status}`);
            }
        } catch (e) {
            console.error('[registrarMovimientoMPEnCaja] Error:', e.message);
        }
    }


    /* --- banner --- */
    let bannerTimer = null;
    // msg: texto o HTML a mostrar
    // type: 'success' (verde) o 'neutral' (gris). Por defecto usa el estilo base verde.
    // opts.allowHtml: si true, `msg` se inserta como HTML; de lo contrario se escapa.
    function showBanner(msg, type = 'success', opts = {}) {
        const b = document.getElementById('banner');
        if (opts.allowHtml) {
            b.innerHTML = msg;
        } else {
            b.textContent = msg;
        }
        b.classList.remove('hidden');
        // ajustar clase de tipo
        b.classList.remove('neutral', 'error');
        if (type === 'neutral') b.classList.add('neutral');
        else if (type === 'error') b.classList.add('error');
        if (bannerTimer) clearTimeout(bannerTimer);
        if (!opts.persistent) {
            bannerTimer = setTimeout(() => b.classList.add('hidden'), 8000);
        }
    }

    /* --- data fetching --- */
    async function fetchBalance(fresh = false) {
        try {
            const headers = {};
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            const res = await fetch(`${API}/balance?fresh=${fresh}`, { headers });
            const json = await res.json();
            if (json && json.success && json.data) {
                setBalance(json.data);
                return json.data;
            }
            if (json && json.success && !json.data) {
                // older responses may return object directly
                setBalance(json);
                return json;
            }
            // fallback: if api returns data at top-level
            if (json && json.available !== undefined) {
                setBalance(json);
                return json;
            }
            setBalance(null);
            return null;
        } catch (err) {
            console.error('fetchBalance error', err);
            setBalance(null);
            return null;
        }
    }

    async function fetchTransactions(fresh = false) {
        try {
            const headers = {};
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            // Siempre pedir muchas transacciones para poder mostrar "ver todas"
            const res = await fetch(`${API}/activity?fresh=${fresh}&limit=200`, { headers });
            const json = await res.json();
            console.debug('[UI] fetchTransactions', json);
            if (json && json.success && json.data && Array.isArray(json.data.transactions)) {
                const prevFirstFingerprint = allTransactions.length > 0 ? getTransactionFingerprint(allTransactions[0]) : null;

                allTransactions = json.data.transactions;
                console.log('[UI] fetchTransactions -> tx count', allTransactions.length);
                console.log('[DEBUG] Primeras 2 transacciones:', allTransactions.slice(0, 2));

                // detectar si el primer elemento cambió y, si es ingreso, notificar
                if (allTransactions.length > 0) {
                    const newFirst = allTransactions[0];
                    const newFingerprint = getTransactionFingerprint(newFirst);
                    if (prevFirstFingerprint && newFingerprint !== prevFirstFingerprint) {
                        const amtNum = parseAmount(newFirst.amount);
                        if (!isNaN(amtNum) && amtNum > 0) {
                            showBanner(
                                `💰 NUEVO INGRESO: <span class="banner-amount">${formatCurrency(Math.abs(amtNum))}</span> ` +
                                `( <span class="banner-name">${escapeHtml(newFirst.name || '')}</span> )`,
                                'success',
                                { allowHtml: true }
                            );
                            playIncomeSound();
                        }
                    }
                    lastTransactionState = newFingerprint;
                }

                renderTransactions(allTransactions);
                return allTransactions;
            }
            if (json && json.transactions) {
                allTransactions = json.transactions;
                console.log('[UI] fetchTransactions (legacy) -> tx count', allTransactions.length);
                console.log('[DEBUG] Primeras 2 transacciones (legacy):', allTransactions.slice(0, 2));
                renderTransactions(allTransactions);
                return allTransactions;
            }
            allTransactions = [];
            renderTransactions([]);
            return [];
        } catch (err) {
            console.error('fetchTransactions error', err);
            allTransactions = [];
            renderTransactions([]);
            return [];
        }
    }



    /* ─── Indicador de estado del servicio ─────────────────────────────────── */
    const STATUS_CONFIGS = {
        connecting: { css: 'ss-connecting', text: 'conectando…' },
        ok: { css: 'ss-ok', text: 'operativo' },
        reconnecting: { css: 'ss-warning', text: 'reconectando…' },
        session_lost: { css: 'ss-error', text: 'sesión perdida' },
        watch_stopped: { css: 'ss-error', text: 'watch detenido' },
        not_ready: { css: 'ss-warning', text: 'iniciando navegador…' },
        disabled: { css: 'ss-disabled', text: 'servicio deshabilitado' },
        auth_error: { css: 'ss-error', text: 'error de autenticación' },
        api_error: { css: 'ss-error', text: 'error de API' },
    };

    let _currentServiceState = 'connecting';

    function updateServiceStatus(state, detail) {
        _currentServiceState = state;
        const cfg = STATUS_CONFIGS[state] || { css: 'ss-connecting', text: state };
        const el = document.getElementById('service-status');
        const txt = document.getElementById('ss-text');
        if (!el || !txt) return;
        el.className = `service-status ${cfg.css}`;
        txt.textContent = detail || cfg.text;
    }

    /* ─── Health polling (cada 30 s) — confirma estado real del backend ───── */
    async function pollHealth() {
        try {
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
            const res = await fetch(`${API}/health`, { headers });
            let data = null;
            try { data = await res.json(); } catch (_) { }
            if (!res.ok) {
                // si el backend devolvió JSON con status, usarlo primero
                if (data && data.status === 'disabled') {
                    updateServiceStatus('disabled');
                    return;
                }
                // solo degradar si ya no estamos ok ni reconectando
                if (_currentServiceState !== 'ok' && _currentServiceState !== 'reconnecting') {
                    updateServiceStatus('api_error', 'sin respuesta del servidor');
                }
                return;
            }
            if (data && data.status === 'disabled') {
                updateServiceStatus('disabled');
                return;
            }
            if (data && data.status === 'not_ready') {
                // solo degradar si el SSE no confirmó conexión
                if (_currentServiceState !== 'ok' &&
                    _currentServiceState !== 'watch_stopped' &&
                    _currentServiceState !== 'session_lost') {
                    updateServiceStatus('not_ready');
                }
            }
            // status 'ok': el SSE es la fuente de verdad; health poll lo confirma en silencio
        } catch (e) {
            // error de red — el SSE ya gestiona la reconexión
        }
        return _currentServiceState;
    }

    function startHealthPolling() {
        pollHealth();                        // chequeo inmediato al cargar
        setInterval(pollHealth, 30000);      // y cada 30 s
    }

    // utilitario compartido: convierte los valores 'type' del backend en cadenas legibles
    function translateType(t) {
        return ({
            income: 'Ingreso',
            payment: 'Pago',
            transfer: 'Transferencia',
            purchase: 'Compra',
            withdrawal: 'Retiro',
            unknown: 'Desconocido'
        })[t] || t;
    }



    // Versión del worker — incrementar cada vez que se modifique sse-worker.js
    // para forzar al browser a crear una nueva instancia
    const SSE_WORKER_VERSION = '7';

    /* --- SSE / realtime --- */

    /**
     * Procesa el payload de un mensaje SSE (compartido entre SharedWorker y fallback directo)
     */
    function handleSSEData(rawData) {
        try {
            const msg = JSON.parse(rawData);
            console.log('[SSE] ✓ JSON parseado:', msg.type);

            if (msg && msg.type === 'new_transaction' && msg.transaction) {
                const tx = msg.transaction;
                console.log('[SSE] 🔄 Nueva transacción:', tx.name, '|', tx.amount);
                console.log('[SSE] Transacción completa:', tx);
                logTransactionOnChange(tx, msg);
                addTransactionToTop(tx);
                const amt = parseAmount(tx.amount);
                if (!isNaN(amt)) {
                    if (amt > 0) {
                        console.log('[SSE] 💰 INGRESO detectado');
                        showBanner(
                            `💰 NUEVO INGRESO: <span class="banner-amount">${formatCurrency(Math.abs(amt))}</span> ` +
                            `( <span class="banner-name">${escapeHtml(tx.name || '')}</span> )`,
                            'success',
                            { allowHtml: true }
                        );
                        playIncomeSound();
                    } else if (amt < 0 && tx.raw && tx.raw.toLowerCase().includes('transfer')) {
                        console.log('[SSE] ↗️ Transferencia detectada');
                        showBanner(`↗️ Transferencia enviada: ${formatCurrency(Math.abs(amt))}`);
                    }
                }
            }
            if (msg && msg.type === 'connected') {
                console.log('[SSE] ✓ servidor dice: conectado');
                document.getElementById('status').textContent = 'watch: conectado';
                updateServiceStatus('ok');
            }
            if (msg && msg.type === 'error') {
                console.error('[SSE] ❌ Watch detenido por max errores:', msg.message);
                document.getElementById('status').textContent = 'watch: detenido';
                updateServiceStatus('watch_stopped');
                showBanner('⚠️ El monitor de transacciones se detuvo por errores reiterados. Recargá la página para reintentar.', 'error');
            }
            if (msg && msg.type === 'session_lost') {
                console.warn('[SSE] 🔒 Sesión de Mercado Pago perdida');
                document.getElementById('status').textContent = 'watch: sesión perdida';
                updateServiceStatus('session_lost');
                showBanner('⚠️ La sesión de Mercado Pago se perdió. El sistema intentará recuperarla automáticamente.', 'error');
            }
            if (msg && msg.type === 'session_restored') {
                console.log('[SSE] ✅ Sesión de Mercado Pago restaurada');
                document.getElementById('status').textContent = 'watch: conectado';
                updateServiceStatus('ok');
                showBanner('✅ Sesión de Mercado Pago restaurada correctamente.', 'success');
            }
        } catch (e) {
            console.error('[SSE] ❌ Parse error:', e.message, 'Data:', String(rawData).substring(0, 200));
        }
    }

    /**
     * Handler de mensajes provenientes del SharedWorker
     */
    function onWorkerMessage(ev) {
        let msg;
        try {
            msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        } catch (e) { return; }

        const statusEl = document.getElementById('status');

        if (msg.type === 'sse-open') {
            console.log('[SSE] ✅ Conexión establecida (SharedWorker persistente)');
            statusEl.textContent = 'watch: conectado';
            sseReady = true;
            updateServiceStatus('ok');
        } else if (msg.type === 'sse-state' || msg.type === 'pong') {
            // Respuesta sincrónica al ping/start: readyState 1 = OPEN
            if (msg.readyState === 1 || msg.connected) {
                if (!sseReady) {
                    sseReady = true;
                    console.log('[SSE] ✅ Estado confirmado por ping/state: conectado');
                    statusEl.textContent = 'watch: conectado';
                    updateServiceStatus('ok');
                }
            } else {
                console.log('[SSE] Estado worker:', msg.readyState === 0 ? 'conectando...' : 'cerrado');
            }
        } else if (msg.type === 'sse-error') {
            console.warn('[SSE] ⚠️ Error SSE — el worker reconectará automáticamente');
            statusEl.textContent = 'watch: reconectando...';
            sseReady = false;
            if (_currentServiceState !== 'watch_stopped' && _currentServiceState !== 'session_lost') {
                updateServiceStatus('reconnecting');
            }

            // Actualizar token por si expiró y reenviarlo al worker tras 4s
            setTimeout(async () => {
                authToken = null;
                await authenticateAndGetToken();
                if (authToken && sharedWorker) {
                    sharedWorker.port.postMessage(JSON.stringify({ type: 'start', token: authToken }));
                }
            }, 4000);
        } else if (msg.type === 'sse-message') {
            handleSSEData(msg.data);
        }
    }



    /** Envía ping al worker periódicamente para detectar cuando la conexión queda lista */
    function startWorkerPingLoop() {
        let attempts = 0;
        const maxAttempts = 20;  // 20 × 2s = 40s máx esperando
        const interval = setInterval(() => {
            if (sseReady || !sharedWorker) {
                clearInterval(interval);
                return;
            }
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(interval);
                console.warn('[SSE] Worker no confirmó conexión tras 40s — usando SSE directo');
                try { sharedWorker.port.close(); } catch (e) { }
                sharedWorker = null;
                initSSEDirect();
                return;
            }
            sharedWorker.port.postMessage(JSON.stringify({ type: 'ping' }));
        }, 2000);
    }

    /**
     * SSE directo (sin SharedWorker) — fallback para navegadores sin soporte
     */
    function initSSEDirect() {
        const statusEl = document.getElementById('status');
        console.log('[SSE] Modo directo (sin SharedWorker)');

        // Evitar conexiones duplicadas
        if (directES) {
            if (directES.readyState !== EventSource.CLOSED) {
                console.log('[SSE] Conexión directa ya activa, readyState:', directES.readyState);
                return;
            }
            directES = null;
        }

        const watchUrl = authToken
            ? `${API}/watch?token=${encodeURIComponent(authToken)}`
            : `${API}/watch`;

        const es = new EventSource(watchUrl);
        directES = es;
        let messageCount = 0;

        es.onopen = () => {
            console.log('[SSE] ✅ Conexión establecida (directo)');
            statusEl.textContent = 'watch: conectado';
            updateServiceStatus('ok');
        };

        es.onmessage = (ev) => {
            messageCount++;
            console.log(`[SSE] 📨 Msg #${messageCount}:`, ev.data.substring(0, 80));
            handleSSEData(ev.data);
        };

        es.onerror = () => {
            console.error('[SSE] ❌ Error directo — readyState:', es.readyState);
            statusEl.textContent = 'watch: desconectado — reintentando...';
            sseReady = false;
            if (_currentServiceState !== 'watch_stopped' && _currentServiceState !== 'session_lost') {
                updateServiceStatus('reconnecting');
            }
            es.close();
            directES = null;
            authToken = null;
            // Re-obtener token antes de refrescar transacciones (authToken acaba de limpiarse)
            getAuthToken().then(() => fetchTransactions(true)).catch(() => { });
            setTimeout(initSSE, 3000);
        };
    }

    /**
     * Punto de entrada principal:
     * Usa SharedWorker si está disponible (conexión sobrevive recargas),
     * si no, cae a EventSource directo.
     */
    async function initSSE() {
        const statusEl = document.getElementById('status');
        console.log('[SSE] Iniciando...');

        if (!authToken) {
            console.log('[SSE] Sin token — autenticando...');
            await authenticateAndGetToken();
        }

        if (!authToken) {
            statusEl.textContent = 'watch: sin token';
            console.error('[SSE] No hay token disponible');
            return;
        }

        if (window.SharedWorker) {
            try {
                if (!sharedWorker) {
                    console.log('[SSE] Creando SharedWorker sse-worker.js');
                    sharedWorker = new SharedWorker(`/sse-worker.js?v=${SSE_WORKER_VERSION}`);
                    sharedWorker.port.onmessage = onWorkerMessage;
                    sharedWorker.onerror = (err) => {
                        console.error('[SSE] Error en SharedWorker:', err.message);
                        sharedWorker = null;
                        // Fallback a SSE directo
                        initSSEDirect();
                    };
                    sharedWorker.port.start();
                }
                // Enviar token al worker (conecta si no está conectado, o reutiliza conexión)
                sharedWorker.port.postMessage(JSON.stringify({ type: 'start', token: authToken }));
                statusEl.textContent = 'watch: conectando...';
                console.log('[SSE] ✅ SharedWorker activo — conexión persiste entre recargas');

                // Ping loop: confirma cuándo el worker tiene SSE abierto
                startWorkerPingLoop();

                // Fallback: si en 12 segundos no llega sse-open, el worker faló silenciosamente
                // → cerrar worker y usar SSE directo
                setTimeout(() => {
                    if (!sseReady) {
                        console.warn('[SSE] Timeout esperando sse-open — abandonando SharedWorker, usando SSE directo');
                        if (sharedWorker) {
                            try { sharedWorker.port.close(); } catch (e) { }
                            sharedWorker = null;
                        }
                        initSSEDirect();
                    }
                }, 12000);
            } catch (err) {
                console.error('[SSE] SharedWorker falló, usando SSE directo:', err);
                sharedWorker = null;
                initSSEDirect();
            }
        } else {
            console.log('[SSE] SharedWorker no disponible — usando SSE directo');
            initSSEDirect();
        }
    }

    /* --- init --- */
    async function init() {
        console.log('[Init] Iniciando admin_balance...', new Date().toLocaleString());

        // Restaurar estado de caja abierta si está guardado en localStorage
        if (restaurarEstadoCaja()) {
            console.log('[Init] Estado de caja restaurado desde localStorage');
            // Los botones se actualizarán cuando verificarCajaAbiertaReal() confirme la caja desde la API
        }

        // seguridad en frontend: solo personal/admin con rol válido o nivel >= 50
        if (window.navbarManager) {
            if (!navbarManager.protectAdminPage() || !navbarManager.tieneAccesoStaff()) {
                if (Number(navbarManager.userNivel || 0) < 50) {
                    alert('Acceso restringido al personal.');
                    window.location.href = '/index.html';
                }
                return;
            }
        }

        // Chequear estado del servicio MP antes de auth y SSE
        await pollHealth();
        if (_currentServiceState === 'disabled') {
            showBanner(
                '⚠️ El servicio de Mercado Pago no está habilitado. ' +
                'Para activarlo, reiniciar el backend con la opción <strong>--mp</strong>.',
                'error',
                { allowHtml: true, persistent: true }
            );
            document.getElementById('check-btn').disabled = true;
            document.getElementById('toggle-balance-btn').disabled = true;
            startHealthPolling();
            return;
        }

        // Obtener token de autenticación primero
        const token = await authenticateAndGetToken();
        if (!token) {
            console.error('[Init] ❌ No se pudo obtener token - algunos endpoints fallarán');
        } else {
            console.log('[Init] ✅ Token obtenido, largo:', token.length, 'chars');
        }

        console.log('[Init] Inicializando SSE...');

        document.getElementById('refresh-btn').addEventListener('click', async () => {
            const statusEl = document.getElementById('status');
            statusEl.textContent = 'actualizando...';

            // Intentar obtener balance y transacciones 'fresh'. Si fallan, hacer fallback a cache.
            const balanceFresh = await fetchBalance(true);
            const transactionsFresh = await fetchTransactions(true);

            if (!balanceFresh) {
                // fallback a cached
                const cached = await fetchBalance(false);
                if (cached) {
                    showBanner('No se pudo actualizar en vivo — mostrando último saldo conocido');
                } else {
                    statusEl.textContent = 'error al actualizar';
                }
            }

            statusEl.textContent = 'actualizado';
            setTimeout(() => statusEl.textContent = '', 2500);
        });

        // Botones de Abrir/Cerrar Caja — conectados al backend real
        const btnAbrirCaja = document.getElementById('btn-abrir-caja');
        const btnCerrarCaja = document.getElementById('btn-cerrar-caja');

        // Verificar si hay caja abierta al cargar la página
        async function verificarCajaAbiertaReal() {
            const token = authToken || localStorage.getItem('authToken');
            if (!token) return;
            try {
                const res = await fetchWithAuth('/api/cajas/activa');
                if (res.ok) {
                    const caja = await res.json();
                    console.log('[verificarCajaAbiertaReal] Respuesta completa de API:', caja);
                    console.log('[verificarCajaAbiertaReal] caja.movimientos:', caja.movimientos);
                    console.log('[verificarCajaAbiertaReal] Is array?:', Array.isArray(caja.movimientos));

                    window._cajaAbiertaId = caja.id;
                    cajaAbierta = true;
                    cajaMovimientos = Array.isArray(caja.movimientos) ? caja.movimientos : [];
                    guardarEstadoCaja();  // Guardar estado: caja abierta
                    btnAbrirCaja.classList.add('hidden');
                    btnCerrarCaja.classList.remove('hidden');
                    console.log('[admin_transacciones] Caja abierta encontrada:', caja.id, 'movimientos:', cajaMovimientos.length);
                    renderTransactions(cajaMovimientos);  // Renderizar movimientos de la caja, NO allTransactions
                } else {
                    window._cajaAbiertaId = null;
                    cajaAbierta = false;
                    cajaMovimientos = [];
                    guardarEstadoCaja();  // Guardar estado: caja cerrada
                    btnAbrirCaja.classList.remove('hidden');
                    btnCerrarCaja.classList.add('hidden');
                }
            } catch (e) {
                console.warn('[admin_transacciones] No se pudo verificar caja:', e.message);
            }

        }
        await verificarCajaAbiertaReal();

        btnAbrirCaja.addEventListener('click', () => {
            // Mostrar modal para abrir caja
            const modal = document.getElementById('modal-abrir-caja');
            if (modal) {
                modal.classList.remove('hidden');
                cargarSaldoMPAlModal();
                cargarEventosAlModal();

                setTimeout(() => {
                    const nombreInput = document.getElementById('tx-nombre-caja');
                    if (nombreInput) {
                        nombreInput.focus();
                        nombreInput.select();
                    }
                }, 50);
            }
        });

        btnCerrarCaja.addEventListener('click', async () => {
            const token = localStorage.getItem('authToken');
            if (!token || !window._cajaAbiertaId) {
                showBanner('No hay caja abierta o no estás autenticado', 'error');
                return;
            }
            if (!confirm('¿Cerrar la caja actual? Se calculará el saldo automáticamente.')) return;

            try {
                const res = await fetchWithAuth(`/api/cajas/${window._cajaAbiertaId}/cerrar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ saldoFinal: 0, notas: 'Cerrada desde admin_transacciones' })
                });
                if (res.ok) {
                    window._cajaAbiertaId = null;
                    cajaAbierta = false;
                    cajaMovimientos = [];
                    guardarEstadoCaja();
                    btnAbrirCaja.classList.remove('hidden');
                    btnCerrarCaja.classList.add('hidden');
                    showBanner('✅ Caja cerrada correctamente', 'success');

                    const refreshed = await fetchTransactions(true);
                    renderTransactions(refreshed || allTransactions || []);
                } else {
                    const err = await res.json();
                    showBanner(`Error: ${err.error || 'No se pudo cerrar la caja'}`, 'error');
                }
            } catch (e) {
                showBanner(`Error: ${e.message}`, 'error');
            }
        });

        // Modal para abrir caja (solo en admin_transacciones)
        const modal = document.getElementById('modal-abrir-caja');
        const modalCloseBtn = modal ? modal.querySelector('.modal-close') : null;
        const formAbrirCajaTx = document.getElementById('form-abrir-caja-transacciones');
        const modalCerrarBtn = document.getElementById('modal-cerrar-btn');

        // Cargar saldo de MP en el modal
        async function cargarSaldoMPAlModal() {
            try {
                const token = authToken || localStorage.getItem('authToken');
                if (!token) await authenticateAndGetToken();

                const res = await fetchWithAuth('/api/mercadopago/balance');

                if (res.ok) {
                    const data = await res.json();
                    let available = 0;
                    if (data && data.success && data.data && typeof data.data.available === 'number') {
                        available = data.data.available;
                    } else if (data && typeof data.available === 'number') {
                        available = data.available;
                    }

                    if (available > 0) {
                        const efectivoInput = document.getElementById('tx-efectivo-inicial');
                        if (efectivoInput) {
                            efectivoInput.value = available.toFixed(2);
                        }
                    }
                }
            } catch (err) {
                console.warn('[admin_transacciones] No se pudo cargar saldo de MP:', err.message);
            }
        }

        // Cargar eventos confirmados en el modal
        async function cargarEventosAlModal() {
            try {
                const selectEvento = document.getElementById('tx-id-evento-confirmado');
                if (!selectEvento) return;

                const token = authToken || localStorage.getItem('authToken');
                if (!token) await authenticateAndGetToken();

                const res = await fetchWithAuth('/api/cajas/eventos-disponibles');

                if (res.ok) {
                    const eventos = await res.json();
                    console.log('[admin_transacciones] ✅ Eventos cargados:', eventos.length);

                    // Mantener la opción "Sin evento"
                    const currentValue = selectEvento.value;
                    selectEvento.innerHTML = '<option value="">-- Sin evento asociado --</option>';

                    eventos.forEach(evento => {
                        const option = document.createElement('option');
                        option.value = evento.id;
                        option.textContent = `${evento.nombre_evento} (${evento.descripcion_corta || 'Sin descripción'})`;
                        selectEvento.appendChild(option);
                    });

                    selectEvento.value = currentValue;
                } else {
                    console.warn('[admin_transacciones] No se pudieron cargar eventos:', res.status);
                }
            } catch (err) {
                console.warn('[admin_transacciones] Error cargando eventos:', err.message);
            }
        }

        // Cerrar modal
        function cerrarModal() {
            if (modal) modal.classList.add('hidden');
        }

        if (modalCloseBtn) modalCloseBtn.addEventListener('click', cerrarModal);
        if (modalCerrarBtn) modalCerrarBtn.addEventListener('click', cerrarModal);

        // Cerrar modal al hacer click en overlay
        if (modal) {
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay) overlay.addEventListener('click', cerrarModal);
        }

        // Botón "Cargar de MP" en el modal
        const btnCargarSaldoMPTx = document.getElementById('btn-cargar-saldo-mp-tx');
        if (btnCargarSaldoMPTx) {
            btnCargarSaldoMPTx.addEventListener('click', async (e) => {
                e.preventDefault();
                await cargarSaldoMPAlModal();
            });
        }

        // Handler para abrir caja desde el modal
        if (formAbrirCajaTx) {
            formAbrirCajaTx.addEventListener('submit', async (e) => {
                e.preventDefault();

                const nombreCaja = document.getElementById('tx-nombre-caja').value.trim();
                const efectivoInicial = parseFloat(document.getElementById('tx-efectivo-inicial').value) || 0;
                const idEvento = document.getElementById('tx-id-evento-confirmado').value || null;
                const notas = document.getElementById('tx-notas-apertura').value;

                if (!nombreCaja) {
                    showBanner('⚠️ Ingresa un nombre para la caja', 'warning');
                    return;
                }

                const token = authToken || localStorage.getItem('authToken');
                if (!token) await authenticateAndGetToken();

                try {
                    const res = await fetchWithAuth('/api/cajas', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            nombre: nombreCaja,
                            saldoInicialEnEfectivo: efectivoInicial,
                            idEventoConfirmado: idEvento ? parseInt(idEvento) : null,
                            notas
                        })
                    });

                    if (res.ok) {
                        const nuevaCaja = await res.json();
                        window._cajaAbiertaId = nuevaCaja.id;
                        cajaAbierta = true;
                        cajaMovimientos = [];
                        guardarEstadoCaja();

                        btnAbrirCaja.classList.add('hidden');
                        btnCerrarCaja.classList.remove('hidden');

                        showBanner('✅ Caja abierta correctamente', 'success');

                        formAbrirCajaTx.reset();
                        cerrarModal();

                        // Recargar la página después de 1s
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        const err = await res.json();
                        showBanner(`Error: ${err.error || 'No se pudo abrir la caja'}`, 'error');
                    }
                } catch (err) {
                    console.error('[admin_transacciones] Error abriendo caja:', err);
                    showBanner(`Error: ${err.message}`, 'error');
                }
            });
        }

        // botón especiales
        const toggleBalanceBtn = document.getElementById('toggle-balance-btn');
        const balanceSection = document.querySelector('.balance-section');
        toggleBalanceBtn.addEventListener('click', () => {
            const hidden = balanceSection.classList.toggle('hidden');
            toggleBalanceBtn.textContent = hidden ? 'Mostrar saldo' : 'Ocultar saldo';
        });

        const checkBtn = document.getElementById('check-btn');
        checkBtn.addEventListener('click', async () => {
            // mostrar spinner/disable
            checkBtn.disabled = true;
            checkBtn.innerHTML = 'Actualizando <span class="spinner"></span>';

            if (cajaAbierta) {
                showBanner('📦 Caja abierta: mostrando solo transacciones de la caja actual', 'neutral');
            } else {
                const prevFingerprint = allTransactions.length > 0 ? getTransactionFingerprint(allTransactions[0]) : null;
                try {
                    await fetchTransactions(true);
                } catch (e) {
                    showBanner('Servicio no disponible', 'neutral');
                }
                const currentFingerprint = allTransactions.length > 0 ? getTransactionFingerprint(allTransactions[0]) : null;

                if (prevFingerprint && currentFingerprint === prevFingerprint) {
                    showBanner('Todo funciona bien, NO hay nuevos ingresos', 'neutral');
                } else {
                    if (allTransactions.length > 0) {
                        const amtNum = parseAmount(allTransactions[0].amount);
                        if (isNaN(amtNum) || amtNum <= 0) {
                            showBanner('Todo funciona bien, NO hay nuevos ingresos', 'neutral');
                        }
                    }
                }
            }

            // restaurar botón
            checkBtn.disabled = false;
            checkBtn.textContent = 'Actualizar';
        });

        // filtro por defecto y botón para desactivarlo
        const filterBtn = document.getElementById('filter-btn');
        function updateFilterButton() {
            filterBtn.textContent = filterIncome ? 'Ver todos (Ingresos y Egresos)' : 'Filtrar solo ingresos';
        }
        filterBtn.addEventListener('click', () => {
            filterIncome = !filterIncome;
            updateFilterButton();
            renderTransactions(allTransactions);
            console.log('transactions:', allTransactions);
        });
        updateFilterButton();

        // Botón de prueba de notificaciones

        // Primero verificar si hay caja abierta
        await verificarCajaAbiertaReal();

        // Si hay caja abierta, no cargar transacciones generales de MP
        if (!cajaAbierta) {
            await Promise.all([fetchBalance(false), fetchTransactions(false)]);
        } else {
            // Si hay caja abierta, al menos cargar el balance
            await fetchBalance(false);
            console.log('[Init] Caja abierta detectada: mostrando solo movimientos de caja');
        }

        startHealthPolling();
        initSSE();
    }

    window.addEventListener('load', init);
})();