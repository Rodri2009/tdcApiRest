function onEdit(e) {
  Logger.log(`--- INICIO onEdit ---`);
  const ss = e.source;
  const sheet = ss.getActiveSheet();
  const range = e.range;

  const SHEET_NAME = "Solicitudes";
  const STATUS_COLUMN = 14; // Columna N
  const CONFIRMED_STATUS = "Confirmado";

  if (sheet.getName() !== SHEET_NAME || range.getColumn() !== STATUS_COLUMN || range.getRow() === 1) {
    Logger.log(`onEdit: Edición ignorada. Hoja: ${sheet.getName()}, Columna: ${range.getColumn()}`);
    return;
  }

  const newValue = e.value;
  const rowNum = range.getRow();
  const solicitudId = sheet.getRange(rowNum, 1).getValue(); // Obtenemos el ID de la Col A
  
  Logger.log(`Detectado cambio de estado a '${newValue}' para ID_Solicitud ${solicitudId} en la fila ${rowNum}.`);

  if (newValue === CONFIRMED_STATUS) {
    try {
      sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).setBackground("#d9ead3");
      const solicitudCompleta = getSolicitudDetails(ss, solicitudId);
      if (solicitudCompleta && solicitudCompleta.email) {
        enviarEmailConfirmacionCliente(solicitudCompleta);
        Logger.log(`Email de confirmación enviado para ID ${solicitudId}.`);
      }
      // La generación de personal se hará en updateSolicitudEstado para mantener consistencia
    } catch (error) {
      Logger.log(`Error en onEdit al procesar confirmación para ID ${solicitudId}: ${error.message}`);
      range.setNote('Error en automatización: ' + error.message);
    }
  } else {
      sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).setBackground(null);
  }
  Logger.log(`--- FIN onEdit ---`);
}

function getAdminData() {
  Logger.log("--- INICIANDO getAdminData [v3 con estado de personal] ---");
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Solicitudes");
    if (sheet.getLastRow() < 2) return []; 
    
    const data = sheet.getRange("A2:N" + sheet.getLastRow()).getValues();
    const tipos = getSheetData(ss, 'Opciones_Tipos', row => ({ id: String(row[0]), nombreParaMostrar: String(row[1]) }));

    // --- NUEVO: Obtenemos todos los IDs de solicitud que tienen personal asignado ---
    const asignacionesSheet = ss.getSheetByName("Solicitudes_Personal");
    const idsConPersonal = new Set();
    if (asignacionesSheet.getLastRow() > 1) {
        asignacionesSheet.getRange("B2:B" + asignacionesSheet.getLastRow()).getValues()
            .flat()
            .forEach(id => idsConPersonal.add(String(id)));
    }
    Logger.log(`Se encontraron ${idsConPersonal.size} solicitudes con personal ya asignado.`);
    
    const solicitudes = data.map(row => {
      if (!row || !row[0]) return null;
      
      const solicitudId = String(row[0]);
      const tipoEventoId = row[2];
      const tipoEventoObj = tipos.find(t => t.id === tipoEventoId);
      
      return {
        id: solicitudId,
        fechaSolicitud: row[1] ? new Date(row[1]).toLocaleDateString('es-AR') : 'N/A',
        tipoEvento: tipoEventoObj ? tipoEventoObj.nombreParaMostrar : (tipoEventoId || 'N/A'),
        tipoEventoId: tipoEventoId,
        fechaEvento: row[5] ? new Date(row[5]).toLocaleDateString('es-AR') : 'N/A',
        nombreCliente: row[9] || '<em>No completado</em>',
        estado: row[13] || 'N/A',
        // --- NUEVA PROPIEDAD ---
        tienePersonalAsignado: idsConPersonal.has(solicitudId)
      };
    }).filter(Boolean);
    
    return solicitudes.reverse();
  } catch (e) {
    Logger.log(`--- ERROR FATAL en getAdminData: ${e.message} --- \n${e.stack}`);
    throw new Error("No se pudieron cargar los datos de las solicitudes.");
  }
}

