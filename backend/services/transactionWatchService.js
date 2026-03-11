const { activityService } = require('./activityService');
const { randomWait } = require('../lib/randomDelay');
const crypto = require('crypto');

/**
 * Genera una firma única para una transacción.
 * Combina todos los campos disponibles para minimizar colisiones entre
 * transacciones del mismo tipo/monto en fechas distintas.
 */
function getTransactionSignature(tx) {
    const parts = [
        tx.raw || '',
        tx.name || '',
        tx.description || '',
        tx.amount || '',
        tx.dateTime || '',
        tx.date || '',
        tx.time || '',
        tx.type || ''
    ];
    const key = parts.join('|');
    return crypto.createHash('sha1').update(key).digest('hex').substring(0, 20);
}

/**
 * Servicio de vigilancia de transacciones con polling interno
 * Usa SSE (Server-Sent Events) para notificar a clientes en tiempo real
 */
class TransactionWatchService {
    constructor(page) {
        this.page = page;
        this.isActive = false;
        this.pollIntervalId = null;
        // Set de firmas de todas las transacciones ya conocidas.
        // Cualquier tx nueva (no vista antes) dispara la notificación,
        // incluso si no es la primera de la lista.
        this.knownSignatures = new Set();
        this.knownSignaturesMaxSize = 200; // evitar crecimiento infinito
        this.pollMinSeconds = 3;
        this.pollMaxSeconds = 7;
        this.subscribers = []; // SSE clients
        this.errorCount = 0;
        this.maxErrors = 5;
    }

    /**
     * Inicia el polling de transacciones
     */
    async start() {
        if (this.isActive) {
            console.log('[TransactionWatch] Already active');
            return;
        }

        this.isActive = true;
        this.errorCount = 0;
        console.log(`[TransactionWatch] Starting polling (${this.pollMinSeconds}-${this.pollMaxSeconds}s random intervals)`);

        // Scrape inicial: cargar todas las transacciones visibles actualmente en el Set.
        // A partir de aquí cualquier tx que NO esté en el Set se considerará nueva.
        try {
            const activity = await this._safeActivityFetch();
            if (activity && activity.transactions.length > 0) {
                activity.transactions.forEach(tx => {
                    this.knownSignatures.add(getTransactionSignature(tx));
                });
                console.log(`[TransactionWatch] Initial load: ${this.knownSignatures.size} transacciones conocidas`);
            }
        } catch (err) {
            console.warn('[TransactionWatch] Initial fetch failed:', err.message);
        }

        // Iniciar polling
        this._scheduleNextPoll();
    }

    /**
     * Detiene el polling
     */
    stop() {
        this.isActive = false;
        if (this.pollIntervalId) {
            clearTimeout(this.pollIntervalId);
            this.pollIntervalId = null;
        }
        console.log('[TransactionWatch] Stopped');
    }

    /**
     * Suscribe un cliente SSE a notificaciones
     */
    subscribe(res, userId = null) {
        // attach user id to response for debugging
        res._userId = userId;
        this.subscribers.push(res);
        console.log(`[TransactionWatch] New subscriber (user=${userId || '?'}) Total: ${this.subscribers.length}`);

        // Enviar ping inicial
        this._sendToSubscriber(res, {
            type: 'connected',
            message: 'Watching for new transactions',
            knownTransactions: this.knownSignatures.size,
            timestamp: new Date().toISOString()
        });
        console.log('[TransactionWatch] Sent initial connection message');

        // Enviar heartbeat cada 30 segundos para mantener viva la conexión
        const heartbeatInterval = setInterval(() => {
            if (res.writableEnded) {
                clearInterval(heartbeatInterval);
                return;
            }
            try {
                console.log('[TransactionWatch] 💓 Sending heartbeat to subscriber');
                res.write(': keepalive\n\n');
            } catch (err) {
                console.error('[TransactionWatch] Heartbeat error:', err.message);
                clearInterval(heartbeatInterval);
            }
        }, 30000); // 30 segundos

        // Limpiar cuando el cliente se desconecte
        res.on('close', () => {
            clearInterval(heartbeatInterval);
            this.subscribers = this.subscribers.filter(s => s !== res);
            console.log(`[TransactionWatch] Subscriber disconnected. Total: ${this.subscribers.length}`);
        });
    }

