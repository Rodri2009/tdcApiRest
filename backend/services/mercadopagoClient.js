const axios = require('axios');

const MP_API_URL = process.env.MP_API_URL || 'http://localhost:9001';

class MercadopagoClient {
  /**
   * Obtiene el saldo de Mercado Pago
   * @param {boolean} fresh - Si es true, fuerza scrape en vivo; si false, usa caché
   * @returns {Object} { available, currency, lastUpdated }
   */
  async getBalance(fresh = false) {
    try {
      const response = await axios.get(
        `${MP_API_URL}/api/balance?fresh=${fresh}`,
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      console.error('[MercadopagoClient] getBalance error:', error.message);
      throw new Error(`Mercado Pago service unavailable: ${error.message}`);
    }
  }

  /**
   * Obtiene el historial de actividad/transacciones
   * @param {boolean} fresh - Si es true, fuerza scrape en vivo
   * @param {number} limit - Cantidad de transacciones a retornar
   * @param {string} since - Fecha inicial para filtrar (YYYY-MM-DD)
   * @returns {Object} { transactions: Array, count: number }
   */
  async getActivity(fresh = false, limit = 20, since = null) {
    try {
      let url = `${MP_API_URL}/api/activity?fresh=${fresh}&limit=${limit}`;
      if (since) url += `&since=${since}`;
      
      const response = await axios.get(url, { timeout: 30000 });
      return response.data;
    } catch (error) {
      console.error('[MercadopagoClient] getActivity error:', error.message);
      throw new Error(`Mercado Pago service unavailable: ${error.message}`);
    }
  }

  /**
   * Fuerza un refresh inmediato de datos en serverMP
   * @param {string} page - Tipo de página a refrescar ('activity', 'balance', 'all')
   * @returns {Object} Resultado del refresh
   */
  async refresh(page = 'all') {
    try {
      const response = await axios.post(
        `${MP_API_URL}/api/refresh`,
        { page },
        { timeout: 60000 }
      );
      return response.data;
    } catch (error) {
      console.error('[MercadopagoClient] refresh error:', error.message);
      throw new Error(`Mercado Pago refresh failed: ${error.message}`);
    }
  }
}

module.exports = new MercadopagoClient();