function updateSolicitudEstado(id, nuevoEstado) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Solicitudes");
    const ids = sheet.getRange("A2:A" + sheet.getLastRow()).getValues().flat();
    const rowIndex = ids.findIndex(cellId => String(cellId) === String(id));
    if (rowIndex === -1) throw new Error(`No se encontró la fila para el ID ${id}`);
    const rowNum = rowIndex + 2;
    
    // --- NUEVO: Guardar el estado anterior por si falla ---
    const estadoAnterior = sheet.getRange(rowNum, 14).getValue();

    sheet.getRange(rowNum, 14).setValue(nuevoEstado); // La columna N es la 14
    
    let message = "Estado actualizado correctamente.";
    if (nuevoEstado === "Confirmado") {
      generarSolicitudDePersonal(id);
      message += " ¡Solicitud de personal generada!";
    }
    
    return {
      success: true,
      message: message,
      // --- NUEVO: Devolver una señal para mostrar/ocultar el botón ---
      showAssignButton: nuevoEstado === "Confirmado"
    };
  } catch (e) {
    Logger.log(`Error en updateSolicitudEstado para ID ${id}: ${e.message}`);
    return {
      success: false,
      message: "Error al actualizar el estado.",
      // --- NUEVO: Devolver el estado anterior para revertir en el cliente ---
      previousState: estadoAnterior
    };
  }
}

function deleteSolicitudById(id) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const solicitudesSheet = ss.getSheetByName("Solicitudes");
    const adicionalesSheet = ss.getSheetByName("Solicitudes_Adicionales");

    // Eliminar de la hoja Solicitudes
    const idsSolicitudes = solicitudesSheet.getRange("A2:A" + solicitudesSheet.getLastRow()).getValues().flat();
    const rowIndex = idsSolicitudes.findIndex(cellId => String(cellId) === String(id));
    if (rowIndex !== -1) {
      solicitudesSheet.deleteRow(rowIndex + 2);
    }

    // Eliminar de la hoja Solicitudes_Adicionales
    if (adicionalesSheet.getLastRow() > 1) {
      const idsAdicionales = adicionalesSheet.getRange("B2:B" + adicionalesSheet.getLastRow()).getValues();
      const rowsToDelete = [];
      idsAdicionales.forEach((row, index) => {
        if (String(row[0]) === String(id)) {
          rowsToDelete.push(index + 2);
        }
      });
      rowsToDelete.reverse().forEach(rowIndexToDelete => adicionalesSheet.deleteRow(rowIndexToDelete));
    }

    return { success: true, message: `Solicitud ID ${id} y sus adicionales han sido eliminados.` };
  } catch (e) {
    Logger.log(`Error en deleteSolicitudById para ID ${id}: ${e.message}`);
    return { success: false, message: "Error al eliminar la solicitud." };
  }
}


function getPersonalAssignmentData(solicitudId, tipoEventoId) {
  Logger.log(`--- INICIO getPersonalAssignmentData [Cargando Datos v5] ---`);
  Logger.log(`Buscando datos para solicitudId: '${solicitudId}' y tipoEventoId: '${tipoEventoId}'`);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // --- PASOS 1, 2, 3 (sin cambios) ---
    const solicitudData = getSolicitudDetails(ss, solicitudId);
    if (!solicitudData) throw new Error(`No se pudo encontrar la solicitud con ID ${solicitudId}`);
    const cantidadPersonasNum = parseInt((solicitudData.cantidadPersonas || "0").match(/\d+/g).pop()) || 0;
    Logger.log(`La solicitud es para ${cantidadPersonasNum} personas.`);

    const rolesData = getSheetData(ss, 'Roles_Por_evento');
    const tipoEventoIdNormalizado = String(tipoEventoId).trim().toLowerCase();
    const rolesRequeridos = rolesData
      .filter(row => {
        const idEnHojaNormalizado = String(row[0]).trim().toLowerCase();
        const minPersonas = parseInt(row[3]) || 0;
        const maxPersonas = parseInt(row[4]) || 999;
        return idEnHojaNormalizado === tipoEventoIdNormalizado && cantidadPersonasNum >= minPersonas && cantidadPersonasNum <= maxPersonas;
      })
      .map(row => ({ rol: row[1], cantidad: parseInt(row[2]) || 1 }));
    
    if (rolesRequeridos.length === 0) {
      return { error: 'No se encontraron roles configurados para este tipo de evento y cantidad de personas.' };
    }

    const personalData = getSheetData(ss, 'Personal_Disponible');
    const personalActivo = personalData.filter(row => row[4] === true).map(row => ({ id: row[0], nombre: row[1], roles: String(row[2] || '') }));
    const personalDisponible = {};
    personalActivo.forEach(persona => {
        const rolesArray = persona.roles.split(',').map(rol => rol.trim());
        rolesArray.forEach(rol => {
            if (rol) {
                if (!personalDisponible[rol]) personalDisponible[rol] = [];
                personalDisponible[rol].push({ id: persona.id, nombre: persona.nombre });
            }
        });
    });

    const rolesConsolidados = {};
    rolesRequeridos.forEach(rolReq => {
        if (!rolesConsolidados[rolReq.rol]) rolesConsolidados[rolReq.rol] = 0;
        rolesConsolidados[rolReq.rol] += rolReq.cantidad;
    });
    const rolesFinales = Object.keys(rolesConsolidados).map(rol => ({ rol: rol, cantidad: rolesConsolidados[rol] }));
    Logger.log(`Roles requeridos finales (consolidados): ${JSON.stringify(rolesFinales)}`);


    // --- CAMBIO CLAVE: "Paso 4" movido ANTES del return final ---
    Logger.log("Paso 4: Buscando asignaciones de personal previamente guardadas...");
    const asignacionesGuardadasData = getSheetData(ss, 'Solicitudes_Personal');
    const asignacionesGuardadas = asignacionesGuardadasData
        .filter(row => String(row[1]) === String(solicitudId))
        .map(row => ({
            rol: row[2],
            personalId: row[3]
        }));
    Logger.log(`Se encontraron ${asignacionesGuardadas.length} asignaciones guardadas.`);


    // --- El return ahora SÍ incluye todos los datos ---
    Logger.log(`--- FIN getPersonalAssignmentData (Éxito) ---`);
    return { 
        rolesRequeridos: rolesFinales, 
        personalDisponible, 
        asignacionesGuardadas // <-- Ahora sí se incluye en la respuesta
    };

  } catch(e) {
    Logger.log(`!!!!!!!!!! ERROR GRAVE CAPTURADO en getPersonalAssignmentData !!!!!!!!!!\n${e.stack}`);
    return { error: 'No se pudieron cargar los datos de asignación debido a un error interno.' };
  }
}

