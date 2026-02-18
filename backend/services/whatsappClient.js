const axios = require('axios');

const WA_API_URL = process.env.WA_API_URL || 'http://localhost:9002';

class WhatsappClient {
  /**
   * Envía un mensaje por WhatsApp
   * @param {string} phone - Número de teléfono con código de país (+549123456789)
   * @param {string} message - Contenido del mensaje
   * @returns {Object} { success, timestamp, messageId }
   */
  async sendMessage(phone, message) {
    try {
      const response = await axios.post(
        `${WA_API_URL}/api/send-message`,
        { phone, message },
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      console.error('[WhatsappClient] sendMessage error:', error.message);
      throw new Error(`WhatsApp service unavailable: ${error.message}`);
    }
  }

  /**
   * Obtiene la lista de chats/conversaciones
   * @param {boolean} fresh - Si es true, fuerza scrape en vivo
   * @returns {Object} { chats: Array<{id, name, lastMessage, date}> }
   */
  async getChats(fresh = false) {
    try {
      const response = await axios.get(
        `${WA_API_URL}/api/chats?fresh=${fresh}`,
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      console.error('[WhatsappClient] getChats error:', error.message);
      throw new Error(`WhatsApp service unavailable: ${error.message}`);
    }
  }

  /**
   * Obtiene los mensajes de una conversación específica
   * @param {string} chatId - ID del chat
   * @param {number} limit - Cantidad de mensajes a retornar
   * @returns {Object} { messages: Array<{id, from, text, timestamp}> }
   */
  async getMessages(chatId, limit = 20) {
    try {
      const response = await axios.get(
        `${WA_API_URL}/api/messages/${chatId}?limit=${limit}`,
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      console.error('[WhatsappClient] getMessages error:', error.message);
      throw new Error(`WhatsApp service unavailable: ${error.message}`);
    }
  }

  /**
   * Fuerza un refresh inmediato de datos en serverWhatsApp
   * @param {string} page - Tipo de página a refrescar ('chats', 'all')
   * @returns {Object} Resultado del refresh
   */
  async refresh(page = 'all') {
    try {
      const response = await axios.post(
        `${WA_API_URL}/api/refresh`,
        { page },
        { timeout: 60000 }
      );
      return response.data;
    } catch (error) {
      console.error('[WhatsappClient] refresh error:', error.message);
      throw new Error(`WhatsApp refresh failed: ${error.message}`);
    }
  }
}

module.exports = new WhatsappClient();
