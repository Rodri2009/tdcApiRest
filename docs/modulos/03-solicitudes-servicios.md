# Módulo 03: Solicitudes y servicios

## Objetivo

Administrar las solicitudes del negocio, especialmente las relacionadas con alquileres, servicios, bandas, talleres y aprobación operativa.

## Alcance

- solicitudes de alquiler
- solicitudes de bandas y servicios
- estados de aprobación
- asignación de personal o recursos
- flujo de revisión y validación

## Entidades principales

- `solicitudes_*`
- `servicios`
- `talleres`
- `bandas`
- `agenda`

## Ruta principal

- `GET /api/solicitudes`
- `POST /api/solicitudes`
- `PUT /api/solicitudes/:id`
- `GET /api/servicios`
- `GET /api/talleres`

## Lógica esperada

- Los clientes generan solicitudes.
- El staff revisa el contenido.
- El admin aprueba o rechaza.
- El sistema guarda los cambios de estado para auditoría.

## Reglas de negocio

- La solicitud debe validar datos de contacto, tipo de servicio y fechas.
- Un estado no puede ser saltado sin validación.
- El sistema debe hacer explícito quién inició y quién aprobó.

## Componentes del módulo

### Routes
- `backend/routes/solicitudRoutes.js`
- `backend/routes/serviciosRoutes.js`
- `backend/routes/talleresRoutes.js`
- `backend/routes/bandaRoutes.js` / `bandasRoutes.js`

### Controllers
- `backend/controllers/solicitudController.js`
- `backend/controllers/serviciosController.js`
- `backend/controllers/talleresController.js`
- `backend/controllers/bandaController.js`

### Services
- servicios de aprobación, validación y coordinación

## Dependencias

- autenticación
- agenda
- usuarios y clientes
- validaciones de fechas y capacidad

## Riesgos

- estados inconsistentes
- solicitudes sin validación de disponibilidad
- mezcla de lógica de negocio en el controller

## Próximos pasos

- Normalizar nombres de rutas y endpoints.
- Centralizar validación de estados.
- Separar servicio de aprobación del servicio de consultas.
