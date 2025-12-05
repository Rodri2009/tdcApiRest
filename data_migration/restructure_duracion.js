const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const inputFile = 'Opciones_Duracion.csv';
const outputFile = 'opciones_duracion_restructured.csv';

const restructuredData = [];

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (row) => {
    // La primera columna (ej: 'Header') contiene el valor del "header" (ej: 'Opcion 1')
    const headerValue = row.Header;

    // Iteramos sobre todas las columnas de la fila actual
    for (const eventType in row) {
      // Nos saltamos la columna 'Header' para no procesarla como un evento
      if (eventType !== 'Header') {
        const duracion = row[eventType];
        // Solo añadimos la fila si la duración no está vacía
        if (duracion && duracion.trim() !== '') {
          restructuredData.push({
            id_evento: eventType,
            header: headerValue,
            duracion: duracion
          });
        }
      }
    }
  })
  .on('end', () => {
    console.log('Lectura del archivo CSV original completada. Escribiendo archivo reestructurado...');

    // Definimos el escritor para el nuevo archivo CSV
    const csvWriter = createObjectCsvWriter({
      path: outputFile,
      header: [
        { id: 'id_evento', title: 'id_evento' },
        { id: 'header', title: 'header' },
        { id: 'duracion', title: 'duracion' },
      ],
    });

    // Escribimos los datos reestructurados en el nuevo archivo
    csvWriter.writeRecords(restructuredData)
      .then(() => console.log(`¡Éxito! El archivo reestructurado ha sido guardado como ${outputFile}`))
      .catch(err => console.error('Error al escribir el archivo CSV:', err));
  })
  .on('error', (err) => {
    console.error('Error al leer el archivo CSV original:', err);
  });