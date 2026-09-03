# Normalización y Estandarización de Imágenes (Flyers y Logos)

Este documento resume la auditoría completa de imágenes del sistema TDC API Rest, el análisis del flujo de subida y persistencia, el estado actual de discrepancias entre archivos físicos y base de datos, y los pasos a seguir para su normalización definitiva.

---

## 1. Auditoría del Estado Actual

### 1.1. Flyers (`backend/uploads/flyers/`)
- **Total de archivos en disco:** 23 archivos (aprox. 14 MB).
- **Formatos mezclados:** `.jpg`, `.jpeg`, `.png`.
- **Nomenclaturas heterogéneas:**
  - Prefijo numérico simple: `solicitud_4.jpg`, `solicitud_12.jpeg`
  - Prefijo con categoría: `solicitud_tll_13.jpeg`, `solicitud_srv_8.jpg`, `solicitud_alq_11.png`
  - Nombres originales con espacios y caracteres especiales: `Cronograma_Junio.jpg`, `Partidos_de_La_selecci_na_rgentina.png`
  - Timestamps y hashes de Multer: `1788122124323-lqs9bv.jpeg`, `1779315159204-llmhl8.jpg`

#### Matriz de Correspondencia Flyers vs. Base de Datos (`solicitudes` / `eventos_confirmados`)

| ID Solicitud | Categoría | Nombre / Título | Estado | `url_flyer` en BD | Archivo físico en disco | Diagnóstico |
|---|---|---|---|---|---|---|
| **4** | Bandas | Fecha Tributo | Confirmado | `/uploads/flyers/solicitud_4.jpg` | `solicitud_4.jpg` (2.3 MB) | ✅ Vinculado correctamente |
| **5** | Bandas | Bandas de rock | Confirmado | `/uploads/flyers/solicitud_5.jpeg` | `solicitud_5.jpeg` (312 KB) | ✅ Vinculado (existe `solicitud_5.jpg` duplicado antiguo) |
| **6** | Bandas | Termidor Fest | Confirmado | `/uploads/flyers/solicitud_6.jpeg` | `solicitud_6.jpeg` (260 KB) | ✅ Vinculado (existe `solicitud_6.png` duplicado antiguo) |
| **7** | Servicios | Fotografía Eventos | Solicitado | `NULL` | *(No existe)* | ⚪ Sin flyer asignado |
| **8** | Talleres | Taller de Dibujo | Confirmado | `NULL` | `solicitud_srv_8.jpg` (409 KB) | ⚠️ Huérfano en disco con prefijo `srv_8` |
| **9** | Bandas | Mounster of Claypole | Confirmado | `/uploads/flyers/solicitud_9.jpeg` | `solicitud_9.jpeg` (328 KB) | ✅ Vinculado (existen copias `.jpg` y `.png`) |
| **10** | Bandas | DOMINGO METALERO | Confirmado | `/uploads/flyers/solicitud_10.jpeg` | `solicitud_10.jpeg` (248 KB) | ✅ Vinculado correctamente |
| **11** | Bandas | CONURTRASH | Confirmado | `/uploads/flyers/2026-06-06_-_CONURTRASH.jpeg` | `2026-06-06_-_CONURTRASH.jpeg` (214 KB) | ✅ Vinculado correctamente |
| **12** | **Talleres (`tll_12`)** | **test** | **Confirmado** | `https://example.com/flyer.jpg` | `solicitud_12.jpeg` (855 KB) | ❌ **Error:** La BD tiene URL externa inválida (falla 404). El flyer real está en disco como `solicitud_12.jpeg`. |
| **13** | **Talleres (`tll_13`)** | **Latin Dance Essentials** | **Confirmado** | `NULL` | `solicitud_tll_13.jpeg` (105 KB) | ⚠️ **Desincronizado:** Archivo subido pero no guardado en BD. |
| **14** | Talleres (`tll_14`) | Yoga Recuperar Energía | Confirmado | `NULL` | *(No existe)* | ⚪ Sin flyer asignado |
| **15** | Talleres (`tll_15`) | Collage y Color | Confirmado | `NULL` | *(No existe)* | ⚪ Sin flyer asignado |

#### Archivos Redundantes y Huérfanos Identificados por Hash MD5
1. **Hash `3be9f6888c4dc15e5941155806857de8` (105 KB) - Mismo archivo triplicado:**
   - `solicitud_tll_13.jpeg` *(el que corresponde a tll_13)*
   - `Partidos_de_la_seleccion.jpeg` *(subida huérfana)*
   - `1788122124323-lqs9bv.jpeg` *(subida huérfana)*
