const mercadopagoClient = require('../services/mercadopagoClient');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

/**
 * GET /api/mercadopago/balance
 * Obtiene el saldo actual de la cuenta Mercado Pago
 * 
 * Autenticación: JWT (requerido)
 * Usuario disponible en: req.user (incluye id, email, role, permisos)
 */
exports.getBalance = async (req, res) => {
  try {
    // Obtener token de la request (cookies o header Authorization)
    const token = req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null);

    const fresh = req.query.fresh === 'true';

    logVerbose('[mercadopagoController] getBalance request', {
      userId: req.user?.id,
      fresh
    });

    const data = await mercadopagoClient.getBalance(fresh, token);

    logSuccess('[mercadopagoController] getBalance success', { userId: req.user?.id });
    res.json(data);
  } catch (error) {
    logError('[mercadopagoController] getBalance error:', error);
    res.status(503).json({
      error: error.message,
      service: 'mercadopago'
    });
  }
};

/**
 * GET /api/mercadopago/activity
 * Obtiene el historial de transacciones
 * 
 * Autenticación: JWT (requerido)
 * Query params:
 *   - fresh (boolean): fuerza scrape en vivo
 *   - limit (number): cantidad de transacciones
 *   - since (string): fecha inicial filtrado (YYYY-MM-DD)
 */
exports.getActivity = async (req, res) => {
  try {
    // Obtener token de la request
    const token = req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null);

    const fresh = req.query.fresh === 'true';
    const limit = parseInt(req.query.limit) || 20;
    const since = req.query.since || null;

    logVerbose('[mercadopagoController] getActivity request', {
      userId: req.user?.id,
      fresh,
      limit,
      since
    });

    const data = await mercadopagoClient.getActivity(fresh, limit, since, token);

    logSuccess('[mercadopagoController] getActivity success', {
      userId: req.user?.id,
      count: data.count
    });
    res.json(data);
  } catch (error) {
    logError('[mercadopagoController] getActivity error:', error);
    res.status(503).json({
      error: error.message,
      service: 'mercadopago'
    });
  }
};

/**
 * POST /api/mercadopago/refresh
 * Fuerza un refresh inmediato
 * 
 * Autenticación: JWT (requerido)
 * Body:
 *   - page (string): 'activity', 'balance', o 'all'
 */
exports.refresh = async (req, res) => {
  try {
    // Obtener token de la request
    const token = req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null);

    const page = req.body?.page || 'all';

    logVerbose('[mercadopagoController] refresh request', {
      userId: req.user?.id,
      page
    });

    const result = await mercadopagoClient.refresh(page, token);

    logSuccess('[mercadopagoController] refresh success', {
      userId: req.user?.id,
      page
    });
    res.json(result);
  } catch (error) {
    logError('[mercadopagoController] refresh error:', error);
    res.status(503).json({
      error: error.message,
      service: 'mercadopago'
    });
  }
};
