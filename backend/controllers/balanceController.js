const { getBalance } = require('../services/balanceService');

/**
 * GET /api/balance?fresh=true|false
 * Retorna el balance actual de la cuenta
 */
async function getBalanceHandler(req, res, page) {
    try {
        // Allow cross-origin requests from local frontends (development)
        res.setHeader('Access-Control-Allow-Origin', '*');

        const fresh = req.query.fresh === 'true';

        console.log(`[BalanceController] Request fresh=${fresh}`);

        const balance = await getBalance(page, fresh);

        return res.status(200).json({
            success: true,
            data: balance
        });

    } catch (err) {
        console.error('[BalanceController] Error:', err.message);
        return res.status(503).json({
            success: false,
            error: err.message || 'Unable to fetch balance'
        });
    }
}

module.exports = {
    getBalanceHandler
};
