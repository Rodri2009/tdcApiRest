// =================================================================
// SECCIÓN 1: CONFIGURACIÓN Y CONSTANTES GLOBALES
// =================================================================
const SPREADSHEET_ID = '1XtO7oERrTKP_TzwIWVeearqxwzts3X2YcLJYwQRQ2jM';
const ADMIN_EMAILS = ['villalbarodrigo2009@gmail.com', 'temploclaypole@gmail.com'];

// =================================================================
// SECCIÓN 2: PUNTO DE ENTRADA Y ROUTERS PRINCIPALES
// =================================================================

/**
 * Punto de entrada principal para todas las peticiones GET.
 * Actúa como un router que desvía la petición al manejador correcto (Web App o API).
 */
function doGet(e) {
  Logger.log(`--- INICIO doGet (Router Principal) ---`);
  if (e.parameter.v === 'api') {
    Logger.log(`Router: Petición de API detectada.`);
    return handleApiRequest(e);
  } else {
    Logger.log(`Router: Petición web detectada.`);
    return handleWebAppRequest(e);
  }
}

/**
 * Maneja todas las peticiones para la interfaz web (renderizado de HTML).
 */
function handleWebAppRequest(e) {
  const urlDeLaApp = ScriptApp.getService().getUrl();
  let template;
  const page = e.parameter.page;
  Logger.log(`handleWebAppRequest: Página: "${page || 'principal'}". Parámetros: ${JSON.stringify(e.parameter)}`);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    switch (page) {
      case 'admin':
        const userEmail = Session.getActiveUser().getEmail();
        if (ADMIN_EMAILS.includes(userEmail)) {
          template = HtmlService.createTemplateFromFile('Admin');
        } else {
          return HtmlService.createHtmlOutput(`<h1>Acceso Denegado</h1><p>No tienes permiso para ver esta página.</p>`);
        }
        break;

      case 'adicionales':
        // --- CORRECCIÓN: Capturamos el ID devuelto y lo pasamos a la plantilla ---
        const newIdForAdicionales = saveBasicDataFromForm(ss, e.parameter);
        template = HtmlService.createTemplateFromFile('Adicionales');
        template.solicitudId = newIdForAdicionales;
        break;
      
      case 'contacto':
        template = HtmlService.createTemplateFromFile('Contacto');
        let solicitudIdForContacto;

        if (e.parameter.adicional_0_nombre) {
            // --- CORRECCIÓN: Viene de Adicionales.html. Usamos el ID que nos pasan. ---
            solicitudIdForContacto = e.parameter.solicitudId;
            if (!solicitudIdForContacto) throw new Error("ID de solicitud perdido al pasar de adicionales a contacto.");
            
            const adicionalesParaGuardar = [];
            let i = 0;
            while (e.parameter['adicional_' + i + '_nombre']) {
               adicionalesParaGuardar.push({ nombre: e.parameter['adicional_' + i + '_nombre'], precio: parseFloat(e.parameter['adicional_' + i + '_precio']) });
               i++;
            }
            if (adicionalesParaGuardar.length > 0) saveAdicionalesData(ss, adicionalesParaGuardar, solicitudIdForContacto);
        } else {
            // --- CORRECCIÓN: Viene directo de Page.html. Creamos el registro y obtenemos el ID. ---
            solicitudIdForContacto = saveBasicDataFromForm(ss, e.parameter);
        }
        template.solicitudId = solicitudIdForContacto;
        break;
      
      case 'comprobante':
        // --- CORRECCIÓN: El ID ahora viene en los parámetros, no en la sesión ---
        const finalSolicitudId = e.parameter.solicitudId;
        if (!finalSolicitudId) throw new Error("Sesión expirada o ID de solicitud no encontrado.");
        
        saveFinalDataAndSendEmails(ss, finalSolicitudId, e.parameter);

        template = HtmlService.createTemplateFromFile('Comprobante');
        template.solicitudId = finalSolicitudId;
        break;
      
      case 'asignar_personal':
        template = HtmlService.createTemplateFromFile('AsignarPersonal');
        template.solicitudId = e.parameter.solicitudId;
        template.tipoEventoId = e.parameter.tipoEventoId;
        break;

      case 'orden_de_trabajo':
        template = HtmlService.createTemplateFromFile('OrdenDeTrabajo');
        template.solicitudId = e.parameter.solicitudId;
        break;

      case 'editar_solicitud':
        template = HtmlService.createTemplateFromFile('EditarSolicitud');
        template.solicitudId = e.parameter.solicitudId;
        break;

      default:
        template = HtmlService.createTemplateFromFile('Page');
        break;
    }
  } catch (error) {
    Logger.log(`Error grave en handleWebAppRequest: ${error.message}\nStack: ${error.stack}`);
    template = HtmlService.createTemplateFromFile('Page');
    template.error = `Ocurrió un error: ${error.message}`;
  }
  
  const tipoDesdeURL = e.parameter.tipo || '';
  template.urlDeLaApp = urlDeLaApp;
  template.tipoEventoDesdeURL = tipoDesdeURL;
  return template.evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setTitle('Generador de Presupuesto')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}


