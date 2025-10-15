/**
 * Busca una solicitud reciente y no completada que coincida con un FingerprintID.
 * @param {string} fingerprintId El ID de huella digital del visitante.
 * @returns {Object|null} Los datos de la solicitud encontrada o null si no hay ninguna.
 */
function checkForExistingSession(fingerprintId) {
  Logger.log(`Buscando sesión existente para Fingerprint ID: ${fingerprintId}`);
  if (!fingerprintId || fingerprintId === 'fingerprint_error') {
    return null;
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Solicitudes');
    if (sheet.getLastRow() < 2) return null;

    const allData = sheet.getRange("A2:O" + sheet.getLastRow()).getValues();

    // Definimos un límite de tiempo (ej. 24 horas) para considerar una sesión "reciente"
    const now = new Date();
    const timeLimit = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const foundSessions = allData.filter(row => {
      const rowFingerprint = row[14]; // Columna O
      const rowState = row[13];       // Columna N
      const rowTimestamp = new Date(row[1]); // Columna B

      return rowFingerprint === fingerprintId &&
             rowState === 'Solicitado' &&
             rowTimestamp > timeLimit;
    });

    if (foundSessions.length === 0) {
      Logger.log("No se encontraron sesiones recientes para este fingerprint.");
      return null;
    }

    // Si hay varias, tomamos la más reciente
    foundSessions.sort((a, b) => new Date(b[1]) - new Date(a[1]));
    const latestSession = foundSessions[0];
    Logger.log(`Sesión encontrada con ID: ${latestSession[0]}`);

    // Formateamos los datos para que el cliente los pueda usar
    const solicitud = {
      solicitudId: latestSession[0],
      tipoEvento: latestSession[2],
      cantidadPersonas: latestSession[3],
      duracionEvento: latestSession[4],
      fechaEvento: latestSession[5] ? Utilities.formatDate(new Date(latestSession[5]), Session.getScriptTimeZone(), "yyyy-MM-dd") : null,
      horaInicio: latestSession[6]
    };

    return solicitud;
  } catch (e) {
    Logger.log(`Error en checkForExistingSession: ${e.message}`);
    return null; // En caso de error, no interrumpimos al usuario
  }
}