function generarSolicitudDePersonal(idSolicitud) {
  Logger.log(`(FUTURO) Generando solicitud de personal para la solicitud ID: ${idSolicitud}`);
  // Aquí irá la lógica que lee Roles_Por_Evento y escribe en Solicitudes_Personal
  return true;
}

function savePersonalAssignments(solicitudId, assignments) {
  Logger.log(`--- INICIO savePersonalAssignments [ID Secuencial v2] para ID ${solicitudId} ---`);
  Logger.log(`Asignaciones recibidas: ${JSON.stringify(assignments)}`);
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Solicitudes_Personal");

    // --- PASO 1: Eliminar todas las asignaciones ANTERIORES para esta solicitud ---
    // Esto es crucial para que podamos re-asignar personal si es necesario.
    if (sheet.getLastRow() > 1) {
      const allData = sheet.getRange("B2:B" + sheet.getLastRow()).getValues();
      const rowsToDelete = [];
      allData.forEach((row, index) => {
        if (String(row[0]) === String(solicitudId)) {
          // El índice del array es 0-based, la fila es 1-based, y empezamos en la fila 2.
          rowsToDelete.push(index + 2);
        }
      });

      if (rowsToDelete.length > 0) {
        Logger.log(`Se eliminarán ${rowsToDelete.length} asignaciones antiguas.`);
        // Iteramos hacia atrás para no afectar los índices de las filas que aún no hemos borrado.
        rowsToDelete.reverse().forEach(rowIndex => sheet.deleteRow(rowIndex));
      }
    }

    // --- PASO 2: Añadir las nuevas asignaciones ---
    if (assignments && assignments.length > 0) {
      // --- LÓGICA DE ID SECUENCIAL MEJORADA ---
      let nextIdNumber = 1; // Por defecto si la hoja está vacía
      if (sheet.getLastRow() > 1) {
        const idColumnValues = sheet.getRange("A2:A" + sheet.getLastRow()).getValues().flat().filter(Boolean);
        if (idColumnValues.length > 0) {
          const lastId = idColumnValues.pop(); // Ej: "A0012"
          const lastNumber = parseInt(lastId.replace(/[^0-9]/g, ''), 10); // Extrae "12"
          if (!isNaN(lastNumber)) {
            nextIdNumber = lastNumber + 1;
          }
        }
      }
      Logger.log(`El próximo número de ID de asignación es: ${nextIdNumber}`);
      // --- FIN DE LA LÓGICA DE ID ---

      const newRows = assignments.map((assignment, index) => {
        // Formateamos el nuevo ID: "A" + número rellenado con ceros a la izquierda hasta 4 dígitos
        const newId = `A${String(nextIdNumber + index).padStart(4, '0')}`;
        
        return [
          newId,
          solicitudId,
          assignment.rol,
          assignment.personalId,
          "Asignado"
        ];
      });
      
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      Logger.log(`Se insertaron ${newRows.length} nuevas asignaciones.`);
    }


    return { success: true, message: "Asignaciones de personal guardadas correctamente." };

  } catch (e) {
    Logger.log(`Error en savePersonalAssignments: ${e.message}\nStack: ${e.stack}`);
    return { success: false, message: "Ocurrió un error en el servidor al guardar las asignaciones." };
  }
}


