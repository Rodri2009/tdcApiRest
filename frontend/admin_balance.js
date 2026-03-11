(function () {
    const API = '/api/mercadopago';
    const MAX_ITEMS_DEFAULT = 10;

    // Estado global para tracking
    let MAX_ITEMS = MAX_ITEMS_DEFAULT;
    let viewAllMode = false;
    // show only positive (income) transactions by default
    let filterIncome = true;
    let allTransactions = [];
    let authToken = null;  // Token JWT para autenticación
    let lastTransactionState = null;  // Para loguear solo si cambian los datos de transacción
    let sharedWorker = null;  // SharedWorker para SSE persistente entre recargas
    let sseReady = false;      // true cuando worker confirma sse-open
    let directES = null;       // EventSource directo (fallback)

    /* --- Authentication --- */
    async function authenticateAndGetToken() {
        try {
            const response = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Auth failed: ${response.status}`);
            }

            const data = await response.json();
            authToken = data.accessToken;
            console.log('[Auth] ✅ Token obtenido');
            return authToken;
        } catch (err) {
            console.error('[Auth] ❌ Error:', err);
            return null;
        }
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
        if (isNaN(d)) return { date: '—', time: '—' };
        const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const mon = shortMonths[d.getMonth()] || '';
        const dd = String(d.getDate());              // no leading zero
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return { date: `${dd} ${mon}`, time: `${hh}:${mi}` };
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

        // aplicar filtro por montos positivos si está activo
        let filtered = list;
        if (filterIncome) {
            filtered = list.filter(tx => {
                const num = parseAmount(tx.amount);
                return !isNaN(num) && num > 0;
            });
        }
        // Si estamos en modo "ver todas", mostrar todas las encontradas; si no, cortar a MAX_ITEMS
        const displayList = viewAllMode ? filtered : filtered.slice(0, MAX_ITEMS);
        const totalCount = filtered.length;

        displayList.forEach(tx => {
            const tr = document.createElement('tr');

            // intentar normalizar campos faltantes usando 'raw' si es necesario
            let name = tx.name || tx.title || '';
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

            // formato fecha/hora uniforme
            const dt = formatDateTime(tx.dateTime);
            const date = escapeHtml(dt.date);
            const time = escapeHtml(dt.time);

            const amtNum = parseAmount(tx.amount);
            const amtDisplay = isNaN(amtNum)
                ? escapeHtml(String(tx.amount || '—'))
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
                viewAllBtn.textContent = `Mostrar menos (${totalCount} transacciones)`;
            } else {
                viewAllBtn.textContent = `Ver todas las transacciones (${totalCount} total)`;
            }
        }
    }

    function addTransactionToTop(tx) {
        // Agregar nueva transacción al pool de allTransactions
        allTransactions.unshift(tx);

        // Re-renderizar con la nueva transacción
        renderTransactions(allTransactions);
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
        if (type === 'neutral') {
            b.classList.add('neutral');
        } else {
            b.classList.remove('neutral');
        }
        if (bannerTimer) clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => b.classList.add('hidden'), 8000);
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
        } else if (msg.type === 'sse-state' || msg.type === 'pong') {
            // Respuesta sincrónica al ping/start: readyState 1 = OPEN
            if (msg.readyState === 1 || msg.connected) {
                if (!sseReady) {
                    console.log('[SSE] ✅ Estado confirmado por ping/state: conectado');
                    statusEl.textContent = 'watch: conectado';
                }
            } else {
                console.log('[SSE] Estado worker:', msg.readyState === 0 ? 'conectando...' : 'cerrado');
            }
        } else if (msg.type === 'sse-error') {
            console.warn('[SSE] ⚠️ Error SSE — el worker reconectará automáticamente');
            statusEl.textContent = 'watch: reconectando...';
            sseReady = false;

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
            es.close();
            directES = null;
            authToken = null;
            fetchTransactions(true);
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

        // seguridad en frontend: solo personal (nivel >= 50)
        if (window.navbarManager) {
            if (!navbarManager.protectAdminPage() || !navbarManager.tieneNivel(50)) {
                if (navbarManager.userNivel < 50) {
                    alert('Acceso restringido al personal.');
                    window.location.href = '/index.html';
                }
                return;
            }
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

        // Botón "Ver todas las transacciones"
        document.getElementById('view-all-btn').addEventListener('click', () => {
            viewAllMode = !viewAllMode;
            renderTransactions(allTransactions);
        });

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

            // restaurar botón
            checkBtn.disabled = false;
            checkBtn.textContent = 'Actualizar';
        });

        // filtro por defecto y botón para desactivarlo
        const filterBtn = document.getElementById('filter-btn');
        function updateFilterButton() {
            filterBtn.textContent = filterIncome ? 'Sin filtro' : 'Filtrar ingresos';
        }
        filterBtn.addEventListener('click', () => {
            filterIncome = !filterIncome;
            updateFilterButton();
            renderTransactions(allTransactions);
            console.log('transactions:', allTransactions);
        });
        updateFilterButton();

        // Botón de prueba de notificaciones



        await Promise.all([fetchBalance(false), fetchTransactions(false)]);
        initSSE();
    }

    window.addEventListener('load', init);
})();