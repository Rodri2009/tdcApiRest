(function () {
    const API = '/api/mercadopago';
    const MAX_ITEMS_DEFAULT = 10;

    // Estado global para tracking
    let MAX_ITEMS = MAX_ITEMS_DEFAULT;
    let viewAllMode = false;
    let allTransactions = [];
    let authToken = null;  // Token JWT para autenticación

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

    /* --- Sonido de notificación --- */
    function playSoundDoReMi() {
        // Do-Re-Mi: notas agradables para ingresos
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

        // Si estamos en modo "ver todas", mostrar todas; si no, mostrar solo MAX_ITEMS_DEFAULT
        const displayList = viewAllMode ? list : list.slice(0, MAX_ITEMS);
        const totalCount = list.length;

        displayList.forEach(tx => {
            const tr = document.createElement('tr');

            const name  = escapeHtml(tx.name  || tx.title || '—');
            const desc  = escapeHtml(tx.description || tx.type || '—');
            const date  = escapeHtml(tx.date  || (tx.dateTime ? tx.dateTime.split(' ').slice(0, 3).join(' ') : '') || '—');
            const time  = escapeHtml(tx.time  || (tx.dateTime || '').replace(/^.*?(\d{1,2}:\d{2}.*)$/, '$1') || '—');

            const amtNum    = parseAmount(tx.amount);
            const sign      = (amtNum > 0) ? '+' : '';
            const amtDisplay = isNaN(amtNum)
                ? escapeHtml(String(tx.amount || '—'))
                : `${sign}${formatCurrency(amtNum)}`;

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
    function showBanner(msg) {
        const b = document.getElementById('banner');
        b.textContent = msg;
        b.classList.remove('hidden');
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
                allTransactions = json.data.transactions;
                renderTransactions(allTransactions);
                return allTransactions;
            }
            if (json && json.transactions) {
                allTransactions = json.transactions;
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

    // --- Debug: fetch raw JSON (sin renderizar) ---------------------------------
    async function fetchTransactionsRaw(fresh = false, limit = 100) {
        try {
            const headers = {};
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            const res = await fetch(`${API}/activity?fresh=${fresh}&limit=${limit}`, { headers });
            const json = await res.json();
            console.debug('[UI] fetchTransactionsRaw', json);
            if (json && json.success && json.data) return json.data;
            return json;
        } catch (err) {
            console.error('fetchTransactionsRaw error', err);
            return null;
        }
    }

    function showRawJson(obj) {
        const pre = document.getElementById('tx-raw');
        if (!obj) {
            pre.textContent = 'null';
        } else {
            try { pre.textContent = JSON.stringify(obj, null, 2); } catch (e) { pre.textContent = String(obj); }
        }
        pre.classList.remove('hidden');
        document.getElementById('copy-raw-btn').classList.remove('hidden');
        document.getElementById('tx-raw-status').textContent = `Última actualización: ${new Date().toLocaleString()}`;
        pre.scrollIntoView({ behavior: 'smooth' });
    }

    /* --- SSE / realtime --- */
    function initSSE() {
        const statusEl = document.getElementById('status');
        try {
            // EventSource no soporta headers personalizados, pasar token como query param
            const watchUrl = authToken
                ? `${API}/watch?token=${encodeURIComponent(authToken)}`
                : `${API}/watch`;

            const es = new EventSource(watchUrl);
            es.onopen = () => { statusEl.textContent = 'watch: conectado'; };
            es.onmessage = (ev) => {
                try {
                    const msg = JSON.parse(ev.data);
                    if (msg && msg.type === 'new_transaction' && msg.transaction) {
                        const tx = msg.transaction;
                        addTransactionToTop(tx);
                        const amt = parseAmount(tx.amount);
                        if (!isNaN(amt)) {
                            if (amt > 0) {
                                showBanner(`💰 NUEVO INGRESO: ${formatCurrency(Math.abs(amt))}`);
                                // Reproducir sonido de notificación para ingresos
                                playIncomeSound();
                            } else if (amt < 0 && tx.raw && tx.raw.toLowerCase().includes('transfer')) {
                                // Mostrar también egreso si es una transferencia
                                showBanner(`↗️ Transferencia enviada: ${formatCurrency(Math.abs(amt))}`);
                            }
                        }
                    }
                    if (msg && msg.type === 'connected') {
                        statusEl.textContent = 'watch: conectado';
                    }
                } catch (e) { console.warn('SSE parse error', e); }
            };
            es.onerror = () => {
                statusEl.textContent = 'watch: desconectado — reintentando...';
                es.close();
                setTimeout(initSSE, 3000);
            };
        } catch (err) {
            console.warn('SSE not available', err);
            document.getElementById('status').textContent = 'watch: no disponible';
        }
    }

    /* --- init --- */
    async function init() {
        // Obtener token de autenticación primero
        const token = await authenticateAndGetToken();
        if (!token) {
            console.error('[Init] No se pudo obtener token - algunos endpoints fallarán');
        }

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

        // Raw JSON controls
        const toggleRawBtn = document.getElementById('toggle-raw-btn');
        const copyRawBtn = document.getElementById('copy-raw-btn');

        toggleRawBtn.addEventListener('click', async () => {
            const pre = document.getElementById('tx-raw');
            const hidden = pre.classList.contains('hidden');
            if (hidden) {
                document.getElementById('tx-raw-status').textContent = 'cargando...';
                const raw = await fetchTransactionsRaw(false, 100);
                showRawJson(raw);
                toggleRawBtn.textContent = 'Ocultar JSON crudo';
            } else {
                pre.classList.add('hidden');
                copyRawBtn.classList.add('hidden');
                document.getElementById('tx-raw-status').textContent = '';
                toggleRawBtn.textContent = 'Ver JSON crudo';
            }
        });

        copyRawBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(document.getElementById('tx-raw').textContent);
                showBanner('JSON copiado al portapapeles');
            } catch (e) {
                showBanner('No se pudo copiar el JSON');
            }
        });

        await Promise.all([fetchBalance(false), fetchTransactions(false)]);
        initSSE();
    }

    window.addEventListener('load', init);
})();