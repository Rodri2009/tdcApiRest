# Módulo 04: Eventos, bandas y talleres

## Objetivo

Gestionar la programación cultural del espacio: eventos, bandas, talleres y agenda.

## Alcance

- agenda y programación
- bandas
- talleres
- eventos confirmados
- detalle de actividad y disponibilidad

## Entidades principales

- `bandas`
- `talleres`
- `agenda`
- `eventos_confirmados`
- `eventos`

## Ruta principal

- `GET /api/bandas`
- `POST /api/bandas`
- `GET /api/talleres`
- `GET /api/eventos`
- `GET /api/admin/eventos_confirmados`

## Lógica esperada

- Se registran bandas, talleres y eventos.
- La agenda refleja la programación real del lugar.
- Los eventos confirmados pueden relacionarse con ventas, entrada y gestión de caja.

## Reglas de negocio

- Las bandas y talleres deben tener estado y disponibilidad definidos.
- Los eventos tienen capacidad, fechas y relación con cliente o actividad.
- La agenda debe reflejar la programación operativa real.

## Componentes del módulo

### Routes
- `backend/routes/bandasRoutes.js`
- `backend/routes/bandaRoutes.js`
- `backend/routes/talleresRoutes.js`
- `backend/routes/eventosRoutes.js`

### Controllers
- `backend/controllers/bandasController.js`
- `backend/controllers/bandaController.js`
- `backend/controllers/talleresController.js`
- `backend/controllers/eventosController.js`

## Dependencias

- solicitudes
- caja
- uploads
- frontend de agenda y administración

## Riesgos

- entidad duplicada (`banda` y `bandas`)
- mezcla de rutas y lógica de administración con vistas públicas
- inconsistencia de nomenclatura en el backend

## Próximos pasos

- Unificar naming de rutas por dominio.
- Documentar relación entre eventos confirmados y tickets.
- Revisión de endpoints duplicados.