function getWorkOrderData(solicitudId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    const solicitud = getSolicitudDetails(ss, solicitudId);
    if (!solicitud) throw new Error("No se encontró la solicitud.");
    
    const fechaEvento = new Date(solicitud.fechaEvento.split('/').reverse().join('-') + 'T00:00:00');
    const duracionMatch = solicitud.duracionEvento.match(/\d+/);
    const duracionEnHoras = duracionMatch ? parseInt(duracionMatch[0], 10) : 0;
    if (duracionEnHoras === 0) throw new Error("La duración del evento no es válida.");

    const horaInicioSanitizada = solicitud.horaInicio.replace('hs', '').trim();
    const [startHour, startMinute] = horaInicioSanitizada.split(':').map(Number);
    const eventoStartTime = new Date(fechaEvento);
    eventoStartTime.setHours(startHour, startMinute);
    const eventoEndTime = new Date(eventoStartTime);
    eventoEndTime.setHours(eventoStartTime.getHours() + duracionEnHoras);
    const personalStartTime = new Date(eventoStartTime);
    personalStartTime.setMinutes(eventoStartTime.getMinutes() - 30);
    const personalEndTime = new Date(eventoEndTime);
    personalEndTime.setMinutes(eventoEndTime.getMinutes() + 30);
    const formatTime = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const duracionTotalPersonalEnHoras = duracionEnHoras + 1;
    
    const asignacionesData = getSheetData(ss, 'Solicitudes_Personal');
    const personalAsignado = asignacionesData.filter(row => String(row[1]) === String(solicitudId));
    if (personalAsignado.length === 0) return { error: "No hay personal asignado para esta solicitud." };

    const personalMap = new Map(getSheetData(ss, 'Personal_Disponible').map(row => [row[0], row[1]]));
    const costosData = getSheetData(ss, 'Costos_Personal_Vigencia');

    let costoTotalPersonal = 0;
    const assignedStaffDetails = [];

    for (const asignacion of personalAsignado) {
      const rol = asignacion[2];
      const personalId = asignacion[3];
      const nombrePersonal = personalMap.get(personalId) || "Nombre no encontrado";
      
      // --- LÓGICA DE FECHA DE VIGENCIA MEJORADA ---
      // 1. Filtramos todos los costos para el rol cuya fecha de vigencia sea ANTERIOR o IGUAL a la fecha del evento.
      const costosAplicables = costosData.filter(costoRow => 
          costoRow[1] === rol && new Date(costoRow[2]) <= fechaEvento
      );
      
      if (costosAplicables.length === 0) throw new Error(`No se encontró configuración de costo para el rol "${rol}" vigente en la fecha del evento.`);
      
      // 2. Ordenamos los resultados de más reciente a más antiguo.
      costosAplicables.sort((a, b) => new Date(b[2]) - new Date(a[2]));
      
      // 3. El costo correcto es el primero de la lista (el más reciente).
      const costoVigente = costosAplicables[0];
      const costoPorHora = parseFloat(costoVigente[3]) || 0;
      const viaticos = parseFloat(costoVigente[4]) || 0; // Leemos la nueva columna E (índice 4)
      
      const costoPorHoras = costoPorHora * duracionTotalPersonalEnHoras;
      const totalPorPersona = costoPorHoras + viaticos; // Sumamos los viáticos
      costoTotalPersonal += totalPorPersona;
      
      assignedStaffDetails.push({
        nombre: nombrePersonal,
        rol: rol,
        costoPorHora: costoPorHora,
        viaticos: viaticos, // Añadimos viáticos a los datos
        totalPorPersona: totalPorPersona
      });
    }

    // Obtenemos los detalles adicionales de la solicitud original
    const solicitudOriginal = getSheetData(ss, 'Solicitudes').find(row => String(row[0]) === String(solicitudId));
    const detallesAdicionales = solicitudOriginal ? (solicitudOriginal[12] || 'Ninguno') : 'No encontrado';
    // El objeto 'solicitud' de getSolicitudDetails no tiene el ID, pero 'solicitudOriginal' sí (índice 2)
    const tipoEventoId = solicitudOriginal ? solicitudOriginal[2] : '';

    return {
      solicitudId: solicitudId,
      clienteNombre: solicitud.nombreCompleto, // Añadido
      tipoEventoIdForNav: tipoEventoId,  // Añadido
      detallesAdicionales: detallesAdicionales, // Añadido
      fechaEvento: solicitud.fechaEvento,
      tipoEvento: solicitud.tipoEvento,
      horaInicio: horaInicioSanitizada,
      horaFinEvento: formatTime(eventoEndTime),
      horaInicioPersonal: formatTime(personalStartTime),
      horaFinPersonal: formatTime(personalEndTime),
      duracionTotalPersonalEnHoras: duracionTotalPersonalEnHoras,
      assignedStaff: assignedStaffDetails,
      costoTotalPersonal: costoTotalPersonal
    };

  } catch (e) {
    Logger.log(`Error en getWorkOrderData: ${e.message}\nStack: ${e.stack}`);
    return { error: `Error al generar la orden de trabajo: ${e.message}` };
  }
}