function getPreciosBase(spreadsheet) {
    const preciosData = getSheetData(spreadsheet, 'Precios_Base');
    const preciosBase = {};
    preciosData.forEach(row => {
      const tipo = String(row[0]);
      const cantidad = String(row[1]);
      const duracion = String(row[2]);
      const precio = parseFloat(row[3]) || 0;
      if (!preciosBase[tipo]) preciosBase[tipo] = {};
      if (!preciosBase[tipo][cantidad]) preciosBase[tipo][cantidad] = {};
      preciosBase[tipo][cantidad][duracion] = precio;
    });
    return preciosBase;
}


/**
 * Maneja las peticiones GET a la API. Actúa como el router principal de la API.
 * @param {Object} e - El objeto del evento de la petición.
 */
function handleApiRequest(e) {
  try {
    const params = e.parameter;
    const resource = params.consultas; // p.ej., "solicitudes", "opciones_tipos"
    let data;

    if (!resource) {
      return sendJsonResponse({ status: 'bad_request', message: 'El parámetro "consultas" es obligatorio.' }, 400);
    }

    // El switch actúa como nuestro "router", dirigiendo a la función correcta.
    switch (resource.toLowerCase()) {
      case 'solicitudes':
        data = findSolicitudes(params);
        break;
      
      case 'opciones_tipos':
        data = findTiposDeEvento(params);
        break;

      case 'precios_vigencia':
        data = findPreciosVigentes(params);
        break;

      case 'solicitudes_adicionales':
        data = findAdicionalesPorSolicitud(params);
        break;

      default:
        return sendJsonResponse({ status: 'not_found', message: `El recurso "${resource}" no fue encontrado.` }, 404);
    }

    if (data.length === 0) {
      return sendJsonResponse({ status: 'not_found', message: 'No se encontraron registros que coincidan con los criterios de búsqueda.' }, 404);
    }
    
    return sendJsonResponse({ status: 'success', count: data.length, data: data }, 200);

  } catch (error) {
    Logger.log(`Error en handleApiRequest: ${error.message}\nStack: ${error.stack}`);
    return sendJsonResponse({ status: 'error', message: 'Ocurrió un error interno en el servidor: ' + error.message }, 500);
  }
}

/**
 * Función de utilidad para enviar respuestas JSON estandarizadas.
 * @param {Object} payload - El objeto de JavaScript que se convertirá a JSON.
 * @param {number} statusCode - El código de estado HTTP a simular en la respuesta.
 * @returns {ContentService} - Un objeto de salida de texto con MIME type JSON.
 */
