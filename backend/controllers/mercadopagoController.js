/**
 * Mercado Pago Scraping Service Controller
 * 
 * Modo 1: Si req.mpPage está disponible (ENABLE_PUPPETEER_MP=true) → usa handlers locales
 * Modo 2: Si no → proxy a http://localhost:9001 (servidor separado)
 */

const axios = require('axios');
const { logSuccess, logError, logVerbose } = require('../lib/debugFlags') || {
    logSuccess: (msg) => console.log('[OK]', msg),
    logError: (msg) => console.error('[ERR]', msg),
    logVerbose: (msg) => console.log('[VERBOSE]', msg)
};
const tokenManager = require('../lib/tokenManager');

const MP_SERVER = process.env.MP_SERVER_URL || 'http://localhost:9001';

// Importar handlers locales del servidor
let getBalanceHandler, getActivityHandler, watchActivityHandler, initializeWatch;
try {
    ({ getBalanceHandler } = require('./balanceController'));
    ({ getActivityHandler } = require('./activityController'));
    ({ watchActivityHandler, initializeWatch } = require('./watchController'));
} catch (err) {
    logVerbose(`[MP-Controller] Local handlers no disponibles, usará proxy mode: ${err.message}`);
}

/**
 * GET /api/mercadopago/balance?fresh=true|false
 */
exports.getBalance = async (req, res) => {
    try {
        const fresh = req.query.fresh === 'true';

        // Modo 1: Usar handler local si req.mpPage disponible
        if (req.mpPage && getBalanceHandler) {
            logVerbose(`[MP-Balance] Usando handler local (modo directo)`);
            return getBalanceHandler(req, res, req.mpPage);
        }

        // Modo 2: Proxy al servidor remoto
        logVerbose(`[MP-Balance] Proxy a ${MP_SERVER}/api/balance?fresh=${fresh}`);
        const response = await axios.get(
            `${MP_SERVER}/api/balance`,
            {
                params: { fresh },
                timeout: 10000,
                headers: {
                    'Authorization': req.headers.authorization || '',
                }
            }
        );

        logSuccess(`[MP-Balance] ✅ Retrieved balance`);
        res.json(response.data);

    } catch (error) {
        logError(`[MP-Balance] ❌ Error: ${error.message}`);
        const statusCode = error.response?.status || 503;
        res.status(statusCode).json({
            error: 'Balance unavailable',
            status: statusCode,
            details: error.message
        });
    }
};

/**
 * GET /api/mercadopago/activity?fresh=true|false&limit=20
 */
exports.getActivity = async (req, res) => {
    try {
        const fresh = req.query.fresh === 'true';
        const limit = req.query.limit || 20;

        // Modo 1: Usar handler local si req.mpPage disponible
        if (req.mpPage && getActivityHandler) {
            logVerbose(`[MP-Activity] Usando handler local (modo directo)`);
            return getActivityHandler(req, res, req.mpPage);
        }

        // Modo 2: Proxy al servidor remoto
        logVerbose(`[MP-Activity] Proxy a ${MP_SERVER}/api/activity?fresh=${fresh}&limit=${limit}`);
        const response = await axios.get(
            `${MP_SERVER}/api/activity`,
            {
                params: { fresh, limit },
                timeout: 10000,
                headers: {
                    'Authorization': req.headers.authorization || '',
                }
            }
        );

        logSuccess(`[MP-Activity] ✅ Retrieved ${limit} transactions`);
        res.json(response.data);

    } catch (error) {
        logError(`[MP-Activity] ❌ Error: ${error.message}`);
        const statusCode = error.response?.status || 503;
        res.status(statusCode).json({
            error: 'Activity unavailable',
            status: statusCode,
            details: error.message
        });
    }
};

/**
 * GET /api/mercadopago/watch (Server-Sent Events)
 */
