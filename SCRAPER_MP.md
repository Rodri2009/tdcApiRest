# SCRAPER_MP

## Resumen

Este documento explica el proceso completo del scraper de Mercado Pago en el backend de `tdcApiRest`.

El objetivo es que el backend pueda:
- navegar por la sección de actividades de Mercado Pago
- extraer transacciones paginadas
- normalizar y deduplicar los datos
- filtrar por rango de fechas
- devolver un flujo SSE de progreso para pruebas
- importar transacciones a la caja automáticamente

La ruta de pruebas actual es:
- `http://localhost:3000/api/test/mp-stream`

Esta ruta existe únicamente para pruebas sin frontend y debe migrarse a la ruta productiva adecuada en el backend.

---

## Componentes principales

### 1. `backend/services/activityService.js`

Esta es la pieza central del scraper.

Contiene dos funciones principales:

- `scrapeActivity(page, verbose, dateFrom, dateTo, sequenceOffset)`
  - Extrae todas las transacciones visibles en la página de Mercado Pago.
  - Intenta primero usar el JSON en memoria dentro de la página (`window._n.ctx.r.appProps.pageProps.listData.groups`).
  - Intenta normalizar campos claves como `id`, `title`, `amount`, `currency`, `dateTime`, `creationDate`, `type`.
  - Mapea la hora exacta de la transacción usando elementos `<time>` del DOM para obtener la hora de Argentina (UTC-3).
  - Devuelve transacciones estructuradas con un marcado interno `_source` y `_isStructured`.

- `scrapeActivityAllPages(page, maxPages, onProgress, dateFrom, dateTo)`
  - Pagina por todas las páginas del histórico de actividades de Mercado Pago.
  - Usa navegación por URL con el parámetro `page` en lugar de depender únicamente de botones de paginación.
  - Extrae cada página con `scrapeActivity(...)`.
  - Detecta páginas duplicadas comparando fingerprints de filas.
  - Lleva un conjunto `seenTransactionIds` para evitar transacciones repetidas entre páginas.
  - Deduplica transacciones finales usando una clave de estabilidad basada en `id`, hash de `raw`, title, monto y fecha.
  - Emite eventos de progreso a través del callback `onProgress`.

Además, esta función controla:
- pausa del `TransactionWatchService` durante el scraping
- congelamiento de timers de Mercado Pago para reducir interferencias
- detección de refresh de página inesperados
- reanudación del watch service al finalizar

---

## Eventos SSE generados por el scraper

La versión de prueba del endpoint emite eventos simples.

### Eventos clave

- `status`
  - mensajes de estado generales como inicio de scraping o pausa de watch service.

- `page_start`
  - notifica el inicio de extracción de una página.

- `page_done`
  - resumen por página con campos mínimos:
    - `page`
    - `count`
    - `rawCount`
    - `total`
    - `firstTransaction` (solo si hay datos)
    - `lastTransaction` (solo si hay datos)

- `page_duplicate`
  - cuando se detecta que una página volvió a mostrar el contenido anterior.

- `warning`
  - problemas menores durante la extracción, como refresh no esperado o errores leves.

- `scraping_done`
  - resumen final de scraping con:
    - `total`
    - `pages`
    - `navigationErrors`
    - `duplicatesRemoved`

- `imported`
  - cada transacción importada con un resumen liviano.

- `done`
  - resumen final de la importación y cierre de caja.

---

## Controlador de la importación automática

### `backend/controllers/cajasController.js`

La función principal es `importarAutoStream(req, res)`.

Flujo general:

1. recibe los parámetros de query:
   - `fechaDesde`
   - `fechaHasta`
   - `maxPaginas`

2. configura la respuesta SSE.

3. convierte las fechas recibidas desde `datetime-local` en horario de Buenos Aires a UTC.

4. crea una caja nueva en la base de datos con notas de importación.

5. llama a `scrapeActivityAllPages(mpPage, maxPages, callback, dateFrom, dateTo)`.

6. filtra las transacciones obtenidas por el rango de fechas exacto.

7. normaliza y genera `comprobante_ref` para deduplicar contra `movimientos_caja`.

8. inserta las transacciones nuevas en `movimientos_caja`.

