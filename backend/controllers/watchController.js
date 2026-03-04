const TransactionWatchService = require('../services/transactionWatchService');

// Instancia global del servicio de watch
let watchService = null;

/**
 * Inicializa el servicio de watch
 */
function initializeWatch(page) {
    if (!watchService) {
        watchService = new TransactionWatchService(page);
    }
    return watchService;
}

/**
 * GET /api/activity/watch
 * SSE endpoint para recibir notificaciones de nuevas transacciones
 * Cliente debe permitir reconexión automática
 */
function watchActivityHandler(req, res, page) {
    try {
        console.log('[WatchController] New SSE client connected');

        // Configurar headers de SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Inicializar servicio si no existe
        const watch = initializeWatch(page);

        // Iniciar watch si no está activo
        if (!watch.isActive) {
            watch.start().catch(err => {
                console.error('[WatchController] Error starting watch:', err.message);
            });
        }

        // Suscribir este cliente
        watch.subscribe(res);

        // Manejar desconexión
        req.on('close', () => {
            res.end();
        });

    } catch (err) {
        console.error('[WatchController] Error:', err.message);
        res.status(500).json({
            error: err.message
        });
    }
}

/**
 * GET /api/activity/watch/status
 * Retorna el estado del servicio de watch
 */
function getWatchStatusHandler(req, res) {
    try {
        // Ensure CORS header for status checks from other origins
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (!watchService) {
            return res.status(200).json({
                status: 'not_initialized',
                message: 'Watch service not yet initialized'
            });
        }

        return res.status(200).json({
            status: 'ok',
            watch: watchService.getStatus()
        });

    } catch (err) {
        console.error('[WatchController] Status error:', err.message);
        return res.status(500).json({
            error: err.message
        });
    }
}

/**
 * POST /api/activity/watch/start
 * Inicia el servicio de watch manualmente
 */
async function startWatchHandler(req, res, page) {
    try {
        const watch = initializeWatch(page);

        if (watch.isActive) {
            return res.status(200).json({
                success: true,
                message: 'Watch already active',
                status: watch.getStatus()
            });
        }

        await watch.start();

        return res.status(200).json({
            success: true,
            message: 'Watch started',
            status: watch.getStatus()
        });

    } catch (err) {
        console.error('[WatchController] Start error:', err.message);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
}

/**
 * POST /api/activity/watch/stop
 * Detiene el servicio de watch
 */
function stopWatchHandler(req, res) {
    try {
        if (!watchService) {
            return res.status(200).json({
                success: true,
                message: 'Watch not active'
            });
        }

        watchService.stop();

        return res.status(200).json({
            success: true,
            message: 'Watch stopped',
            status: watchService.getStatus()
        });

    } catch (err) {
        console.error('[WatchController] Stop error:', err.message);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
}

module.exports = {
    watchActivityHandler,
    getWatchStatusHandler,
    startWatchHandler,
    stopWatchHandler,
    initializeWatch
};
