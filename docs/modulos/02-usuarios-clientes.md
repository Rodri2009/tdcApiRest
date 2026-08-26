# Módulo 02: Usuarios y clientes

## Objetivo

Administrar las cuentas internas del sistema y los perfiles de clientes del espacio cultural.

## Alcance

- Usuarios del backend
- Clientes del sitio
- Perfiles
- Estados de cuenta
- Roles y niveles

## Entidades principales

- `usuarios`
- `clientes`
- `roles`
- `permisos`

## Ruta principal

- `GET /api/usuarios`
- `POST /api/usuarios`
- `GET /api/clientes`
- `POST /api/clientes`
- `PUT /api/clientes/:id`

## Lógica esperada

- Los usuarios administradores y staff se gestionan desde el backend.
- Los clientes tienen un flujo de registro/consulta vinculados a compras o solicitudes.
- El CRU de clientes debe estar desacoplado de autenticación.

## Reglas de negocio

- Los usuarios internos deben contar con permisos definidos.
- Los clientes no deben tener acceso administrativo.
- La relación entre `usuarios` y `clientes` debe mantenerse consistente.

## Componentes del módulo

### Routes
- `backend/routes/usuariosRoutes.js`

### Controllers
- `backend/controllers/usuariosController.js`

### Models
- `backend/models/usuariosModel.js`
- `backend/models/clientesModel.js` o similar

## Dependencias

- autenticación
- base de datos
- validaciones de formularios

## Riesgos

- usuarios duplicados
- referencias cruzadas entre tablas de usuarios y clientes
- inconsistencia de datos en perfiles

## Próximos pasos

- Homogenizar el modelo de usuarios y clientes.
- Separar mejor la identidad del negocio y la identidad del acceso.
- Definir permisos por entidad y por operación.
