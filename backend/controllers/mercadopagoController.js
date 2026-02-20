const mercadopagoClient = require('../services/mercadopagoClient');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

/**
 * GET /api/mercadopago/balance
 * Obtiene el saldo actual de la cuenta Mercado Pago
 */
exports.getBalance = async (req, res) => {
  try {
    const fresh = req.query.fresh === 'true';
    const data = await mercadopagoClient.getBalance(fresh);
    res.json(data);
  } catch (error) {
    logError('[mercadopagoController] getBalance error:', error);
    res.status(503).json({ error: error.message });
  }
};

/**
 * GET /api/mercadopago/activity
 * Obtiene el historial de transacciones
 * Query params:
 *   - fresh (boolean): fuerza scrape en vivo
 *   - limit (number): cantidad de transacciones
 *   - since (string): fecha inicial filtrado (YYYY-MM-DD)
 */
exports.getActivity = async (req, res) => {
  try {
    const fresh = req.query.fresh === 'true';
    const limit = parseInt(req.query.limit) || 20;
    const since = req.query.since || null;

    const data = await mercadopagoClient.getActivity(fresh, limit, since);
    res.json(data);
  } catch (error) {
    logError('[mercadopagoController] getActivity error:', error);
    res.status(503).json({ error: error.message });
  }
};

/**
 * POST /api/mercadopago/refresh
 * Fuerza un refresh inmediato
 * Body:
 *   - page (string): 'activity', 'balance', o 'all'
 */
exports.refresh = async (req, res) => {
  try {
    const page = req.body.page || 'all';
    const result = await mercadopagoClient.refresh(page);
    res.json(result);
  } catch (error) {
    logError('[mercadopagoController] refresh error:', error);
    res.status(503).json({ error: error.message });
  }
};
