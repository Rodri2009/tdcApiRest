const axios = require('axios');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

const MP_API_URL = process.env.MP_API_URL || 'http://localhost:9001';

class MercadopagoClient {
  /**
   * Obtiene el saldo de Mercado Pago
   * @param {boolean} fresh - Si es true, fuerza scrape en vivo; si false, usa caché
   * @param {string} token - JWT token para autenticación en serverMP
   * @returns {Object} { available, currency, lastUpdated }
   */
  async getBalance(fresh = false, token = null) {
    try {
      const headers = this._buildHeaders(token);
      const response = await axios.get(
        `${MP_API_URL}/api/balance?fresh=${fresh}`,
        { headers, timeout: 30000 }
      );
      logVerbose('[MercadopagoClient] getBalance success', { available: response.data.available });
      return response.data;
    } catch (error) {
      logError('[MercadopagoClient] getBalance error:', error.message);
      throw new Error(`Mercado Pago service unavailable: ${error.message}`);
    }
  }

  /**
   * Obtiene el historial de actividad/transacciones
   * @param {boolean} fresh - Si es true, fuerza scrape en vivo
   * @param {number} limit - Cantidad de transacciones a retornar
   * @param {string} since - Fecha inicial para filtrar (YYYY-MM-DD)
   * @param {string} token - JWT token para autenticación en serverMP
   * @returns {Object} { transactions: Array, count: number }
   */
  async getActivity(fresh = false, limit = 20, since = null, token = null) {
    try {
      const headers = this._buildHeaders(token);
      let url = `${MP_API_URL}/api/activity?fresh=${fresh}&limit=${limit}`;
      if (since) url += `&since=${since}`;

      const response = await axios.get(url, { headers, timeout: 30000 });
      
      // ⚠️ FIX: serverMP envía timestamps con horas locales etiquetadas como UTC
      // Necesitamos convertir: si creationDate es "2026-05-14T06:55:00.000Z"
      // realmente significa 06:55 ART (UTC-3), así que debe ser "2026-05-14T09:55:00.000Z"
      if (response.data.transactions && Array.isArray(response.data.transactions)) {
        response.data.transactions = response.data.transactions.map(tx => {
          if (tx.creationDate) {
            tx.creationDate = this._fixTimestampUTC(tx.creationDate);
          }
          if (tx.dateTime) {
            tx.dateTime = this._fixTimestampUTC(tx.dateTime);
          }
          return tx;
        });
      }
      
      logVerbose('[MercadopagoClient] getActivity success', { count: response.data.count });
      return response.data;
    } catch (error) {
      logError('[MercadopagoClient] getActivity error:', error.message);
      throw new Error(`Mercado Pago service unavailable: ${error.message}`);
    }
  }

  /**
   * Corrige timestamps que vienen de serverMP
   * serverMP envía hora local de Argentina pero con tag UTC (Z)
   * Esto causa un offset de -3 horas en la visualización
   * 
   * Ejemplo: 06:55 ART real = "2026-05-14T06:55:00.000Z" (incorrecto)
   *          Debería ser: "2026-05-14T09:55:00.000Z" (para que muestre 06:55 ART)
   * 
   * @param {string} timestamp - Timestamp ISO con Z (UTC)
   * @returns {string} Timestamp corregido
   * @private
   */
  _fixTimestampUTC(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') return timestamp;
    
    try {
      // Parsear timestamp como UTC (por la Z al final)
      const date = new Date(timestamp);
      
      // Sumar 3 horas (180 minutos) para compensar offset ART
      date.setHours(date.getUTCHours() + 3);
      
      // Retornar en formato ISO con Z (UTC)
      return date.toISOString();
    } catch (e) {
      logWarning('[MercadopagoClient] Error fijando timestamp:', timestamp);
      return timestamp;
    }
  }

  /**
   * Fuerza un refresh inmediato de datos en serverMP
   * @param {string} page - Tipo de página a refrescar ('activity', 'balance', 'all')
   * @param {string} token - JWT token para autenticación en serverMP
   * @returns {Object} Resultado del refresh
   */
  async refresh(page = 'all', token = null) {
    try {
      const headers = this._buildHeaders(token);
      const response = await axios.post(
        `${MP_API_URL}/api/refresh`,
        { page },
        { headers, timeout: 60000 }
      );
      logSuccess('[MercadopagoClient] refresh successful', { page });
      return response.data;
    } catch (error) {
      logError('[MercadopagoClient] refresh error:', error.message);
      throw new Error(`Mercado Pago refresh failed: ${error.message}`);
    }
  }

  /**
   * Construye headers con autenticación JWT
   * @param {string} token - JWT token
   * @returns {Object} Headers con Authorization si token disponible
   * @private
   */
  _buildHeaders(token = null) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }
}

module.exports = new MercadopagoClient();
