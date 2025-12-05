# TDC - Sistema de Gestión de Eventos

Sistema de gestión de solicitudes para eventos del Centro Cultural.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX (proxy)                        │
│                         Puerto 80                           │
└─────────────────────────────────────────────────────────────┘
                 ↓                              ↓
     /api/* (backend)                    /* (frontend)
                 ↓                              ↓
┌────────────────────────┐        ┌──────────────────────────┐
│        BACKEND         │        │         NGINX            │
│     Node.js/Express    │        │     (sirve estáticos)    │
│       Puerto 3000      │        │       /app/frontend      │
└────────────────────────┘        └──────────────────────────┘
                 ↓
     ┌───────────────────┐
     │      MARIADB      │
     │    Puerto 3306    │
     └───────────────────┘
```

## Requisitos

- Docker y Docker Compose
- Archivo `.env` en la raíz del proyecto

## Puesta en Marcha

```bash
# 1. Clonar y configurar
git clone <repo-url>
cd tdcApiRest
cp .env.example .env   # Editar con tus variables

# 2. Levantar servicios
./up.sh
```

**URLs:**
- Frontend: http://localhost
- API: http://localhost/api

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `./up.sh` | Levanta todos los servicios |
| `./down-and-backup.sh` | Detiene servicios y crea backup de la BD |
| `./reset.sh` | Reinicia completamente (elimina datos y reconstruye) |

### Crear usuario administrador

```bash
docker exec -it tdc-backend node /app/scripts/crear-admin.js
```

### Reiniciar solo el backend

```bash
./scripts/restart_backend.sh
```

## Estructura del Proyecto

```
tdcApiRest/
├── backend/
│   ├── server.js           # Punto de entrada
│   ├── controllers/        # Lógica de negocio
│   ├── routes/             # Definición de rutas API
│   ├── middleware/         # Auth y validaciones
│   └── services/           # Email, etc.
├── frontend/
│   ├── index.html          # Página principal
│   ├── page.html           # Formulario de solicitud
│   └── admin*.html         # Paneles de administración
├── database/
│   ├── 01_schema.sql       # Estructura de tablas
│   ├── 02_seed.sql         # Datos iniciales
│   ├── 03_talleres_servicios.sql # Talleres y servicios
│   ├── 04_roles_permisos.sql     # Sistema RBAC
│   ├── 05_personal_tarifas.sql   # Tarifas y pagos del personal
│   └── _legacy/            # SQLs obsoletos (referencia)
├── docker/
│   ├── docker-compose.yml  # Orquestación de servicios
│   └── Dockerfile.*        # Imágenes de Docker
└── docs/
    └── LOGICA_NEGOCIO.md   # Documentación de reglas de negocio
```

## Endpoints API

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| POST | `/api/auth/register` | Registrar usuario |

### Solicitudes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/solicitudes` | Listar solicitudes del usuario |
| POST | `/api/solicitudes` | Crear solicitud |
| GET | `/api/solicitudes/:id` | Obtener solicitud |
| PUT | `/api/solicitudes/:id` | Actualizar solicitud |

### Admin
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/admin/solicitudes` | Listar todas las solicitudes |
| PUT | `/api/admin/solicitudes/:id/estado` | Cambiar estado |

### Configuración de Alquiler
| Método | Endpoint | Descripción | Permiso |
|--------|----------|-------------|---------|
| GET | `/api/admin/alquiler/tipos` | Listar tipos de evento | Lectura |
| POST | `/api/admin/alquiler/tipos` | Crear tipo de evento | `config.alquiler` |
| GET | `/api/admin/alquiler/precios` | Listar precios | Lectura |
| POST | `/api/admin/alquiler/precios` | Crear precio | `config.alquiler` |

### Tarifas y Pagos del Personal
| Método | Endpoint | Descripción | Permiso |
|--------|----------|-------------|---------|
| GET | `/api/admin/personal/tarifas` | Listar tarifas | Lectura |
| GET | `/api/admin/personal/tarifas/vigentes` | Tarifas vigentes | Lectura |
| POST | `/api/admin/personal/tarifas` | Crear tarifa | `config.alquiler` |
| PUT | `/api/admin/personal/tarifas/:id` | Actualizar tarifa | `config.alquiler` |
| DELETE | `/api/admin/personal/tarifas/:id` | Desactivar tarifa | `config.alquiler` |
| GET | `/api/admin/personal/pagos` | Listar pagos | Lectura |
| GET | `/api/admin/personal/pagos/pendientes` | Pagos pendientes | Lectura |
| GET | `/api/admin/personal/pagos/resumen` | Resumen por personal | Lectura |
| POST | `/api/admin/personal/pagos` | Registrar pago | `config.alquiler` |
| PUT | `/api/admin/personal/pagos/:id` | Actualizar pago | `config.alquiler` |
| DELETE | `/api/admin/personal/pagos/:id` | Eliminar pago | `config.alquiler` |

### Opciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/opciones/tipos-evento` | Tipos de evento disponibles |
| GET | `/api/opciones/adicionales` | Servicios adicionales |

## Lógica de Negocio

Ver documentación detallada en `docs/LOGICA_NEGOCIO.md`

**Tipos de eventos principales:**
1. **ALQUILER_SALON** - Eventos privados (cumpleaños, casamientos, etc.)
2. **FECHA_BANDAS** - Shows de bandas/artistas
3. **TALLERES** - Clases y talleres (futuro)
4. **SERVICIO** - Servicios de catering (futuro)

## Sistema de Roles y Permisos (RBAC)

El sistema implementa control de acceso basado en roles:

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| SUPER_ADMIN | 100 | Acceso total al sistema |
| ADMIN | 75 | Gestión completa excepto configuración del sistema |
| OPERADOR | 50 | Gestión de personal, bandas, talleres y servicios |
| VIEWER | 25 | Solo lectura |

**Permisos principales:**
- `solicitudes.*` - Gestión de solicitudes
- `usuarios.*` - Gestión de usuarios
- `config.alquiler` - Configuración de precios/duraciones (solo ADMIN+)
- `config.bandas/talleres/servicios` - Configuración de catálogos (OPERADOR+)
- `personal.gestionar` - Gestión de personal y roles (OPERADOR+)
- `personal.costos` - Tarifas y pagos del personal (solo ADMIN+)

## Variables de Entorno

Crear archivo `.env` con las siguientes variables:

```env
# Base de datos
MYSQL_ROOT_PASSWORD=tu_password
MYSQL_DATABASE=tdc_db
MYSQL_USER=tdc_user
MYSQL_PASSWORD=tu_password

# Backend
JWT_SECRET=tu_jwt_secret
NODE_ENV=production

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
```

## Desarrollo

Para ver logs del backend:
```bash
docker logs -f tdc-backend
```

Para conectar a la base de datos:
```bash
docker exec -it tdc-mariadb mariadb -u root -p
```
