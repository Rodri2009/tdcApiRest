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
