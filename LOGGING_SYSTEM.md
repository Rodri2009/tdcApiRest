#!/bin/bash

# DEMOSTRACIÓN DEL SISTEMA DE LOGGING CON FLAGS
# Este archivo muestra cómo usar los flags de depuración en el backend

cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════╗
║             SISTEMA DE DEPURACIÓN CON FLAGS - EJEMPLOS DE USO             ║
╚═══════════════════════════════════════════════════════════════════════════╝

El backend ahora dispone de un sistema centralizado de logging que permite
controlar la verbosidad mediante flags de línea de comandos. Todos están en
español y diseñados para facilitar la depuración.

───────────────────────────────────────────────────────────────────────────

📌 MODO NORMAL (sin flags):
   $ node backend/server.js
   
   Salida: Solo peticiones recibidas con timestamp
   [2026-02-20T14:20:27.687Z] Petición recibida: GET /api/solicitudes-bandas

───────────────────────────────────────────────────────────────────────────

📌 MODO VERBOSE (muestra todo el flujo de procesamiento):
   $ node backend/server.js -v
   O
   $ node backend/server.js --verbose
   
   Salida: Incluye:
   ✓ Peticiones recibidas
   ✓ Procesamiento de datos (logVerbose)
   ✓ Operaciones exitosas
   ✓ Consultas a base de datos
   ✓ Advertencias
   
   Ejemplo:
   [2026-02-20T14:20:27.687Z] Petición recibida: GET /api/solicitudes-bandas
   [2026-02-20T14:20:27.740Z] ℹ [VERBOSE] Procesando solicitud de bandas...
   [2026-02-20T14:20:27.842Z] ✓ [EXITO] Solicitudes obtenidas: 3 registros
   [2026-02-20T14:20:27.845Z] ⚠ [ADVERTENCIA] Campo 'flyer_url' nulo en id=5

───────────────────────────────────────────────────────────────────────────

📌 MODO ERROR (solo muestra errores en los catch):
   $ node backend/server.js -e
   O
   $ node backend/server.js --error
   
   Salida: Incluye:
   ✓ Peticiones recibidas
   ✗ Errores capturados en try/catch
   ✗ Stack traces cuando hay excepciones
   
   Ejemplo:
   [2026-02-20T14:20:27.687Z] Petición recibida: GET /api/solicitudes-bandas
   [2026-02-20T14:20:32.105Z] ✗ [ERROR] Error al obtener solicitudes de admin
     Stack: Error: ER_BAD_FIELD_ERROR: Unknown column 'sol.flyer_url'...

───────────────────────────────────────────────────────────────────────────

📌 MODO DEBUG (combina -v y -e, máximo detalle):
   $ node backend/server.js -d
   O
   $ node backend/server.js --debug
   
   Salida: Todo lo anterior: peticiones, verbose, errores y advertencias
   Se usa para depuración intensiva durante desarrollo
   
   ⚠️  NOTA: Genera mucha salida, útil cuando buscar bugs específicos

───────────────────────────────────────────────────────────────────────────

📌 COMBINACIONES PERMITIDAS:
   $ node backend/server.js -v -e
   Muestra verbose + errores (similar a --debug pero sin ser explícitamente debug)
   
   $ node backend/server.js --verbose --error
   Mismo resultado, sintaxis larga

───────────────────────────────────────────────────────────────────────────

📌 AYUDA (ver todos los flags disponibles):
   $ node backend/server.js -h
   O
   $ node backend/server.js --help
   
   Muestra este mensaje de ayuda con toda la documentación

───────────────────────────────────────────────────────────────────────────

🔍 CÓMO ENCONTRAR ERRORES MÁS RÁPIDO:

1️⃣  Inicialmente en MODO DEBUG (-d) para ver todo:
   $ node backend/server.js -d
   → Identifica dónde exactamente ocurre el problema

2️⃣  Usa MODO ERROR (-e) si lo que buscas son solo excepciones:
   $ node backend/server.js -e
   → Filtra solo errores de los try/catch

3️⃣  Usa MODO VERBOSE (-v) para seguir el flujo a detalle:
   $ node backend/server.js -v
   → Útil cuando el error es lógico, no una excepción

4️⃣  Modo normal en PRODUCCIÓN (sin flags):
   $ node backend/server.js
   → Mínimo overhead, solo registra peticiones recibidas

───────────────────────────────────────────────────────────────────────────

📋 FUNCIONES DE LOGGING DISPONIBLES EN EL CÓDIGO:

Para desarrolladores que quieran usar estos logs en controladores:

  // Requiere el módulo de logging
  const { logVerbose, logError, logSuccess, logWarning, logQuery } = 
    require('../lib/debugFlags');

  // Log verbose (solo con -v o -d)
  logVerbose('Mensaje', { datos: 'objeto' });
  
  // Log error (solo con -e o -d)
  logError('Error message', errorObject);
  
  // Log de éxito (solo con -v o -d)
  logSuccess('Operación completada', { resultado: 'datos' });
  
  // Log de advertencia (solo con -v o -d)
  logWarning('Atención', { problema: 'información' });
  
  // Log de consulta SQL (solo con -v o -d)
  logQuery('SELECT * FROM solicitudes WHERE id = ?', [123]);

───────────────────────────────────────────────────────────────────────────

✅ CASOS DE USO EN DESARROLLO:

Depuración rápida de un endpoint:
  $ node backend/server.js -d

Producción (mínimo overhead):
  $ node backend/server.js

Identificar problemas de BD:
  $ node backend/server.js -v | grep "QUERY\|ERROR"

Usar con Docker:
  docker-compose exec backend node server.js --verbose

───────────────────────────────────────────────────────────────────────────

📦 TODOS LOS ARCHIVOS ACTUALIZADOS:

✓ Controllers: adminController, solicitudController, eventosController, 
              bandasController, talleresController, serviciosController, etc.
              
✓ Routes: todos los routes ahora usan el logger centralizado

✓ Services: emailService, mercadopagoClient, whatsappClient

✓ Middleware: authMiddleware, requireAdmin, checkPermiso

✓ Server: server.js con soporte para parsing de flags

───────────────────────────────────────────────────────────────────────────

🎯 PRÓXIMOS PASOS:

1. Reinicia el backend con los flags deseados
2. Prueba diferentes endpoints para ver la salida
3. Si encuentras lugares que necesitan más logging, usa logVerbose()
4. Todos los logs incluyen timestamp ISO en español

═══════════════════════════════════════════════════════════════════════════
EOF