2. **Hash `ddb1369f5d3b1e3c17ff214b0d24b8e6` (259 KB) - Mismo archivo duplicado:**
   - `solicitud_bnd_12.jpg`
   - `1779315159204-llmhl8.jpg`
3. **Archivos de alquileres eliminados (0 filas en `solicitudes_alquiler`):**
   - `solicitud_alq_11.jpeg` (133 KB)
   - `solicitud_alq_11.png` (2.4 MB)
4. **Subidas sueltas huérfanas sin asociar:**
   - `Cronograma_Junio.jpg` (496 KB)
   - `Partidos_de_La_selecci_na_rgentina.png` (1.4 MB)
   - `1785447704578-f59a1s.jpeg` (402 KB)
   - `1788057175183-bzaj2r.png` (2.5 MB)
5. **Versiones redundantes/antiguas:**
   - `solicitud_5.jpg`
   - `solicitud_6.png`
   - `solicitud_9.jpg` y `solicitud_9.png`

---

### 1.2. Logos de Bandas (`backend/uploads/bandas/`)
- **Total de archivos en disco:** 27 archivos (aprox. 8.5 MB).
- **Formatos mezclados:** 10 `.jpeg`, 5 `.jpg`, 9 `.png`.
- **Logos vinculados a bandas activas en BD (`bandas_artistas`):** 24 archivos.
- **Logos huérfanos en disco (bandas inexistentes en BD):** 3 archivos.
  - `logo_feliz_entierro.jpeg` (24 KB)
  - `logo_perros_de_paja.jpeg` (65 KB)
  - `logo_scones_de_la_chola.jpeg` (7 KB)
- **Logos en BD que no tienen archivo en disco:** Bandas 40 a 53 (datos seed con rutas mock `/uploads/bandas/logo_*.jpg` sin archivo físico).

---

## 2. Diagnóstico del Flujo de Uploads en `editar_solicitud_talleres.html`

1. **Subida en frontend (`handleFlyerUpload`):**
   - Envía `POST /api/uploads/flyers` sin el parámetro `?solicitudId=...` en la query string.
   - El backend no puede inferir a qué solicitud pertenece la imagen.
2. **Backend (`uploadsController.uploadFlyerPublic`):**
   - Actualmente renombra el archivo al nombre original del cliente (`file.originalname`), lo que genera nombres con espacios (`Partidos_de_la_seleccion.jpeg`) o timestamps.
3. **Persistencia diferida:**
   - Subir el archivo solo coloca la URL devuelta en `<input id="urlFlyer">`.
   - Si el usuario no presiona **"Guardar Cambios"** (`#save-button`), el archivo físico queda como huérfano en disco y la BD queda en `NULL`.

---

## 3. Pasos a Seguir para la Normalización

### Paso 1: Eliminación de Imágenes Redundantes y Huérfanas
**Objetivo:** Liberar espacio y limpiar el directorio eliminando archivos que no están vinculados a ninguna entidad válida.

1. **Limpieza en `uploads/flyers/`:**
   - Eliminar los duplicados por hash MD5:
     - `Partidos_de_la_seleccion.jpeg` y `1788122124323-lqs9bv.jpeg` (conservando `solicitud_tll_13.jpeg`).
     - `1779315159204-llmhl8.jpg` y `solicitud_bnd_12.jpg`.
   - Eliminar archivos de solicitudes inexistentes o eliminadas:
     - `solicitud_alq_11.jpeg` y `solicitud_alq_11.png`.
     - `solicitud_srv_8.jpg` (o vincular a solicitud 8 si correspondiera).
   - Eliminar subidas temporales huérfanas:
     - `Cronograma_Junio.jpg`, `Partidos_de_La_selecci_na_rgentina.png`, `1785447704578-f59a1s.jpeg`, `1788057175183-bzaj2r.png`.
   - Eliminar versiones obsoletas de solicitudes activas:
     - `solicitud_5.jpg`, `solicitud_6.png`, `solicitud_9.jpg`, `solicitud_9.png`.
2. **Limpieza en `uploads/bandas/`:**
   - Eliminar los 3 logos huérfanos que no pertenecen a ninguna banda en `bandas_artistas`:
     - `logo_feliz_entierro.jpeg`
     - `logo_perros_de_paja.jpeg`
     - `logo_scones_de_la_chola.jpeg`

---

### Paso 2: Modificar los Uploads para Estandarizar Formato y Nomenclatura
**Objetivo:** Garantizar que todo flyer subido a futuro se guarde siempre en formato real `.jpg` y con una nomenclatura estandarizada.

