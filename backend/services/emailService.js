// backend/services/emailService.js
const nodemailer = require('nodemailer');
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
 * Envía una notificación al administrador con los detalles de una nueva solicitud.
 * @param {object} solicitud - El objeto completo de la solicitud desde la base de datos.
 */
const sendAdminNotification = async (solicitud) => {
    console.log(`-> Intentando enviar email HTML para la solicitud ID: ${solicitud.id_solicitud}`);

    // 1. Cargar la plantilla HTML
    let htmlBody = fs.readFileSync(
        path.join(__dirname, 'emailTemplates/adminNotification.html'),
        'utf-8'
    );

    // 2. Formatear los datos y reemplazar los placeholders
    const formattedSolicitud = {
        ...solicitud,
        fecha_evento: new Date(solicitud.fecha_evento).toLocaleDateString('es-AR', { timeZone: 'UTC' }),
        descripcion: solicitud.descripcion || 'Sin observaciones.'
    };

    for (const key in formattedSolicitud) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlBody = htmlBody.replace(regex, formattedSolicitud[key]);
    }

    const mailOptions = {
        from: `"Sistema de Reservas TDC" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_ADMIN,
        subject: `Nueva Solicitud Confirmada - ID ${solicitud.id_solicitud} - ${solicitud.nombre_completo}`,
        html: htmlBody, // <-- Usamos 'html' en lugar de 'text'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email HTML de notificación enviado. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error("❌ Error al enviar el email HTML:", error);
    }
};


/**
 * Envía un correo de prueba simple para verificar la configuración.
 */
const sendTestEmail = async () => {
    console.log("-> Intentando enviar email de prueba...");

    const mailOptions = {
        from: `"Sistema de Pruebas TDC" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_ADMIN,
        subject: "Correo de Prueba del Sistema TDC",
        text: "Si recibes este correo, la configuración de Nodemailer está funcionando correctamente. ¡Felicidades!",
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email de prueba enviado con éxito. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Error al enviar el email de prueba:", error);
        // Lanzamos el error para que el controlador pueda informar del fallo.
        throw error;
    }
};

// ... (en module.exports)
module.exports = {
    sendAdminNotification,
    sendTestEmail, // <-- Exporta la nueva función
};