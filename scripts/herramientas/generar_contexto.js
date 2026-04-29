// scripts/generar-contexto.js
require('dotenv').config({ path: './.env' });
const mariadb = require('mariadb');
const fs = require('fs');

// Configuración de la conexión a la base de datos
const pool = mariadb.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Función para formatear números como moneda
const formatCurrency = (num) => `$${parseFloat(num || 0).toLocaleString('es-AR')}`;

/**
 * Función principal que orquesta la generación del contexto.
 */
async function generarContextoDeNegocio() {
    console.log("Iniciando la generación del contexto de negocio...");
    let conn;
    let markdownContent = `# Contexto de Negocio para Chatbot - El Templo de Claypole\n\n`;
    markdownContent += `Fecha de generación: ${new Date().toLocaleDateString('es-AR')}\n\n`;
    markdownContent += "Este documento contiene toda la información sobre los servicios, precios y reglas de negocio del salón de eventos 'El Templo de Claypole'. Úsalo como tu única fuente de verdad para responder a las preguntas de los clientes.\n\n";

    try {
        conn = await pool.getConnection();

        // --- 1. Obtener y formatear Tipos de Evento ---
        console.log("Obteniendo tipos de evento...");
        const tiposEvento = await conn.query("SELECT * FROM opciones_tipos WHERE es_publico = 1 ORDER BY categoria, nombre_para_mostrar");
        markdownContent += "## Tipos de Eventos Ofrecidos\n\n";
        for (const tipo of tiposEvento) {
            markdownContent += `### ${tipo.nombre_para_mostrar} (Categoría: ${tipo.categoria})\n`;
            markdownContent += `${tipo.descripcion}\n`;
            if (tipo.monto_sena > 0) {
                markdownContent += `- **Seña para reservar:** ${formatCurrency(tipo.monto_sena)}.\n`;
            }
            if (tipo.deposito > 0) {
                markdownContent += `- **Depósito de garantía (reintegrable):** ${formatCurrency(tipo.deposito)}.\n`;
            }
            markdownContent += "\n";
        }

        // --- 2. Obtener y formatear Adicionales ---
        console.log("Obteniendo servicios adicionales...");
        const adicionales = await conn.query("SELECT * FROM opciones_adicionales ORDER BY precio");
        markdownContent += "## Servicios Adicionales Disponibles\n\n";
        for (const ad of adicionales) {
            markdownContent += `- **${ad.nombre}:** ${formatCurrency(ad.precio)}. ${ad.descripcion || ''}\n`;
        }
        markdownContent += "\n";

        // --- 3. Obtener y formatear Reglas de Precios ---
        console.log("Obteniendo reglas de precios...");
        const tarifas = await conn.query("SELECT * FROM precios_vigencia ORDER BY id_evento, cantidad_min");
        markdownContent += "## Reglas de Precios por Hora\n\n";
        markdownContent += "Los precios varían según el tipo de evento, la cantidad de personas y la fecha de vigencia del precio.\n\n";
        let currentTipoTarifa = '';
        for (const tarifa of tarifas) {
            if (tarifa.id_evento !== currentTipoTarifa) {
                markdownContent += `### Para el evento: ${tarifa.id_evento}\n`;
                currentTipoTarifa = tarifa.id_evento;
            }
            const hasta = tarifa.vigente_hasta ? ` hasta el ${new Date(tarifa.vigente_hasta).toLocaleDateString('es-AR')}` : '';
            markdownContent += `- **Desde ${tarifa.cantidad_min} hasta ${tarifa.cantidad_max} personas:** el precio es ${formatCurrency(tarifa.precio_por_hora)} por hora (vigente desde ${new Date(tarifa.vigente_desde).toLocaleDateString('es-AR')}${hasta}).\n`;
        }
        markdownContent += "\n";

        // --- 4. Obtener y formatear Horarios ---
        console.log("Obteniendo reglas de horarios...");
        const horarios = await conn.query("SELECT * FROM configuracion_horarios ORDER BY id_evento, dia_semana");
        markdownContent += "## Horarios de Funcionamiento\n\n";
        let currentTipoHorario = '';
        for (const horario of horarios) {
            if (horario.id_evento !== currentTipoHorario) {
                markdownContent += `### Para el evento: ${horario.id_evento}\n`;
                currentTipoHorario = horario.id_evento;
            }
            markdownContent += `- **Días '${horario.dia_semana}':** se puede reservar entre las ${horario.hora_inicio} y las ${horario.hora_fin}.\n`;
        }

        // Guardar el archivo
        fs.writeFileSync('contexto_negocio.md', markdownContent);
        console.log("\n✅ ¡Éxito! El archivo 'contexto_negocio.md' ha sido generado en la raíz del proyecto.");

    } catch (err) {
        console.error("❌ Error al generar el contexto:", err);
    } finally {
        if (conn) conn.release();
        pool.end();
    }
}

generarContextoDeNegocio();