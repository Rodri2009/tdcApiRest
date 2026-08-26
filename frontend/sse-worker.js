/**
 * sse-worker.js — SharedWorker que mantiene la conexión SSE viva
 * independientemente de recargas de la página.
 *
 * Ciclo de vida:
 *  - El worker persiste mientras al menos una pestaña/ventana esté conectada.
 *  - Cuando se carga una nueva pestaña, se conecta al worker existente
 *    y empieza a recibir eventos de inmediato (sin reconectar al servidor).
 *  - Si todos los clientes cierran la conexión, el worker también cierra SSE.
 */

'use strict';

const WORKER_VERSION = '7';
console.log('[SSE-Worker] 🚀 Iniciando worker v' + WORKER_VERSION);

const API = '/api/mercadopago';

let es = null;            // instancia EventSource
let currentToken = null;  // token activo
let reconnectTimer = null;
let reconnectDelay = 3000; // ms, se incrementa en backoff
const MAX_DELAY = 30000;

/** Conjunto de todos los puertos (pestañas) conectados */
const ports = new Set();

/** Envía un mensaje a todas las pestañas conectadas */
function broadcast(data) {
    const str = JSON.stringify(data);
    const dead = [];
    ports.forEach(p => {
        try { p.postMessage(str); } catch (e) {
            // El puerto ya no existe — marcarlo para eliminar
            dead.push(p);
        }
    });
    dead.forEach(p => ports.delete(p));
}

/** Cierra SSE si ya no hay pestañas conectadas */
function checkAlive() {
    if (ports.size === 0 && es) {
        console.log('[SSE-Worker] Sin pestañas — cerrando EventSource');
        es.close();
        es = null;
        currentToken = null;
    }
}

/** Abre la conexión SSE con el token dado */
function connectSSE(token) {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (es) {
        es.close();
        es = null;
    }

    currentToken = token;
    const url = `${API}/watch?token=${encodeURIComponent(token)}`;

    console.log('[SSE-Worker] Conectando a', url.slice(0, 60) + '…');

    try {
        es = new EventSource(url);
    } catch (err) {
        console.error('[SSE-Worker] No se pudo crear EventSource:', err);
        broadcast({ type: 'sse-error', reason: String(err) });
        scheduleReconnect();
        return;
    }

    es.onopen = () => {
        console.log('[SSE-Worker] ✅ Conexión abierta');
        reconnectDelay = 3000; // reset backoff
        broadcast({ type: 'sse-open' });
    };

    es.onmessage = (ev) => {
        // Reenviar el data crudo a todas las pestañas
        broadcast({ type: 'sse-message', data: ev.data });
    };

    es.onerror = (err) => {
        console.warn('[SSE-Worker] ⚠️ Error en EventSource — estado:', es.readyState);
        broadcast({ type: 'sse-error' });
        es.close();
        es = null;
        if (ports.size > 0) {
            scheduleReconnect();
        }
    };
}

/** Re-intento con backoff exponencial */
function scheduleReconnect() {
    if (reconnectTimer) return; // ya hay uno pendiente
    console.log(`[SSE-Worker] Reintentando en ${reconnectDelay / 1000}s…`);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (currentToken && ports.size > 0) {
            connectSSE(currentToken);
        }
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_DELAY);
}

/** Handler para nuevas pestañas que se conectan al SharedWorker */
self.onconnect = (connectEvent) => {
    const port = connectEvent.ports[0];
    ports.add(port);
    console.log('[SSE-Worker] Nueva pestaña conectada. Total:', ports.size);

    port.onmessage = (ev) => {
        let msg;
        try {
            msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        } catch (e) {
            return;
        }

        if (msg.type === 'start') {
            const newToken = msg.token;

            if (!es || newToken !== currentToken) {
                // Sin conexión o token distinto: conectar
                connectSSE(newToken);
            } else if (es.readyState === EventSource.OPEN) {
                // Conexión ya abierta: informar a este cliente inmediatamente
                port.postMessage(JSON.stringify({ type: 'sse-open' }));
            } else if (es.readyState === EventSource.CONNECTING) {
                // Está conectando — cuando abra, onopen hará broadcast a todos los puertos
                // No hacer nada; el cliente recibirá 'sse-open' cuando se complete
                console.log('[SSE-Worker] Conexión en progreso, cliente esperará sse-open automático');
            } else {
                // CLOSED (readyState === 2): reconectar
                connectSSE(newToken);
            }
            // Siempre responder con el estado actual para que la página sepa donde está
            port.postMessage(JSON.stringify({
                type: 'sse-state',
                readyState: es ? es.readyState : -1
            }));
        }

        if (msg.type === 'ping') {
            port.postMessage(JSON.stringify({
                type: 'pong',
                connected: !!(es && es.readyState === EventSource.OPEN),
                readyState: es ? es.readyState : -1
            }));
        }
    };

    port.onmessageerror = () => {
        ports.delete(port);
        checkAlive();
    };

    // Detectar cuando la pestaña se cierra
    // (los puertos de SharedWorker no emiten 'close' directamente, pero sí lanzan error
    //  si postMessage falla tras el cierre; checkAlive se llama en broadcast)
    port.start();
};