function sendJsonResponse(payload, statusCode) {
  payload.statusCode = statusCode;
  return ContentService
    .createTextOutput(JSON.stringify(payload, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}


// =================================================================
// SECCIÓN 11: CAPA DE ACCESO A DATOS (DAL) - VERSIÓN 2.0
// =================================================================
// Cada función accede a una hoja específica y la transforma en JSON.
// Al migrar, solo reescribes el interior de estas funciones.

/**
 * Busca en la hoja "Solicitudes".
 * Filtros soportados: &tipo=...
 */
function findSolicitudes(params) {
  const data = getSheetData(SpreadsheetApp.openById(SPREADSHEET_ID), "Solicitudes");
  let filteredData = data;

  if (params.tipo) {
    const tipoNormalizado = params.tipo.trim().toLowerCase();
    filteredData = data.filter(row => row[2] && (row[2].trim().toLowerCase() === tipoNormalizado));
  }

  return filteredData.map(row => ({
    id_solicitud: row[0], fecha_solicitud: row[1], tipo_evento: row[2],
    cantidad_personas: row[3], duracion: row[4], fecha_evento: row[5],
    hora_evento: row[6], precio_basico: row[7], precio_final: row[8],
    cliente_nombre: row[9], cliente_telefono: row[10], cliente_email: row[11],
    estado: row[13]
  }));
}

/**
 * Busca en la hoja "Opciones_Tipos".
 * Filtros soportados: &tipo=... (busca por ID)
 */
function findTiposDeEvento(params) {
  const data = getSheetData(SpreadsheetApp.openById(SPREADSHEET_ID), "Opciones_Tipos");
  let filteredData = data;

  if (params.tipo) {
    const tipoNormalizado = params.tipo.trim().toLowerCase();
    filteredData = data.filter(row => row[0] && (row[0].trim().toLowerCase() === tipoNormalizado));
  }
  
  return filteredData.map(row => ({
    id: row[0], nombre_para_mostrar: row[1], descripcion: row[2],
    monto_sena: row[3], deposito_garantia: row[4]
  }));
}

/**
 * Busca en la hoja "Precios_Vigencia".
 * Filtros soportados: &tipo=..., &cantidad=..., &fecha_vigencia=...
 */
function findPreciosVigentes(params) {
  if (!params.tipo || !params.cantidad) {
    // Para esta consulta, tipo y cantidad son obligatorios
    throw new Error('Los parámetros "tipo" y "cantidad" son obligatorios para "precios_vigencia".');
  }

  const data = getSheetData(SpreadsheetApp.openById(SPREADSHEET_ID), "Precios_Vigencia");
  const tipoNormalizado = params.tipo.trim().toLowerCase();
  const cantidad = parseInt(params.cantidad, 10);
  if (isNaN(cantidad)) {
    throw new Error('El parámetro "cantidad" debe ser un número.');
  }

  const fechaVigencia = params.fecha_vigencia ? new Date(params.fecha_vigencia + 'T00:00:00') : null;

  const filteredData = data.filter(row => {
    const tipoCoincide = row[0] && (row[0].trim().toLowerCase() === tipoNormalizado);
    const cantidadEnRango = cantidad >= (parseInt(row[1]) || 0) && cantidad <= (parseInt(row[2]) || 0);
    
    let fechaCoincide = true; // Asumimos que coincide si no se provee fecha
    if (fechaVigencia) {
      const fechaEnHoja = row[3] ? new Date(row[3]) : null;
      if (fechaEnHoja) {
        // La fecha del evento debe ser igual o posterior a la fecha de vigencia
        fechaCoincide = fechaVigencia >= fechaEnHoja;
      }
    }
    
    return tipoCoincide && cantidadEnRango && fechaCoincide;
  });

  return filteredData.map(row => ({
    tipo: row[0], min_personas: row[1], max_personas: row[2],
    fecha_vigencia: row[3], precio_por_hora: row[4]
  }));
}

/**
 * Busca en la hoja "Solicitudes_Adicionales".
 * Filtros soportados: &id_solicitud=...
 */
function findAdicionalesPorSolicitud(params) {
  if (!params.id_solicitud) {
    throw new Error('El parámetro "id_solicitud" es obligatorio para "solicitudes_adicionales".');
  }
  const data = getSheetData(SpreadsheetApp.openById(SPREADSHEET_ID), "Solicitudes_Adicionales");
  const idSolicitud = params.id_solicitud.trim();
  
  const filteredData = data.filter(row => String(row[1]) === idSolicitud);

  return filteredData.map(row => ({
    timestamp: row[0], id_solicitud: row[1], nombre_adicional: row[2], precio: row[3]
  }));
}