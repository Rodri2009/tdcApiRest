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

        const cantidadLabel = (solicitud.cantidad_min && solicitud.cantidad_max)
            ? `${solicitud.cantidad_min} - ${solicitud.cantidad_max} personas`
            : (solicitud.cantidad_personas || solicitud.cantidadPersonas)
                ? `${solicitud.cantidad_personas || solicitud.cantidadPersonas} personas`
                : '-';

        const dataForTemplate = {
            ...solicitud,
            header_titulo: headers.titulo,
            header_subtitulo: headers.subtitulo,
            fecha_evento: solicitud.fecha_evento
                ? new Date(solicitud.fecha_evento).toLocaleDateString('es-AR', { timeZone: 'UTC' })
                : '-',
            hora_evento: solicitud.hora_evento || '-',
            duracion: solicitud.duracion
                ? (solicitud.duracion % 60 === 0
                    ? `${solicitud.duracion / 60} hs`
                    : `${Math.floor(solicitud.duracion / 60)}h ${solicitud.duracion % 60}min`)
                : '-',
            nombre_completo: solicitud.nombre_completo || solicitud.nombreCompleto || '-',
            email: solicitud.email || '-',
            telefono: solicitud.telefono || '-',
            nombre_para_mostrar: solicitud.nombre_para_mostrar || solicitud.id_tipo_evento || '-',
            cantidad_de_personas: cantidadLabel,
            descripcion_evento: solicitud.descripcion_evento || solicitud.descripcion_corta || '-',
            precio_basico: formatCurrency(solicitud.precio_basico),
            adicionales_html: adicionalesHtml,
            precio_final: formatCurrency(parseFloat(solicitud.precio_basico || 0) + totalAdicionales),
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
 * Envía notificación a admin de una nueva solicitud
 */
const sendAdminNotification = async (solicitud) => {
    logVerbose(`-> Preparando notificación de nueva solicitud para admin`);

    try {
        const adminEmail = process.env.EMAIL_ADMIN || 'temploclaypole@gmail.com';

        // Formatear datos de la solicitud
        const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-AR');
        const bandasInfo = solicitud.bandas_json && typeof solicitud.bandas_json === 'string'
            ? JSON.parse(solicitud.bandas_json)
            : solicitud.bandas_json || [];

        const bandasHtml = bandasInfo.map((b, i) => `<li>${i + 1}º - ${b.nombre}</li>`).join('');

        const htmlBody = `
            <h2>Nueva Solicitud de Show en Vivo</h2>
            <p><strong>ID Solicitud:</strong> ${solicitud.id_solicitud}</p>
            <p><strong>Cliente:</strong> ${solicitud.nombre_cliente || 'Datos pendientes'}</p>
            <p><strong>Email:</strong> ${solicitud.email_cliente || 'No disponible'}</p>
            <p><strong>Teléfono:</strong> ${solicitud.telefono_cliente || 'No disponible'}</p>
            <hr />
            <h3>Detalles del Evento</h3>
            <p><strong>Fecha del Evento:</strong> ${formatDate(solicitud.fecha_evento)}</p>
            <p><strong>Hora del Evento:</strong> ${solicitud.hora_evento || '21:00'}</p>
            <p><strong>Bandas Seleccionadas:</strong></p>
            <ul>${bandasHtml}</ul>
            <p><strong>Descripción/Comentarios:</strong></p>
            <p>${solicitud.descripcion || 'Sin comentarios'}</p>
            <hr />
            <p><a href="${process.env.ADMIN_URL || 'http://localhost'}/admin.html?tab=solicitudes">Ver en Administración</a></p>
        `;

        await transporter.sendMail({
            from: `"Sistema TDC" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `[TDC] Nueva Solicitud de Show en Vivo - ID #${solicitud.id_solicitud}`,
            html: htmlBody,
        });

        logVerbose(`✅ Notificación de solicitud enviada a admin: ${adminEmail}`);
    } catch (error) {
        logError(`❌ Error al enviar notificación a admin:`, error);
        // No lanzar error para no bloquear el flujo
    }
};

/**
 * Notifica al admin cuando se registra una nueva banda.
 * @param {object} banda - { id, nombre, genero_musical, descripcion, solicitante_nombre, solicitante_email }
 */
const sendBandaNotificacionAdmin = async (banda) => {
    logVerbose(`-> Notificando admin sobre nueva banda: ${banda.nombre}`);
    try {
        const adminEmail = process.env.EMAIL_ADMIN || 'temploclaypole@gmail.com';
        const adminUrl = process.env.ADMIN_URL || 'http://localhost';

        const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <h2 style="color:#581c87">🎸 Nueva Banda Registrada</h2>
                <p><strong>ID:</strong> ${banda.id}</p>
                <p><strong>Nombre:</strong> ${banda.nombre}</p>
                <p><strong>Género:</strong> ${banda.genero_musical || '—'}</p>
                <p><strong>Descripción:</strong> ${banda.descripcion || '—'}</p>
                <hr />
                <p><strong>Registrado por:</strong> ${banda.solicitante_nombre || '—'}</p>
                <p><strong>Email:</strong> ${banda.solicitante_email || '—'}</p>
                <hr />
                <p><a href="${adminUrl}/admin.html?tab=bandas" style="color:#581c87">Ver en Administración →</a></p>
            </div>
        `;

        await transporter.sendMail({
            from: `"Sistema TDC" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `[TDC] Nueva banda registrada: ${banda.nombre}`,
            html,
        });

        logVerbose(`✅ Notificación de banda enviada a admin: ${adminEmail}`);
    } catch (error) {
        logError(`❌ Error al notificar admin sobre nueva banda:`, error);
    }
};

/**
 * Envía confirmación al solicitante cuando su banda quedó registrada.
 * @param {string} to - Email del solicitante.
 * @param {object} banda - { nombre, genero_musical, descripcion }
 */
const sendBandaConfirmacion = async (to, banda) => {
    logVerbose(`-> Enviando confirmación de registro de banda a: ${to}`);
    try {
        const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <h2 style="color:#581c87">✅ Tu banda fue registrada exitosamente</h2>
                <p>¡Hola! Te confirmamos que la siguiente banda fue registrada en nuestro catálogo:</p>
                <table style="border-collapse:collapse;width:100%">
                    <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Nombre</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${banda.nombre}</td></tr>
                    <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Género</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${banda.genero_musical || '—'}</td></tr>
                    <tr><td style="padding:8px"><strong>Descripción</strong></td><td style="padding:8px">${banda.descripcion || '—'}</td></tr>
                </table>
                <br />
                <p style="color:#6b7280;font-size:0.9em">El equipo de El Templo de Claypole revisará la información y se pondrá en contacto a la brevedad.</p>
                <p style="color:#6b7280;font-size:0.9em">— El Templo de Claypole</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"El Templo de Claypole" <${process.env.EMAIL_USER}>`,
            to,
            subject: `✅ Banda registrada: ${banda.nombre}`,
            html,
        });

        logVerbose(`✅ Confirmación de banda enviada a: ${to}`);
    } catch (error) {
        logError(`❌ Error al enviar confirmación al solicitante:`, error);
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
    sendAdminNotification,
    sendBandaNotificacionAdmin,
    sendBandaConfirmacion,
};