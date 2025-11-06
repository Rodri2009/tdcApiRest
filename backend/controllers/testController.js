// backend/controllers/testController.js
const { sendTestEmail } = require('../services/emailService');

const testEmail = async (req, res) => {
    try {
        const result = await sendTestEmail();
        res.status(200).json({ status: 'éxito', message: 'El correo de prueba fue enviado.', details: result });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Falló el envío del correo de prueba.', details: error.message });
    }
};

module.exports = {
    testEmail,
}