1. **Incorporar librería de procesamiento de imagen en backend:**
   - Instalar y configurar `sharp` en `backend/package.json` para realizar conversiones en memoria eficientes y seguras.
2. **Estandarización de formato de Flyers a JPG:**
   - Cualquier archivo de entrada (`image/png`, `image/jpeg`, etc.) se convierte mediante `sharp(buffer).jpeg({ quality: 85 }).toFile(...)` a formato **JPG**.
3. **Estandarización de nomenclatura de Flyers:**
   - Convención final adoptada: si el ID llega con prefijo, se conserva el prefijo (`bnd_9.jpg`, `tll_12.jpg`, `srv_8.jpg`, `alq_11.jpg`).
   - Si la solicitud llega solo con número, se normaliza a `solicitud_5.jpg` para mantener la misma regla.
   - En caso de subidas anónimas sin ID previo: `flyer_{timestamp}_{hash}.jpg`.
4. **Actualización en el Frontend (`editar_solicitud_talleres.html`):**
   - Modificar `handleFlyerUpload()` para enviar la URL con query param:
     ```javascript
     const uploadUrl = solicitudId ? `/api/uploads/flyers?solicitudId=${solicitudId}` : '/api/uploads/flyers';
     ```
   - Mantener deshabilitado el botón Guardar mientras se realiza la subida para evitar inconsistencias.

---

### Paso 3: Conversión y Renombrado de Flyers Existentes + Actualización de BD
**Objetivo:** Convertir los flyers activos existentes a `.jpg`, aplicarles la nueva nomenclatura y actualizar las tablas correspondientes.

1. **Script de migración física:**
   - Procesar los archivos activos de flyers existentes:
     - Convertir `solicitud_12.jpeg` → `solicitud_12.jpg` (o `flyer_solicitud_12.jpg`).
     - Convertir `solicitud_tll_13.jpeg` → `solicitud_13.jpg` (o `flyer_solicitud_13.jpg`).
     - Convertir `2026-06-06_-_CONURTRASH.jpeg` → `solicitud_11.jpg`.
     - Normalizar `solicitud_5.jpeg`, `solicitud_6.jpeg`, `solicitud_9.jpeg`, `solicitud_10.jpeg` a extensión `.jpg`.
2. **Actualización en Base de Datos:**
   - Actualizar tabla `solicitudes`:
     - Solicitud 12 (`tll_12`): reemplazar `https://example.com/flyer.jpg` por `/uploads/flyers/solicitud_12.jpg`.
     - Solicitud 13 (`tll_13`): reemplazar `NULL` por `/uploads/flyers/solicitud_13.jpg`.
     - Solicitudes 4, 5, 6, 9, 10, 11: actualizar sus `url_flyer` a la extensión unificada `.jpg`.
   - Actualizar tabla `eventos_confirmados`:
     - Sincronizar los campos `url_flyer` correspondientes para que coincidan con las solicitudes vinculadas.

---

### Paso 4: Estandarización de Logos de Bandas a PNG + Actualización de BD
**Objetivo:** Estandarizar todos los logos de bandas al formato `.png` (ideal para logos con fondos transparentes y bordes nítidos) y unificar su nomenclatura.

1. **Estandarización de Upload de Logos (`bandasController.subirLogo`):**
   - Modificar el controlador para procesar la imagen entrante con `sharp(buffer).png({ compressionLevel: 9 })`.
   - Nomenclatura unificada: `logo_{id_banda}.png` o `logo_{slug_banda}.png`.
2. **Conversión física de logos existentes en `uploads/bandas/`:**
   - Convertir los 15 logos existentes en `.jpeg` o `.jpg` a `.png` real:
     - `logo_las_mentas.jpeg` → `logo_las_mentas.png`
     - `logo_superlogico.jpeg` → `logo_superlogico.png`
     - `logo_reite.jpg` → `logo_reite.png`
     - `logo_falsa_euforia.jpg` → `logo_falsa_euforia.png`
     - *(y los 11 restantes)*
   - Eliminar los archivos `.jpg`/`.jpeg` originales tras verificar la conversión.
3. **Actualización en Base de Datos:**
   - Actualizar la columna `logo_url` en la tabla `bandas_artistas` para que todos los registros apunten a sus nuevos nombres `.png`.
   - En el caso de las bandas 40 a 53 que tienen rutas mock inexistentes, setear `logo_url = NULL` o generar un placeholder oficial para evitar llamadas 404 en el cliente.