function getInitialOptions(isAdmin = false) {
  Logger.log(`--- INICIO getInitialOptions [v5 con filtro de admin] ---. Es admin: ${isAdmin}`);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // --- CAMBIO CLAVE: Filtramos las filas con 'tipo' vacío al momento de leer ---
    const tarifas = getSheetData(ss, 'Precios_Vigencia', row => ({ 
        tipo: String(row[0] || ''), 
        min: parseInt(row[1]) || 0, 
        max: parseInt(row[2]) || 0, 
        fechaVigencia: row[3] ? Utilities.formatDate(new Date(row[3]), Session.getScriptTimeZone(), "yyyy-MM-dd") : null, 
        precioPorHora: parseFloat(row[4]) || 0,
    })).filter(regla => regla.tipo !== ''); // <-- ¡AQUÍ ESTÁ LA MAGIA!

    let tipos = getSheetData(ss, 'Opciones_Tipos', row => ({ 
      id: String(row[0]), 
      nombreParaMostrar: String(row[1]), 
      descripcion: String(row[2] || ''),
      montoSena: parseFloat(row[3] || 0), 
      depositoGarantia: parseFloat(row[4] || 0),
      esPublico: row[5] === true // La casilla de verificación devuelve true/false
    }));    

    // 3. Aplicamos el filtro SOLO si no es una petición de admin
    if (!isAdmin) {
        Logger.log("Petición de cliente: filtrando solo los eventos públicos.");
        tipos = tipos.filter(t => t.esPublico);
    } else {
        Logger.log("Petición de admin: devolviendo todos los eventos.");
    }

    const opcionesDuraciones = processOptionSheet(ss.getSheetByName('Opciones_Duracion')) || {};
    
    const configuracionHorarios = getSheetData(ss, 'Configuracion_Horarios', row => ({
      tipo: String(row[0]), hora: String(row[1]),
      tipoDia: String(row[2]).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    }));
    const opcionesHoras = {};
    configuracionHorarios.forEach(h => {
      if (!opcionesHoras[h.tipo]) opcionesHoras[h.tipo] = [];
      opcionesHoras[h.tipo].push({ hora: h.hora, tipoDia: h.tipoDia });
    });

    const config = getConfiguracion(ss);
    const opcionesCantidades = generarOpcionesCantidadDesdeTarifas(tarifas) || {};
    const anioActual = new Date().getFullYear();
    const feriados = [...getFeriados(anioActual), ...getFeriados(anioActual + 1)];
    const solicitudesData = getSheetData(ss, 'Solicitudes');
    const fechasOcupadas = solicitudesData
      .filter(row => (typeof row[13] === 'string' && row[13].trim().toLowerCase() === 'confirmado' && row[5]))
      .map(row => Utilities.formatDate(new Date(row[5]), Session.getScriptTimeZone(), "yyyy-MM-dd"));
      
    Logger.log(`getInitialOptions: Datos generados correctamente.`);
    
    const ret = { 
      config: config || {}, 
      tipos: tipos || [], 
      cantidades: opcionesCantidades, 
      duraciones: opcionesDuraciones, 
      horas: opcionesHoras, 
      tarifas: tarifas, 
      fechasOcupadas: fechasOcupadas || [], 
      feriados: feriados || [] 
    };
    //Logger.log(ret);
    return ret;
    
  } catch (e) {
    Logger.log(`Error grave en getInitialOptions: ${e.message}\nStack: ${e.stack}`);
    throw new Error('Error al obtener los datos iniciales: ' + e.message);
  }
}

    /*const fechasOcupadas = solicitudesData
      .filter((row, index) => {
        // Log para CADA fila que se procesa en el filtro.
        const estadoCelda = row[13]; // Columna N (Estado)
        const fechaCelda = row[5];   // Columna F (Fecha Evento)
        
        // Logueamos el contenido de las celdas clave antes de cualquier operación
        Logger.log(`Procesando fila #${index + 2}: Estado (Col N)='${estadoCelda}', Fecha (Col F)='${fechaCelda}'`);

        // Esta es la lógica de filtrado segura que implementamos antes
        const esConfirmado = (typeof estadoCelda === 'string' && estadoCelda.trim().toLowerCase() === 'confirmado');
        const tieneFecha = !!fechaCelda; // Comprueba que la celda de fecha no esté vacía

        if (esConfirmado && tieneFecha) {
          Logger.log(`--> Fila #${index + 2} MARCADA como ocupada.`);
          return true; // Mantener este elemento
        }
        return false; // Descartar este elemento
      })
      .map(row => {
        // Este map solo se ejecutará para las filas que pasaron el filtro.
        return Utilities.formatDate(new Date(row[5]), Session.getScriptTimeZone(), "yyyy-MM-dd");
      });*/
      

