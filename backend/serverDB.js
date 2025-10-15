function getSheetData(spreadsheet, sheetName, processFn = (row => row)) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange('A2:' + sheet.getLastColumn() + sheet.getLastRow()).getValues()
    .filter(row => row[0] || (row.length > 1 && row[1]))
    .map(processFn);
}

function processOptionSheet(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return {};
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = {};
  for (let col = 1; col < headers.length; col++) {
    const tipo = String(headers[col] || '');
    if (tipo) {
      result[tipo] = data.slice(1).map(row => String(row[col])).filter(String);
    }
  }
  return result;
}

function getConfiguracion(spreadsheet) {
    const configData = getSheetData(spreadsheet, 'Configuracion');
    const config = {};
    configData.forEach(row => { if (row[0] && row[1]) config[row[0]] = row[1]; });
    return config;
}

function getFeriados(anio) {
  try {
    Logger.log(`getFeriados: Solicitando feriados para el año ${anio}.`);
    const response = UrlFetchApp.fetch(`https://nolaborables.com.ar/api/v2/feriados/${anio}`);
    const data = JSON.parse(response.getContentText());
    return data.map(feriado => `${anio}-${String(feriado.mes).padStart(2, '0')}-${String(feriado.dia).padStart(2, '0')}`);
  } catch (e) {
    Logger.log(`Error al obtener feriados para el año ${anio}: ${e.message}`);
    return []; // Devolver array vacío en caso de error
  }
}

function generarOpcionesCantidadDesdeTarifas(tarifas) {
  const cantidadesPorTipo = {};
  tarifas.forEach(regla => {
    // --- CAMBIO CLAVE: Ignorar reglas sin tipo ---
    if (!regla.tipo) {
      Logger.log(`ADVERTENCIA: Se encontró una regla de precios sin 'tipo' definido. Fila ignorada.`);
      return; // 'return' dentro de un forEach salta a la siguiente iteración
    }
    // --- FIN DEL CAMBIO ---

    const tipo = regla.tipo;
    const opcionTexto = `Hasta ${regla.max}`;
    if (!cantidadesPorTipo[tipo]) {
      cantidadesPorTipo[tipo] = [];
    }
    if (!cantidadesPorTipo[tipo].includes(opcionTexto)) {
      cantidadesPorTipo[tipo].push(opcionTexto);
    }
  });
  Logger.log('Opciones de cantidad generadas desde Precios_Vigencia.');
  return cantidadesPorTipo;
}


function getTotalAdicionales(ss, solicitudId) {
  Logger.log(`--- INICIO getTotalAdicionales para ID ${solicitudId} ---`);
  try {
    const adicionalesSheet = ss.getSheetByName('Solicitudes_Adicionales');
    if (adicionalesSheet.getLastRow() < 2) return 0;
    const rows = adicionalesSheet.getRange('B2:D' + adicionalesSheet.getLastRow()).getValues();
    let totalAdicionales = 0;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(solicitudId)) {
        totalAdicionales += parseFloat(rows[i][2]) || 0;
      }
    }
    Logger.log(`Total de adicionales calculado: $${totalAdicionales}`);
    return totalAdicionales;
  } catch (e) {
    Logger.log('Error en getTotalAdicionales: ' + e.message);
    return 0;
  }
}