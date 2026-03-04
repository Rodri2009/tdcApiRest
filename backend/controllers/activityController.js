const { getActivity } = require('../services/activityService');

/**
 * GET /api/activity?fresh=true|false&limit=20
 * Retorna la lista de transacciones
 */
async function getActivityHandler(req, res, page) {
    try {
        // Ensure CORS header for browser clients served from another origin
        res.setHeader('Access-Control-Allow-Origin', '*');

        const fresh = req.query.fresh === 'true';
        const limit = parseInt(req.query.limit, 10) || 20;

        console.log(`[ActivityController] Request fresh=${fresh} limit=${limit}`);

        const activity = await getActivity(page, fresh);

        // Limitar resultados si es necesario
        const transactions = activity.transactions.slice(0, limit);

        return res.status(200).json({
            success: true,
            data: {
                transactions,
                count: transactions.length,
                totalAvailable: activity.count,
                lastUpdated: activity.lastUpdated,
                source: activity.source
            }
        });

    } catch (err) {
        console.error('[ActivityController] Error:', err.message);
        return res.status(503).json({
            success: false,
            error: err.message || 'Unable to fetch activity'
        });
    }
}

module.exports = {
    getActivityHandler
};