function getAdicionalesWithOptionsAndBase(solicitudId) {
  Logger.log(`--- INICIO getAdicionalesWithOptionsAndBase para ID ${solicitudId} ---`);
  try {
    if (!solicitudId) {
      Logger.log("Error: No se proporcionó un ID de solicitud.");
      return { error: 'NO_SESSION' }; // Mantenemos el mismo objeto de error por consistencia
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const adicionales = getSheetData(ss, 'Opciones_Adicionales', row => ({ 
        id: row[0] + row[1], nombre: String(row[0]), precio: parseFloat(row[1]) || 0, 
        descripcion: String(row[2] || ''), imageUrl: String(row[3] || '')
    }));
    const config = getConfiguracion(ss);
    const presupuestoBase = getSolicitudDetails(ss, solicitudId);
    
    Logger.log(`--- FIN getAdicionalesWithOptionsAndBase ---`);
    return { config, adicionales, presupuestoBase };
  } catch (e) {
    Logger.log(`Error en getAdicionalesWithOptionsAndBase: ${e.message}\nStack: ${e.stack}`);
    throw new Error('Error al obtener los adicionales: ' + e.message);
  }
}

function getContactPageDetails(solicitudId) {
  Logger.log(`--- INICIO getContactPageDetails para ID ${solicitudId} ---`);
  try {
    if (!solicitudId) return { error: 'NO_SESSION' };
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const config = getConfiguracion(ss);
    const solicitud = getSolicitudDetails(ss, solicitudId);
    
    Logger.log(`--- FIN getContactPageDetails ---`);
    return { config, solicitud: { fechaEvento: solicitud.fechaEvento, horaInicio: solicitud.horaInicio } };
  } catch(e) {
    Logger.log("Error en getContactPageDetails: " + e.message);
    throw new Error("No se pudieron cargar los detalles.");
  }
}

function saveBasicDataFromForm(ss, data) {
  Logger.log(`--- INICIO saveBasicDataFromForm [v3 con Fingerprint] ---`);
  try {
    const solicitudesSheet = ss.getSheetByName('Solicitudes');
    let newId;

    // --- LÓGICA DE ID CORREGIDA Y ROBUSTA ---
    const lastRow = solicitudesSheet.getLastRow();
    if (lastRow < 2) {
      newId = 1001;
      Logger.log("Hoja vacía o solo con encabezados. Iniciando ID en 1001.");
    } else {
      // Obtenemos TODOS los IDs, filtramos los vacíos y tomamos el último.
      const idColumnValues = solicitudesSheet.getRange("A2:A" + lastRow).getValues().flat().filter(Boolean);
      
      if (idColumnValues.length === 0) {
        // Caso borde: hay filas pero ninguna tiene ID.
        newId = 1001;
        Logger.log("No se encontraron IDs válidos en la columna A. Iniciando ID en 1001.");
      } else {
        const lastId = idColumnValues.pop(); // Obtiene el último ID válido
        Logger.log(`Último ID válido encontrado: ${lastId}`);
        newId = parseInt(lastId) + 1;
      }
    }
    
    if (isNaN(newId)) {
        Logger.log(`ERROR CRÍTICO: El nuevo ID calculado es NaN. Último ID leído: ${lastId}.`);
        throw new Error("No se pudo generar un ID de solicitud válido debido a un problema con el último ID encontrado.");
    }

    // Creamos un array de 15 elementos para incluir la nueva columna O
    let newRow = new Array(15).fill(''); 
    newRow[0] = newId;                      // Col A: ID_Solicitud
    newRow[1] = new Date();                 // Col B: Fecha Hora
    newRow[2] = data.tipoEvento || '';      // Col C: Tipo de Evento
    newRow[3] = data.cantidadPersonas || '';// Col D: Cantidad de Personas
    newRow[4] = data.duracionEvento || '';  // Col E: Duración
    newRow[5] = data.fechaEvento ? data.fechaEvento : null;  // Col F: Fecha Evento
    newRow[6] = data.horaInicio || null;    // Col G: Hora Evento
    newRow[7] = parseFloat(data.precioBase) || 0; // Col H: Precio Basico
    // Columnas I, J, K, L, M se llenan después
    newRow[13] = 'Solicitado';              // Col N: Estado
    newRow[14] = data.fingerprintId || '';  // Col O: FingerprintID
    solicitudesSheet.appendRow(newRow);
    Logger.log(`saveBasicDataFromForm: Nueva solicitud creada con ID ${newId} para Fingerprint ${data.fingerprintId}.`);
    return newId;
    
  } catch (e) {
    Logger.log(`Error en saveBasicDataFromForm: ${e.message}\nStack: ${e.stack}`);
    throw new Error('Error al guardar los datos básicos: ' + e.message);
  }
}

function saveAdicionalesData(ss, adicionalesSeleccionados, solicitudId) {
  Logger.log(`--- INICIO saveAdicionalesData para ID ${solicitudId} ---`);
  try {
    if (!solicitudId) throw new Error('ID de solicitud no proporcionado para guardar adicionales.');
    
    const adicionalesSheet = ss.getSheetByName('Solicitudes_Adicionales');
    // ... (El resto de la lógica de borrado y añadido se mantiene igual) ...
    const nuevosAdicionales = adicionalesSeleccionados.map(ad => [new Date(), solicitudId, ad.nombre, ad.precio]);
    if (nuevosAdicionales.length > 0) {
      adicionalesSheet.getRange(adicionalesSheet.getLastRow() + 1, 1, nuevosAdicionales.length, 4).setValues(nuevosAdicionales);
    }
  } catch (e) {
    Logger.log(`Error en saveAdicionalesData: ${e.message}\nStack: ${e.stack}`);
    throw new Error('Error al guardar los adicionales: ' + e.message);
  }
}

function saveFinalDataAndSendEmails(ss, solicitudId, contactData) {
    Logger.log(`--- INICIO saveFinalDataAndSendEmails para ID ${solicitudId} ---`);
    const solicitudesSheet = ss.getSheetByName('Solicitudes');
    const ids = solicitudesSheet.getRange("A2:A" + solicitudesSheet.getLastRow()).getValues().flat();
    const rowIndex = ids.findIndex(cellId => String(cellId) === String(solicitudId));
    if (rowIndex === -1) throw new Error(`No se encontró la fila para el ID ${solicitudId}`);
    const rowNum = rowIndex + 2;

    const precioBase = parseFloat(solicitudesSheet.getRange(rowNum, 8).getValue()) || 0; // Col H
    const totalAdicionales = getTotalAdicionales(ss, solicitudId);
    const precioFinal = precioBase + totalAdicionales;

    // --- BLOQUE CORREGIDO ---
    // Guardar el Precio Final en la columna I (columna 9)
    solicitudesSheet.getRange(rowNum, 9).setValue(precioFinal);
    
    // Guardar los datos de contacto en las columnas J, K, L (a partir de la columna 10)
    solicitudesSheet.getRange(rowNum, 10, 1, 3).setValues([[
      contactData.nombreCompleto, contactData.celular, contactData.email
    ]]);
    // --- FIN DEL BLOQUE CORREGIDO ---

    // Verificamos si el cliente escribió algo antes de guardarlo.
    if (contactData.detallesAdicionales) {
        // La columna M es la 13ª columna.
        solicitudesSheet.getRange(rowNum, 13).setValue(contactData.detallesAdicionales);
        Logger.log(`Detalles adicionales guardados en la fila ${rowNum}.`);
    }

    Logger.log(`Datos de contacto y precio final ($${precioFinal}) guardados en la fila ${rowNum}.`);

    const solicitudCompleta = getSolicitudDetails(ss, solicitudId);
    enviarEmail(solicitudCompleta);
    enviarEmailConfirmacionCliente(solicitudCompleta);
    Logger.log(`--- FIN saveFinalDataAndSendEmails ---`);
}

function getSolicitudDetails(ss, idSolicitud) {
  Logger.log(`--- INICIO getSolicitudDetails para ID ${idSolicitud} ---`);
  try {
    SpreadsheetApp.flush();
    const tipos = getSheetData(ss, 'Opciones_Tipos', row => ({ 
        id: String(row[0]), 
        nombreParaMostrar: String(row[1]),
        montoSena: parseFloat(row[3] || 0),
        depositoGarantia: parseFloat(row[4] || 0)
    }));
    const solicitudesSheet = ss.getSheetByName('Solicitudes');
    if (solicitudesSheet.getLastRow() < 2) throw new Error("Hoja de solicitudes vacía.");
    const allSolicitudes = solicitudesSheet.getRange("A2:N" + solicitudesSheet.getLastRow()).getValues();

    const rowData = allSolicitudes.find(row => String(row[0]) === String(idSolicitud));
    if (!rowData) throw new Error(`No se encontró la solicitud con ID ${idSolicitud}`);
    Logger.log(`Fila de datos encontrada para ID ${idSolicitud}.`);

    const adicionalSheet = ss.getSheetByName('Solicitudes_Adicionales');
    const adicionalData = adicionalSheet.getLastRow() > 1 ? adicionalSheet.getRange('B2:D' + adicionalSheet.getLastRow()).getValues() : [];
    const adicionalesSeleccionados = adicionalData
      .filter(row => String(row[0]) === String(idSolicitud))
      .map(row => ({ nombre: row[1], precio: parseFloat(row[2]) || 0 }));
      
    const fechaEventoStr = rowData[5] ? Utilities.formatDate(new Date(rowData[5]), Session.getScriptTimeZone(), "dd/MM/yyyy") : null;
    const horaInicioStr = rowData[6] || null;
    const tipoEventoId = rowData[2];
    const tipoEventoObj = tipos.find(t => t.id === tipoEventoId);
    const nombreTipoEvento = tipoEventoObj ? tipoEventoObj.nombreParaMostrar : tipoEventoId;
    const montoSena = tipoEventoObj ? tipoEventoObj.montoSena : 0;
    const depositoGarantia = tipoEventoObj ? tipoEventoObj.depositoGarantia : 0;

    const solicitud = {
      tipoEvento: nombreTipoEvento, cantidadPersonas: rowData[3], duracionEvento: rowData[4],
      fechaEvento: fechaEventoStr, horaInicio: horaInicioStr,
      precioBase: parseFloat(rowData[7]) || 0, 
      precioFinal: parseFloat(rowData[8]) || 0, // Lee de la Col I
      nombreCompleto: rowData[9], celular: rowData[10], email: rowData[11],
      adicionales: adicionalesSeleccionados,
      montoSena: montoSena,
      depositoGarantia: depositoGarantia
    };
    Logger.log(`--- FIN getSolicitudDetails ---`);
    return solicitud;
  } catch (e) {
    Logger.log(`Error en getSolicitudDetails para ID ${idSolicitud}: ${e.message}\nStack: ${e.stack}`);
    return null; 
  }
}

function getSolicitudDetailsById(id) {
  Logger.log(`--- INICIO getSolicitudDetailsById para ID ${id} ---`);
  return getSolicitudDetails(SpreadsheetApp.openById(SPREADSHEET_ID), id);
}

function enviarEmail(solicitud) {
  try {
    const config = getConfiguracion(SpreadsheetApp.openById(SPREADSHEET_ID));
    const emailDestino = config.emailDestino;
    if (!emailDestino || !solicitud || !solicitud.nombreCompleto) {
      Logger.log("No se pudo enviar email al admin por falta de datos (destino o solicitante).");
      return;
    }
    // Este string "Nueva Solicitud de Reserva" se usa para filtrar email desde gmail
    const asunto = `Nueva Solicitud de Reserva de ${solicitud.nombreCompleto}`;
    // Aquí puedes construir un cuerpo de email HTML más elaborado
    const cuerpo = JSON.stringify(solicitud, null, 2); 
    MailApp.sendEmail(emailDestino, asunto, cuerpo);
    Logger.log("Email al administrador enviado.");
  } catch(e) {
    Logger.log("Error enviando email al admin: " + e.message);
  }
}

function enviarEmailConfirmacionCliente(solicitud) {
  try {
    const emailCliente = solicitud.email;
    if (!emailCliente || !solicitud.nombreCompleto) {
      Logger.log("No se pudo enviar email al cliente por falta de datos.");
      return;
    }
    const asunto = "Confirmación de tu Solicitud de Reserva - El Templo de Claypole";
    
    // Cargar la plantilla HTML
    const template = HtmlService.createTemplateFromFile('EmailConfirmacionCliente');
    
    // Pasar todas las propiedades del objeto 'solicitud' a la plantilla
    for (const key in solicitud) {
      template[key] = solicitud[key];
    }
    
    const cuerpoHtml = template.evaluate().getContent();
    
    MailApp.sendEmail({
      to: emailCliente,
      subject: asunto,
      htmlBody: cuerpoHtml
    });

    Logger.log("Email de confirmación (HTML) al cliente enviado.");
  } catch(e) {
    Logger.log("Error enviando email HTML al cliente: " + e.message);
  }
}