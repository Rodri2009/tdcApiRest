# Módulo 01: Autenticación y permisos

## Objetivo

Gestionar el acceso seguro al sistema, validando usuarios, generando JWT y controlando permisos por rol.

## Alcance

- Login de usuarios
- Validación de credenciales
- Generación y verificación de token JWT
- Middleware de autenticación
- Control de roles: admin, staff, cliente
- Protección de rutas

## Entidades principales

- usuarios
- roles
- permisos
- sesiones

## Ruta principal

- `POST /api/login`
- `GET /api/me`
- `POST /api/logout`

## Lógica esperada

- El backend valida email/contraseña contra la base de datos.
- Se genera un JWT con datos del usuario y sus permisos.
- El frontend almacena el token en localStorage.
- Cada request protegida incluye `Authorization: Bearer <token>`.
- El middleware valida el token y autoriza según rol/permiso.

## Reglas de negocio

- `admin` tiene acceso completo.
- `staff` tiene acceso operativo del sistema.
- `cliente` solo accede a contenido y operaciones permitidas para su perfil.
- La validación de roles NO debe depender solo del frontend.

## Componentes del módulo

### Routes
- `backend/routes/authRoutes.js`

### Controllers
- `backend/controllers/authController.js`

### Services
- `backend/services/authService.js` (si aplica)

### Middleware
- `backend/middleware/authMiddleware.js`
- `backend/middleware/roleMiddleware.js` (si existe o se recomienda crear)

## Dependencias

- MySQL
- JWT
- middleware de logging
- `localStorage` del frontend para persistencia del token

## Riesgos

- Token inválido o expirado
- Confusión entre `role` y `roles`
- Frontend mostrando acciones sin validación real del backend

## Próximos pasos

- Consolidar roles y permisos en una estructura estándar.
- Crear validadores por endpoint y por módulo.
- Documentar permisos específicos por acción.