    /**
     * Ejecuta el polling
     */
    async _poll() {
        try {
            if (!this.isActive) return;

            const activity = await this._safeActivityFetch();

            if (!activity || activity.transactions.length === 0) {
                console.debug('[TransactionWatch] No transactions found');
                return;
            }

            // Buscar CUALQUIER transacción que no haya sido vista antes
            const newTransactions = [];
            for (const tx of activity.transactions) {
                const sig = getTransactionSignature(tx);
                if (!this.knownSignatures.has(sig)) {
                    newTransactions.push({ tx, sig });
                }
            }

            if (newTransactions.length > 0) {
                // Registrar las nuevas firmas en el Set
                for (const { tx, sig } of newTransactions) {
                    this.knownSignatures.add(sig);
                    console.log(`[TransactionWatch] ✨ Nueva tx detectada: ${sig.substring(0, 8)}... amount=${tx.amount} name=${tx.name || tx.raw?.split('\n')[0] || '?'}`);
                    // Notificar a suscriptores
                    this._broadcastNewTransaction(tx);
                }
                // Limpiar el Set si creció demasiado (mantener las últimas N)
                if (this.knownSignatures.size > this.knownSignaturesMaxSize) {
                    const toRemove = Array.from(this.knownSignatures).slice(0, this.knownSignatures.size - this.knownSignaturesMaxSize);
                    toRemove.forEach(s => this.knownSignatures.delete(s));
                }
                this.errorCount = 0;
            } else {
                console.debug(`[TransactionWatch] Sin transacciones nuevas (${activity.transactions.length} revisadas)`);
            }

        } catch (err) {
            this.errorCount++;
            console.error(`[TransactionWatch] Poll error (${this.errorCount}/${this.maxErrors}):`, err.message);

            if (this.errorCount >= this.maxErrors) {
                console.error('[TransactionWatch] Max errors reached, stopping watch');
                this.stop();
                this._broadcastError('Max errors reached, watch stopped');
                return;
            }

        } finally {
            // Programar siguiente poll con tiempo aleatorio
            this._scheduleNextPoll();
        }
    }

    /**
     * Obtiene actividad de forma segura con validación
     * IMPORTANTE: Usar fresh=true para no obtener datos cacheados
     * El watch necesita detectar cambios, no servir cache
     */
    async _safeActivityFetch() {
        const { getActivity } = require('./activityService');
        return await getActivity(this.page, true); // fresh=true SIEMPRE obtiene datos frescos de la página
    }

    /**
     * Programa el siguiente poll con delay aleatorio
     */
    _scheduleNextPoll() {
        if (!this.isActive) return;

        const delay = require('../lib/randomDelay').getRandomDelay(
            this.pollMinSeconds,
            this.pollMaxSeconds
        );

        this.pollIntervalId = setTimeout(() => this._poll(), delay);
    }

    /**
     * Broadcast de nueva transacción a todos los subscribers
     */
    _broadcastNewTransaction(transaction) {
        const event = {
            type: 'new_transaction',
            transaction,
            timestamp: new Date().toISOString()
        };

        this.subscribers.forEach(res => this._sendToSubscriber(res, event));
    }

    /**
     * Broadcast de error a todos los subscribers
     */
    _broadcastError(message) {
        const event = {
            type: 'error',
            message,
            timestamp: new Date().toISOString()
        };

        this.subscribers.forEach(res => this._sendToSubscriber(res, event));
    }

    /**
     * Envía un evento SSE a un cliente
     */
    _sendToSubscriber(res, data) {
        try {
            if (res && res.write && !res.writableEnded) {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            }
        } catch (err) {
            console.error('[TransactionWatch] Error sending to subscriber:', err.message);
        }
    }

    /**
     * Obtiene estado del watch
     */
    getStatus() {
        return {
            active: this.isActive,
            subscriberCount: this.subscribers.length,
            knownSignaturesCount: this.knownSignatures.size,
            errorCount: this.errorCount,
            maxErrors: this.maxErrors,
            pollRange: `${this.pollMinSeconds}-${this.pollMaxSeconds}s`
        };
    }
}

module.exports = TransactionWatchService;
