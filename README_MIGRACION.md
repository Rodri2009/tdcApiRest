# MIGRACIÓN A ESTRUCTURA NORMALIZADA DE SOLICITUDES

## Resumen
Se realizó una migración de la base de datos y del backend para normalizar la gestión de solicitudes, separando los datos comunes y los específicos de cada tipo de solicitud. Esto mejora la integridad, escalabilidad y mantenibilidad del sistema.

---

## Cambios en la Base de Datos

### 1. Nueva estructura de tablas
- **Tabla general:** `solicitudes`
  - Contiene los campos comunes a todas las solicitudes: id, categoria, estado, descripción, datos de contacto, etc.
- **Tablas específicas:**
  - `solicitudes_alquiler`: datos particulares de alquiler de salón.
  - (Preparado para futuras: `solicitudes_bandas`, `solicitudes_servicios`, `solicitudes_talleres`)

### 2. Migración de datos
- Se renombró la tabla original `solicitudes_alquiler` a `solicitudes_alquiler_old`.
- Se crearon las nuevas tablas normalizadas.
- Se migraron los datos de la tabla antigua a la nueva estructura:
  - Los datos comunes se insertaron en `solicitudes`.
  - Los datos específicos se insertaron en `solicitudes_alquiler`.
- Se actualizó el archivo `03_test_data.sql` con los nuevos inserts generados por `mysqldump`.

---

## Cambios en el Backend

### 1. Controlador de Solicitudes (`backend/controllers/solicitudController.js`)
- **Creación:**
  - Ahora inserta primero en `solicitudes` y luego en la tabla específica (`solicitudes_alquiler`), usando el mismo `id`.
- **Consulta:**
  - Las consultas usan JOIN entre `solicitudes` y la tabla específica.
  - El campo clave es `id` (ya no `id_solicitud`).
- **Actualización y finalización:**
  - Actualizan tanto la tabla general como la específica, usando transacciones para mantener la integridad.
- **Todos los endpoints relevantes fueron adaptados para trabajar con la nueva estructura.**

### 2. Endpoints probados
- Creación de solicitud (`POST /api/solicitudes`)
- Consulta de solicitud (`GET /api/solicitudes/:id`)
- Actualización de solicitud (`PUT /api/solicitudes/:id`)

---

## Refactorización de Bandas y Servicios

### Cambios en la lógica de Bandas
1. **Normalización de Tablas**:
   - Se ajustaron las tablas relacionadas con bandas para mejorar la consistencia de los datos.
   - Se corrigieron errores en las consultas SQL y se alinearon con el esquema actualizado.

2. **Endpoints**:
   - Se verificaron y corrigieron los endpoints relacionados con solicitudes de bandas.
   - Se resolvió el problema de "Banda no encontrada" en el endpoint `/api/bandas/solicitudes`.

### Cambios en la lógica de Servicios
1. **Nuevas Tablas**:
   - Se crearon las tablas `servicios_catalogo`, `precios_servicios`, `profesionales_servicios` y `turnos_servicios`.
   - Estas tablas manejan el catálogo de servicios, precios, profesionales y turnos respectivamente.

2. **Datos de Prueba**:
   - Se insertaron datos de prueba en las tablas mencionadas para validar la funcionalidad.

3. **Endpoints**:
   - Se probaron y corrigieron los endpoints públicos y protegidos relacionados con servicios.
   - Se resolvieron errores internos en los endpoints `/api/servicios/catalogo` y `/api/servicios/turnos/disponibles`.

### Notas Adicionales
- Se añadieron comentarios en los archivos SQL para aclarar el propósito de las tablas y los datos de prueba.
- Se verificó la consistencia de los datos y la funcionalidad de los endpoints después de los cambios.

---

## Consideraciones
- El backend ya no utiliza los campos ni la estructura antigua (`id_solicitud`, etc.).
- Para nuevas categorías de solicitudes, basta con crear la tabla específica y adaptar el controlador.
- El archivo `03_test_data.sql` debe mantenerse actualizado con los inserts de las tablas normalizadas.

---

## Archivos afectados
- `database/01_schema.sql` (estructura y migración)
- `database/03_test_data.sql` (datos de prueba actualizados)
- `backend/controllers/solicitudController.js` (lógica de negocio adaptada)

---

## Próximos pasos sugeridos
- Adaptar el resto de controladores y endpoints para otras categorías (`bandas`, `servicios`, `talleres`).
- Eliminar definitivamente las tablas antiguas si ya no se requieren.
- Mantener la documentación y los scripts de migración actualizados.

---

**Fecha de migración:** 4 de febrero de 2026
