const { activityService } = require('./activityService');
const { randomWait } = require('../lib/randomDelay');
const crypto = require('crypto');

/**
 * Genera una firma única para una transacción (para detección de cambios)
 */
function getTransactionSignature(tx) {
    const key = `${tx.raw || ''}|${tx.amount}|${tx.dateTime}`;
    return crypto.createHash('sha1').update(key).digest('hex').substring(0, 12);
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
        this.lastKnownSignature = null; // Usar signature en lugar de ID
        this.pollMinSeconds = 3;
        this.pollMaxSeconds = 7;
        this.subscribers = []; // SSE clients
        this.errorCount = 0;
        this.maxErrors = 3;
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

        // Hacer un scrape inicial para obtener la firma de la última transacción conocida
        try {
            const activity = await this._safeActivityFetch();
            if (activity && activity.transactions.length > 0) {
                this.lastKnownSignature = getTransactionSignature(activity.transactions[0]);
                console.log('[TransactionWatch] Initial signature:', this.lastKnownSignature);
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
    subscribe(res) {
        this.subscribers.push(res);
        console.log(`[TransactionWatch] New subscriber. Total: ${this.subscribers.length}`);

        // Enviar ping inicial
        this._sendToSubscriber(res, {
            type: 'connected',
            message: 'Watching for new transactions',
            lastSignature: this.lastKnownSignature || null,
            timestamp: new Date().toISOString()
        });

        // Limpiar cuando el cliente se desconecte
        res.on('close', () => {
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

            const latestTx = activity.transactions[0];
            const currentSignature = getTransactionSignature(latestTx);

            // Comparar con la última firma conocida (basada en contenido, no ID)
            if (!this.lastKnownSignature || currentSignature !== this.lastKnownSignature) {
                console.log(`[TransactionWatch] ✨ New transaction detected: ${currentSignature.substring(0, 8)}... (${latestTx.amount} ${latestTx.currency})`);

                // Notificar a todos los subscribers
                this._broadcastNewTransaction(latestTx);

                this.lastKnownSignature = currentSignature;
                this.errorCount = 0; // reset error count on success
            } else {
                console.debug('[TransactionWatch] No new transactions (same signature)');
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
            lastKnownSignature: this.lastKnownSignature,
            errorCount: this.errorCount,
            maxErrors: this.maxErrors,
            pollRange: `${this.pollMinSeconds}-${this.pollMaxSeconds}s`
        };
    }
}

module.exports = TransactionWatchService;
