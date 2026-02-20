// backend/services/emailService.js
const nodemailer = require('nodemailer');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
const fs = require('fs'); // <-- Importa el File System de Node
const path = require('path'); // <-- Importa el Path

// 1. Creamos el "transportador" usando las variables de entorno
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", // Usamos el host explícito de Gmail
    port: 465, // Usamos el puerto 465 con SSL, que es más seguro y a menudo menos bloqueado
    secure: true, // Forzar SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        // No fallar en certificados autofirmados (a veces útil en entornos de desarrollo)
        rejectUnauthorized: false
    }
});


/**
 * Envía un correo de confirmación/notificación basado en una plantilla HTML.
 * @param {string} to - El destinatario del correo.
 * @param {string} subject - El asunto del correo.
 * @param {object} solicitud - El objeto de la solicitud con todos los datos.
 * @param {object} headers - Objeto con { titulo, subtitulo } para el encabezado.
 */
const sendComprobanteEmail = async (to, subject, solicitud, headers) => {
    logVerbose(`-> Preparando email de comprobante para: ${to}`);

    try {
        // 1. Cargar la plantilla
        let htmlBody = fs.readFileSync(
            path.join(__dirname, 'emailTemplates/comprobanteEmail.html'), 'utf-8'
        );

        // 2. Preparar los datos y formatearlos
        const formatCurrency = (num) => `$${parseFloat(num || 0).toLocaleString('es-AR')}`;
        
        let totalAdicionales = 0;
        let adicionalesHtml = '';
        if (solicitud.adicionales && solicitud.adicionales.length > 0) {
            solicitud.adicionales.forEach(ad => {
                adicionalesHtml += `<li><span>${ad.nombre || ad.adicional_nombre}</span><strong>${formatCurrency(ad.precio || ad.adicional_precio)}</strong></li>`;
                totalAdicionales += parseFloat(ad.precio || ad.adicional_precio);
            });
        }

        const dataForTemplate = {
            ...solicitud,
            header_titulo: headers.titulo,
            header_subtitulo: headers.subtitulo,
            fecha_evento: new Date(solicitud.fecha_evento).toLocaleDateString('es-AR', { timeZone: 'UTC' }),
            precio_basico: formatCurrency(solicitud.precio_basico),
            adicionales_html: adicionalesHtml,
            precio_final: formatCurrency(parseFloat(solicitud.precio_basico) + totalAdicionales),
        };
        
        // 3. Reemplazar todos los placeholders en la plantilla
        for (const key in dataForTemplate) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            htmlBody = htmlBody.replace(regex, dataForTemplate[key]);
        }

        // 4. Enviar el correo
        await transporter.sendMail({
            from: `"Sistema de Reservas TDC" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlBody,
        });

        logVerbose(`✅ Email de comprobante enviado exitosamente a ${to}.`);

    } catch (error) {
        logError(`❌ Error al enviar el email de comprobante a ${to}:`, error);
    }
};



/**
 * Envía un correo de prueba simple para verificar la configuración.
 */
const sendTestEmail = async () => {
    logVerbose("-> Intentando enviar email de prueba...");

    const mailOptions = {
        from: `"Sistema de Pruebas TDC" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_ADMIN,
        subject: "Correo de Prueba del Sistema TDC",
        text: "Si recibes este correo, la configuración de Nodemailer está funcionando correctamente. ¡Felicidades!",
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logVerbose(`✅ Email de prueba enviado con éxito. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logError("❌ Error al enviar el email de prueba:", error);
        // Lanzamos el error para que el controlador pueda informar del fallo.
        throw error;
    }
};

// ... (en module.exports)
module.exports = {
    sendTestEmail,
    sendComprobanteEmail,
};