9. cierra la caja automáticamente y envía el evento final `done`.

### Notas importantes

- `importarAutoStream` actualmente utiliza `req.user` para determinar el usuario que crea la caja.
- La ruta actual de pruebas inyecta un usuario de prueba mediante `injectTestUser`.
- La ruta de pruebas no debe usarse en producción.

---

## Ruta de prueba actual

### `backend/routes/testRoutes.js`

Esta ruta es solo para test local sin frontend.

- `GET /api/test/mp-stream`
- Query params:
  - `fechaDesde`
  - `fechaHasta`
  - `maxPaginas`

El controlador conectado es `importarAutoStream`.

`injectTestUser()` crea un usuario admin falso para que el controlador funcione sin autenticación real.

---

## Qué hay que migrar

### 1. El endpoint productivo ya pertenece a cajas

En `backend/routes/cajasRoutes.js` ya existe la ruta productiva:
- `GET /api/cajas/importar-auto-stream`

Esta es la ruta correcta donde debe vivir el flujo de importación automática de MP, porque el proceso crea y cierra cajas automáticamente.

### 2. Mantener el endpoint de prueba solo para desarrollo

La ruta de prueba actual en `backend/routes/testRoutes.js` debe quedarse como herramienta local para debugging sin frontend.

- Debe usar `injectTestUser()` solo en el entorno local.
- No debe exponerse como ruta productiva.
- En producción, se debe utilizar `backend/routes/cajasRoutes.js` con middleware de autenticación real.

### 3. Seguridad y autenticación

La ruta productiva debe usar `protect` y `requireAdmin` de `backend/middleware/authMiddleware.js`.

En `backend/routes/cajasRoutes.js`, estas rutas ya están protegidas globalmente mediante:
- `router.use(protect);`
- `router.use(requireAdmin);`

Por lo tanto, la ruta `GET /api/cajas/importar-auto-stream` ya está en el lugar correcto y con la protección indicada.

### 4. Qué hacer con `testRoutes.js`

- `testRoutes.js` debe permanecer como un helper de pruebas locales.
- Su única función debe ser permitir `curl` local sin frontend.
- Debe conservar la inyección del usuario de prueba en `injectTestUser`.

---

## Recomendación de migración

Sugiero:

1. dejar `backend/routes/testRoutes.js` como ruta de pruebas local únicamente.
2. utilizar `backend/routes/cajasRoutes.js` como la ruta real para producción.
3. si se mantiene un endpoint `importar-auto-stream` externo, que sea el mismo que ya existe en `cajasRoutes`.
4. verificar que el middleware que inyecta `mpPage` en `req.mpPage` siga aplicándose antes de `importarAutoStream`.

---

## Detalles técnicos clave

- El scraping usa datos internos de Mercado Pago en `window._n.ctx.r.appProps.pageProps`.
- La hora exacta se corrige con la hora visual de Argentina (UTC-3) porque el JSON no siempre incluye la hora completa.
- La paginación se hace por URL: `?page=N`.
- El scraper detecta páginas duplicadas y aborta cuando MP regresa al inicio de historial.
- El `watchService` se pausa durante el scraping para evitar que la sesión MP refresque la página.

---

## Estado actual

- El endpoint de prueba funciona para `curl` y pruebas sin frontend.
- La lógica del backend ya está diseñada para extraer y procesar actividad MP.
- Falta migrar la ruta al módulo de rutas definitivo y sustituir la inyección de usuario de prueba por seguridad real.

---

## Cómo probar

1. Levantar el backend.
2. Ejecutar:
   - `curl -N "http://localhost:3000/api/test/mp-stream?fechaDesde=2026-05-16T21:00&fechaHasta=2026-05-16T23:00&maxPaginas=1"`
3. Verificar que el SSE devuelva eventos legibles y termine con `done`.

---

## Siguientes pasos

- Migrar el endpoint a la ruta correcta.
- Eliminar o comentar el uso de `injectTestUser` en producción.
- Revisar si el frontend debe consumir SSE o si conviene exponer un endpoint REST en paralelo.
- Mantener `testRoutes.js` solo como herramienta local de desarrollo.