// debug: POST /api/mercadopago/watch/debug
// body: transaction object
exports.debugBroadcast = (req, res) => {
    try {
        const tx = req.body;
        const { debugBroadcastHandler, getWatchService } = require('./watchController');
        const { success, subscribers } = debugBroadcastHandler(tx);
        if (success) {
            return res.status(200).json({ success: true, message: 'Event broadcast', subscribers });
        } else {
            return res.status(400).json({ success: false, error: 'Watch service not active', subscribers });
        }
    } catch (err) {
        logError('[MP-Debug] Error broadcasting:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * POST /api/mercadopago/watch/test
 * Simula un ingreso SIN requerir JWT — solo necesita la clave DEBUG_SECRET del .env
 * Ideal para pruebas con curl desde terminal.
 *
 * Body (todos opcionales):
 *   { secret, name, amount, description }
 *
 * Curl de ejemplo:
 *   curl -s -X POST http://localhost/api/mercadopago/watch/test \
 *     -H 'Content-Type: application/json' \
 *     -d '{"secret":"test123","name":"Juan Perez","amount":"5000"}'
 */
exports.testBroadcast = (req, res) => {
    try {
        const DEBUG_SECRET = process.env.DEBUG_SECRET || 'test123';
        const { secret, name, amount, description } = req.body || {};

        if (!secret || secret !== DEBUG_SECRET) {
            return res.status(401).json({ success: false, error: 'Invalid or missing secret' });
        }

        const { debugBroadcastHandler } = require('./watchController');

        const txAmount = amount || String(Math.floor(Math.random() * 50000) + 1000);
        const txName = name || 'Test Ingreso';
        const now = new Date();

        const fakeTx = {
            name: txName,
            description: description || 'Transferencia recibida (test)',
            amount: txAmount,
            type: 'income',
            dateTime: now.toISOString(),
            date: now.toLocaleDateString('es-AR'),
            time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            raw: `${txName}\n$\n${txAmount}\nIngreso de dinero\n${now.toLocaleTimeString('es-AR')}`
        };

        const { success, subscribers } = debugBroadcastHandler(fakeTx);
        logVerbose(`[MP-Test] Broadcast enviado: amount=${txAmount} name=${txName} subscribers=${subscribers}`);

        return res.status(200).json({
            success,
            message: success ? `Notificación enviada a ${subscribers} cliente/s` : 'Watch service no activo',
            subscribers,
            transaction: fakeTx
        });
    } catch (err) {
        logError('[MP-Test] Error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.watchTransactions = async (req, res) => {
    try {
        // Validar token del query param (ya que no viene en headers para SSE/EventSource)
        const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            logError('[MP-Watch] ❌ No token provided');
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Validar token
        try {
            const decoded = tokenManager.verifyToken(token);
            if (!decoded) {
                logError(`[MP-Watch] ❌ Token validation failed: Token inválido o tipo incorrecto`);
                return res.status(401).json({ error: 'Invalid token' });
            }
            req.user = decoded;  // Asignar usuario para que watchActivityHandler pueda acceder
            logVerbose(`[MP-Watch] ✓ Token validado para usuario: ${decoded.id || 'unknown'}`);
        } catch (err) {
            logError(`[MP-Watch] ❌ Token validation failed: ${err?.message || err || 'Unknown error'}`);
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Modo 1: Usar handler local si req.mpPage disponible
        if (req.mpPage && watchActivityHandler) {
            logVerbose(`[MP-Watch] Usando handler local (modo directo)`);
            return watchActivityHandler(req, res, req.mpPage);
        }

        // Modo 2: Proxy al servidor remoto
        logVerbose(`[MP-Watch] Proxy a ${MP_SERVER}/api/activity/watch`);
        const axiosReq = axios.get(
            `${MP_SERVER}/api/activity/watch`,
            {
                responseType: 'stream',
                timeout: 0,
                headers: {
                    'Authorization': req.headers.authorization || '',
                }
            }
        );

        axiosReq.then(axiosRes => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'X-Accel-Buffering': 'no'
            });

            axiosRes.data.pipe(res);

            res.on('close', () => {
                logVerbose('[MP-Watch] ⚠️ SSE connection closed');
                axiosRes.data.destroy();
            });

            axiosRes.data.on('error', (err) => {
                logError(`[MP-Watch] Stream error: ${err.message}`);
                res.end();
            });

        }).catch(error => {
            logError(`[MP-Watch] ❌ Error: ${error.message}`);
            res.status(error.response?.status || 503).json({
                error: 'Watch stream unavailable',
                details: error.message
            });
        });

    } catch (error) {
        logError(`[MP-Watch] ❌ Unexpected error: ${error.message}`);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};

/**
 * POST /api/mercadopago/refresh
 */
exports.refresh = async (req, res) => {
    try {
        const { target = 'all' } = req.body || {};

        if (!['balance', 'activity', 'all'].includes(target)) {
            return res.status(400).json({
                error: 'Invalid target',
                message: 'Must be: balance, activity, or all'
            });
        }

        // Modo 1: Usar handlers locales si req.mpPage disponible
        if (req.mpPage) {
            logVerbose(`[MP-Refresh] Ejecutando refresh local (target=${target})`);
            try {
                const results = {};

                if (['balance', 'all'].includes(target)) {
                    try {
                        const { getBalance } = require('../services/balanceService');
                        results.balance = await getBalance(req.mpPage, true);
                    } catch (err) {
                        results.balanceError = err.message;
                    }
                }

                if (['activity', 'all'].includes(target)) {
                    try {
                        const { getActivity } = require('../services/activityService');
                        results.activity = await getActivity(req.mpPage, true);
                    } catch (err) {
                        results.activityError = err.message;
                    }
                }

                return res.status(200).json({
                    success: true,
                    refreshedAt: new Date().toISOString(),
                    results
                });
            } catch (err) {
                logError(`[MP-Refresh] Local refresh error: ${err.message}`);
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }
        }

        // Modo 2: Proxy al servidor remoto
        logVerbose(`[MP-Refresh] Proxy a ${MP_SERVER}/api/refresh (target=${target})`);
        const response = await axios.post(
            `${MP_SERVER}/api/refresh`,
            { target },
            {
                timeout: 30000,
                headers: {
                    'Authorization': req.headers.authorization || '',
                }
            }
        );

        logSuccess(`[MP-Refresh] ✅ Refresh completado`);
        res.json({ success: true, data: response.data });

    } catch (error) {
        logError(`[MP-Refresh] ❌ Error: ${error.message}`);
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Refresh failed',
            details: error.message
        });
    }
};

/**
 * GET /api/mercadopago/health
 */
exports.health = async (req, res) => {
    try {
        // Si tenemos mpPage local, devolver estado local
        if (req.mpPage) {
            return res.json({
                status: 'ok',
                service: 'mercadopago',
                mode: 'local',
                page: 'initialized'
            });
        }

        // Si no, hacer proxy
        const response = await axios.get(`${MP_SERVER}/health`, { timeout: 5000 });
        res.json({
            status: 'ok',
            service: 'mercadopago',
            mode: 'proxy',
            mpServer: response.data
        });
    } catch (error) {
        res.status(503).json({
            status: 'down',
            error: 'MP server unavailable',
            details: error.message
        });
    }
};