// --- NUEVA FUNCIÓN COMPLETA ---
function getSolicitudDataForEdit(solicitudId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const solicitudesSheet = ss.getSheetByName('Solicitudes');
    const ids = solicitudesSheet.getRange("A2:A" + solicitudesSheet.getLastRow()).getValues().flat();
    const rowIndex = ids.findIndex(cellId => String(cellId) === String(solicitudId));
    
    if (rowIndex === -1) {
      return { error: `No se encontró la solicitud con ID ${solicitudId}` };
    }
    
    const rowData = solicitudesSheet.getRange(rowIndex + 2, 1, 1, 13).getValues()[0];
    const fechaEventoActualStr = rowData[5] ? Utilities.formatDate(new Date(rowData[5]), Session.getScriptTimeZone(), "yyyy-MM-dd") : null;

    const solicitud = {
      id: rowData[0],
      tipoEvento: rowData[2],
      cantidadPersonas: rowData[3],
      duracionEvento: rowData[4],
      fechaEvento: fechaEventoActualStr,
      horaInicio: rowData[6],
      precioBase: rowData[7],
      detallesAdicionales: rowData[12] || '' // Columna M es el índice 12
    };


    // Obtenemos todas las opciones iniciales
    const allOptions = getInitialOptions(true); // <-- Le decimos que somos un admin

    // --- ¡CAMBIO CLAVE! ---
    // De la lista de fechas ocupadas, eliminamos la fecha de la solicitud
    // que estamos editando actualmente.
    if (fechaEventoActualStr && allOptions.fechasOcupadas) {
        Logger.log(`Excluyendo la fecha actual '${fechaEventoActualStr}' de la lista de fechas deshabilitadas.`);
        allOptions.fechasOcupadas = allOptions.fechasOcupadas.filter(fecha => fecha !== fechaEventoActualStr);
    }
    // --- FIN DEL CAMBIO CLAVE ---

    return { solicitud, allOptions };
  } catch (e) {
    Logger.log(`Error en getSolicitudDataForEdit: ${e.message}\nStack: ${e.stack}`);
    return { error: e.message };
  }
}


// --- NUEVA FUNCIÓN COMPLETA ---
function updateSolicitudData(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Solicitudes');
    const ids = sheet.getRange("A2:A" + sheet.getLastRow()).getValues().flat();
    const rowIndex = ids.findIndex(cellId => String(cellId) === String(data.solicitudId));

    if (rowIndex === -1) {
      return { success: false, message: `No se encontró la solicitud con ID ${data.solicitudId} para actualizar.` };
    }
    const rowNum = rowIndex + 2;

    let fechaObjeto = null;
    if (data.fechaEvento) {
      const partes = data.fechaEvento.split('-');
      fechaObjeto = new Date(partes[0], partes[1] - 1, partes[2]);
    }

    // Actualizamos los datos principales (columnas C a H)
    sheet.getRange(rowNum, 3, 1, 6).setValues([[
      data.tipoEvento,
      data.cantidadPersonas,
      data.duracionEvento,
      fechaObjeto,
      data.horaInicio,
      parseFloat(data.precioBase) || 0
    ]]);
    
    // --- CAMBIO 6: ACTUALIZAMOS LA COLUMNA M (13) POR SEPARADO ---
    sheet.getRange(rowNum, 13).setValue(data.detallesAdicionales || '');
    // --- FIN DEL CAMBIO 6 ---

    return { success: true, message: '¡Solicitud actualizada correctamente!' };
  } catch (e) {
    return { success: false, message: `Error al actualizar: ${e.message}` };
  }
}