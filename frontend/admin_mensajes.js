(function () {
    const API = '/api/whatsapp';

    // Estado
    let currentChatId = null;
    let chats = [];
    let pollInterval = null;
    let sendingMessage = false;

    /* ─── Indicador de estado del servicio ─────────────────── */
    const STATUS_CONFIGS = {
        connecting: { css: 'ss-connecting', text: 'conectando…' },
        ok: { css: 'ss-ok', text: 'operativo' },
        reconnecting: { css: 'ss-warning', text: 'reconectando…' },
        not_ready: { css: 'ss-warning', text: 'iniciando…' },
        disabled: { css: 'ss-disabled', text: 'servicio deshabilitado' },
        auth_error: { css: 'ss-error', text: 'no autenticado' },
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

    /* ─── Banner ────────────────────────────────────────────── */
    let bannerTimer = null;
    let authPollingInterval = null;
    const AUTH_POLL_MS = 7000;

    function hideBanner() {
        const b = document.getElementById('banner');
        if (!b) return;
        b.classList.add('hidden');
    }

    function showBanner(msg, type = 'success', opts = {}) {
        const b = document.getElementById('banner');
        if (!b) return;
        if (opts.allowHtml) {
            b.innerHTML = msg;
        } else {
            b.textContent = msg;
        }
        b.classList.remove('hidden', 'neutral', 'error');
        if (type === 'neutral') b.classList.add('neutral');
        else if (type === 'error') b.classList.add('error');
        if (bannerTimer) clearTimeout(bannerTimer);
        if (!opts.persistent) {
            bannerTimer = setTimeout(() => b.classList.add('hidden'), 6000);
        }
    }

    function stopAuthPolling() {
        if (authPollingInterval) {
            clearInterval(authPollingInterval);
            authPollingInterval = null;
        }
    }

    async function pollAuthStatus() {
        const state = await checkWhatsAppAuthStatus();
        if (state === 'authenticated') {
            stopAuthPolling();
            hideBanner();
            updateServiceStatus('ok');
            await loadChats();
            pollInterval = setInterval(async () => {
                await loadChats();
                if (currentChatId) {
                    await loadMessages(currentChatId);
                }
            }, 15000);
        }
    }

    function startAuthPolling() {
        if (authPollingInterval) return;
        authPollingInterval = setInterval(pollAuthStatus, AUTH_POLL_MS);
    }

    /* ─── Health check ──────────────────────────────────────── */
    async function checkHealth() {
        try {
            const res = await fetch(`${API}/health`);
            let data = null;
            try { data = await res.json(); } catch (_) { }
            if (data && data.status === 'disabled') {
                updateServiceStatus('disabled');
                return 'disabled';
            }
            if (!res.ok) {
                updateServiceStatus('api_error');
                return 'error';
            }
            if (data && data.status === 'not_ready') {
                updateServiceStatus('not_ready');
                return 'not_ready';
            }
            return 'ok';
        } catch (e) {
            updateServiceStatus('api_error', 'sin respuesta del servidor');
            return 'error';
        }
    }

    async function fetchWhatsAppQr() {
        try {
            const res = await fetch('/api/diagnostic/whatsapp-qr');
            if (!res.ok) return null;
            const data = await res.json();
            return data.qrDataUrl || null;
        } catch (e) {
            console.warn('[admin_mensajes] fetchWhatsAppQr error', e);
            return null;
        }
    }

    async function checkWhatsAppAuthStatus() {
        try {
            const res = await fetch('/api/diagnostic/whatsapp-status-simple');
            if (!res.ok) {
                return null;
            }

            const data = await res.json();
            if (!data || !data.state) return null;

            if (data.state === 'needs_authentication') {
                updateServiceStatus('auth_error');

                const qrDataUrl = await fetchWhatsAppQr();
                let message =
                    '⚠️ La sesión de WhatsApp no está iniciada.<br>' +
                    'Escanea el QR o hazlo por VNC <strong>localhost:5901</strong>';

                if (qrDataUrl) {
                    message +=
                        '<div style="margin-top:0.75rem;text-align:center;">' +
                        `<img src="${qrDataUrl}" alt="WhatsApp QR" style="max-width:240px;max-height:240px;border:1px solid #ffffff33;border-radius:12px;" />` +
                        '</div>';
                }

                showBanner(message, 'error', { allowHtml: true, persistent: true });
                return 'needs_authentication';
            }

            if (data.state === 'authenticated') {
                return 'authenticated';
            }

            if (data.state === 'unknown') {
                updateServiceStatus('not_ready');
                showBanner(
                    'WhatsApp no pudo determinar el estado de la sesión. ' +
                    'Revisá la ventana del contenedor o reiniciá el servicio si es necesario.',
                    'neutral',
                    { persistent: true }
                );
                return 'unknown';
            }

            return null;
        } catch (e) {
            console.warn('[admin_mensajes] checkWhatsAppAuthStatus error', e);
            return null;
        }
    }

    /* ─── Formateo de fecha/hora ─────────────────────────────── */
    function formatTime(ts) {
        if (!ts) return '';
        const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
        if (isNaN(d)) return '';
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    function formatDateDivider(ts) {
        if (!ts) return '';
        const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
        if (isNaN(d)) return '';
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function isSameDay(ts1, ts2) {
        if (!ts1 || !ts2) return false;
        const d1 = new Date(typeof ts1 === 'number' ? ts1 * 1000 : ts1);
        const d2 = new Date(typeof ts2 === 'number' ? ts2 * 1000 : ts2);
        return d1.toDateString() === d2.toDateString();
    }

    function escapeHtml(s) {
        if (!s) return '';
        return String(s).replace(/[&<>"]/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
        }[c]));
    }

    /* ─── Avatar ─────────────────────────────────────────────── */
    function getInitial(name) {
        if (!name) return '?';
        const clean = name.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9\s]/g, '').trim();
        return (clean[0] || '?').toUpperCase();
    }

    const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    function avatarColor(id) {
        let h = 0;
        for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
        return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
    }

    /* ─── Renderizar lista de chats ──────────────────────────── */
    function renderChatList(list) {
        const ul = document.getElementById('chat-list');
        ul.innerHTML = '';

        if (!list || list.length === 0) {
            ul.innerHTML = '<li class="chat-list-empty">Sin conversaciones</li>';
            return;
        }

        list.forEach(chat => {
            const li = document.createElement('li');
            li.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
            if (chat.unreadCount > 0) li.classList.add('unread');
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', chat.id === currentChatId ? 'true' : 'false');
            li.dataset.chatId = chat.id;

            const initial = getInitial(chat.name || chat.id);
            const color = avatarColor(chat.id);
            const preview = escapeHtml(chat.lastMessage || '');
            const time = formatTime(chat.timestamp);
            const unread = chat.unreadCount > 0
                ? `<span class="unread-badge">${chat.unreadCount}</span>`
                : '';

            li.innerHTML = `
                <div class="chat-item-avatar" style="background:${color}">${initial}</div>
                <div class="chat-item-body">
                    <div class="chat-item-name">${escapeHtml(chat.name || chat.id)}</div>
                    <div class="chat-item-preview">${preview}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.2rem;">
                    <span class="chat-item-time">${time}</span>
                    ${unread}
                </div>
            `;

            li.addEventListener('click', () => selectChat(chat));
            ul.appendChild(li);
        });
    }

    /* ─── Seleccionar chat ───────────────────────────────────── */
    async function selectChat(chat) {
        currentChatId = chat.id;

        // Actualizar header
        const color = avatarColor(chat.id);
        document.getElementById('chat-avatar').textContent = getInitial(chat.name || chat.id);
        document.getElementById('chat-avatar').style.background = color;
        document.getElementById('chat-name').textContent = chat.name || chat.id;
        document.getElementById('chat-id-display').textContent = chat.id !== chat.name ? chat.id : '';

        // Activar input
        document.getElementById('reply-input').disabled = false;
        document.getElementById('send-btn').disabled = false;

        // Marcar activo en sidebar
        document.querySelectorAll('.chat-item').forEach(el => {
            el.classList.toggle('active', el.dataset.chatId === chat.id);
        });

        // Cargar mensajes
        await loadMessages(chat.id);
    }

    /* ─── Cargar mensajes ────────────────────────────────────── */
    async function loadMessages(chatId) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch spin"></i> Cargando mensajes…</div>';

        try {
            console.log(`[admin_mensajes] loadMessages: iniciando GET para chatId="${chatId}"`);
            const res = await fetch(`${API}/messages/${encodeURIComponent(chatId)}`);
            console.log(`[admin_mensajes] loadMessages: respuesta recibida (${res.status})`);

            if (!res.ok) {
                console.error(`[admin_mensajes] loadMessages: error ${res.status}`);
                container.innerHTML = '<div class="messages-empty"><i class="fas fa-exclamation-circle"></i><p>No se pudieron cargar los mensajes</p></div>';
                return;
            }

            const data = await res.json();
            console.log(`[admin_mensajes] loadMessages: datos recibidos`, { count: data.count, hasMessages: !!data.messages });

            const messages = data.messages || data || [];
            console.log(`[admin_mensajes] loadMessages: extrayendo ${messages.length} mensajes`);
            renderMessages(messages, chatId);
        } catch (e) {
            console.error(`[admin_mensajes] loadMessages: excepción`, e);
            container.innerHTML = '<div class="messages-empty"><i class="fas fa-exclamation-circle"></i><p>Error al cargar mensajes</p></div>';
        }
    }

    /* ─── Renderizar mensajes ────────────────────────────────── */
    function renderMessages(messages, chatId) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="messages-empty"><i class="fas fa-comments"></i><p>Sin mensajes en esta conversación</p></div>';
            return;
        }

        let lastTs = null;

        messages.forEach(msg => {
            const ts = msg.timestamp || msg.time;

            // Separador de fecha
            if (!isSameDay(lastTs, ts)) {
                const div = document.createElement('div');
                div.className = 'msg-date-divider';
                div.textContent = formatDateDivider(ts);
                container.appendChild(div);
            }
            lastTs = ts;

            // Determinar si es mensaje saliente (nuestro) o entrante
            const isOutgoing = msg.fromMe === true || msg.from_me === true;
            const row = document.createElement('div');
            row.className = `msg-row ${isOutgoing ? 'outgoing' : 'incoming'}`;

            const author = !isOutgoing && msg.author
                ? `<div class="msg-author">${escapeHtml(msg.author)}</div>`
                : '';

            const body = escapeHtml(msg.body || msg.text || msg.content || '');
            const time = formatTime(ts);

            row.innerHTML = `
                <div class="msg-bubble">
                    ${author}
                    <div class="msg-body">${body}</div>
                    <div class="msg-meta">
                        <span>${time}</span>
                        ${isOutgoing ? '<i class="fas fa-check" title="Enviado"></i>' : ''}
                    </div>
                </div>
            `;

            container.appendChild(row);
        });

        // Scroll al final
        container.scrollTop = container.scrollHeight;
    }

    /* ─── Enviar mensaje ─────────────────────────────────────── */
    async function sendMessage() {
        if (sendingMessage || !currentChatId) return;
        const input = document.getElementById('reply-input');
        const text = input.value.trim();
        if (!text) return;

        sendingMessage = true;
        const btn = document.getElementById('send-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> <span>Enviando…</span>';

        try {
            const res = await fetch(`${API}/send-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: currentChatId, message: text })
            });

            if (res.ok) {
                input.value = '';
                await loadMessages(currentChatId);
            } else {
                const err = await res.json().catch(() => ({}));
                showBanner(err.error || 'Error al enviar el mensaje', 'error');
            }
        } catch (e) {
            showBanner('Error de red al enviar el mensaje', 'error');
        } finally {
            sendingMessage = false;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar</span>';
        }
    }

    /* ─── Cargar lista de chats ──────────────────────────────── */
    async function loadChats() {
        try {
            const res = await fetch(`${API}/chats`);
            if (!res.ok) return;
            const data = await res.json();
            chats = data.chats || data || [];

            // Aplicar filtro de búsqueda si hay texto
            const searchTerm = document.getElementById('search-input').value.toLowerCase();
            const filtered = searchTerm
                ? chats.filter(c => (c.name || c.id || '').toLowerCase().includes(searchTerm))
                : chats;

            renderChatList(filtered);

            // Si hay un chat seleccionado, mantener su estado activo
            if (currentChatId) {
                document.querySelectorAll('.chat-item').forEach(el => {
                    el.classList.toggle('active', el.dataset.chatId === currentChatId);
                });
            }
        } catch (e) {
            // ignorar errores de red silenciosamente
        }
    }

    /* ─── Filtro de búsqueda ─────────────────────────────────── */
    function filterChats(term) {
        const lower = (term || '').toLowerCase();
        const filtered = lower
            ? chats.filter(c => (c.name || c.id || '').toLowerCase().includes(lower))
            : chats;
        renderChatList(filtered);
    }

    /* ─── Init ───────────────────────────────────────────────── */
    async function init() {
        // Seguridad: solo personal nivel >= 50
        if (window.navbarManager) {
            if (!navbarManager.protectAdminPage() || !navbarManager.tieneNivel(50)) {
                if (navbarManager.userNivel < 50) {
                    alert('Acceso restringido al personal.');
                    window.location.href = '/index.html';
                }
                return;
            }
        }

        // Verificar estado del servicio
        const health = await checkHealth();

        if (health === 'disabled') {
            showBanner(
                '⚠️ El servicio de WhatsApp no está habilitado. ' +
                'Para activarlo, reiniciar el backend con la opción <strong>--wa</strong>.',
                'error',
                { allowHtml: true, persistent: true }
            );
            document.getElementById('chat-list').innerHTML =
                '<li class="chat-list-empty">Servicio deshabilitado</li>';
            return;
        }

        if (health === 'not_ready') {
            showBanner('WhatsApp aún está iniciando. Reintentando…', 'neutral');
            setTimeout(init, 5000);
            return;
        }

        if (health === 'error') {
            showBanner('No se puede conectar con el servidor', 'error');
            return;
        }

        const authState = await checkWhatsAppAuthStatus();
        if (authState === 'needs_authentication' || authState === 'unknown') {
            document.getElementById('chat-list').innerHTML =
                '<li class="chat-list-empty">WhatsApp no está autenticado. Escaneá el QR en la pantalla del contenedor.</li>';
            startAuthPolling();
            return;
        }

        updateServiceStatus('ok');

        // Cargar chats iniciales
        await loadChats();

        // Polling de chats cada 15s
        pollInterval = setInterval(async () => {
            await loadChats();
            // Si hay un chat abierto, refrescar mensajes también
            if (currentChatId) {
                await loadMessages(currentChatId);
            }
        }, 15000);

        // Eventos UI
        document.getElementById('search-input').addEventListener('input', e => {
            filterChats(e.target.value);
        });

        document.getElementById('refresh-chats-btn').addEventListener('click', async () => {
            const btn = document.getElementById('refresh-chats-btn');
            btn.querySelector('i').classList.add('spin');
            await loadChats();
            btn.querySelector('i').classList.remove('spin');
        });

        const replyInput = document.getElementById('reply-input');
        const sendBtn = document.getElementById('send-btn');

        // Enviar con Enter (Shift+Enter para nueva línea)
        replyInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);
    }

    window.addEventListener('load', init);
})();
