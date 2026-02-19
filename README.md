# TDC - Sistema de Gestión Total (Versión Beta)


**Versión Beta**

Esta es la versión beta funcional del sistema. El flujo actual permite:
- Solicitudes de alquiler, servicios, talleres y fechas de bandas desde el frontend
- Confirmación y gestión de solicitudes desde el panel de administración
- Visualización pública de eventos confirmados en la agenda
- Control de visibilidad pública para solicitudes confirmadas
- Integración de eventos de bandas y solicitudes en la agenda pública

> **Nota:** En la próxima versión, el sistema migrará a un modelo con tablas especializadas por categoría (ver `README_MIGRACION.md`).

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
./scripts/up.sh
```

**URLs:**
- Frontend: http://localhost
- API: http://localhost/api

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `./scripts/up.sh` | Levanta todos los servicios. No aplica migraciones por defecto — usa `./scripts/up.sh --migrate` o `APPLY_MIGRATIONS=true ./scripts/up.sh` para aplicarlas desde `database/migrations` |
| `./scripts/down-and-backup.sh` | Detiene servicios y crea backup de la BD |
| `./scripts/reset.sh` | Reinicia completamente (elimina datos y reconstruye) — **aplica** las migraciones SQL que estén en `database/migrations` después de recrear la BD |
| `./scripts/export_db_to_migrations.sh` | Exporta el estado actual de la BD a un archivo SQL dentro de `database/migrations/` (data-only, `REPLACE INTO`). Soporta `--truncate-first` (opcional) para incluir `TRUNCATE TABLE` antes de los `REPLACE INTO`. Revisar y commitear manualmente |

*Nota:* Para aplicar migraciones sin hacer un `reset` completo puedes:
- ejecutar manualmente las SQL en `database/migrations` contra el contenedor MariaDB, por ejemplo:

  `cat database/migrations/20260210_add_url_flyer_to_eventos_confirmados.sql | docker compose -f docker/docker-compose.yml exec -T mariadb sh -c "mysql -u root -p\"$MARIADB_ROOT_PASSWORD\" \"$MARIADB_DATABASE\""`

- o realizar las comprobaciones y pasos de migración manualmente (no hay utilidades automáticas en este repo).

### Verificación manual (QA) — pasos rápidos
Sigue estos pasos antes y después de aplicar cualquier migración o cambio estructural.

1) Preparar
   - Asegúrate de tener `.env` configurado y `./scripts/up.sh` corriendo.

2) Backup de la base de datos (obligatorio)
   - `docker compose -f docker/docker-compose.yml exec -T mariadb sh -c 'mysqldump -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' > backup_pre_migration.sql`

3) Comprobar archivos/migraciones pendientes
   - `ls database/migrations | sort`  — revisa los SQL a aplicar.
   - `git log --oneline -- database/migrations | tail -n 10` — historial de migraciones en el repo.

4) Verificar esquema y tablas clave
   - `docker compose -f docker/docker-compose.yml exec -T mariadb sh -c "mysql -u root -p\"$MARIADB_ROOT_PASSWORD\" -D $MARIADB_DATABASE -e \"SHOW TABLES LIKE 'eventos_confirmados'; SELECT COUNT(*) FROM eventos_confirmados;\""`

5) Comprobar que no queden referencias legacy
   - `grep -R "fechas_bandas_confirmadas" --exclude-dir=.git -n . || true`

6) Verificar endpoints críticos (manual)
   - `curl -sSf http://localhost:3000/health` (backend UP)
   - Crear admin localmente y obtener token para comprobar endpoints privados:
     - `node ./scripts/crear-admin.js`
     - `TOKEN=$(curl -sS -X POST -H "Content-Type: application/json" -d '{"email":"admin@example","password":"changeme"}' http://localhost:3000/api/auth/login | jq -r .token)`
     - `curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/solicitudes`

7) Comprobar frontend y enlaces
   - Abre `http://localhost` y revisa las páginas afectadas.
   - Opcional: `npx blc http://localhost -ro` (link-checker).

8) Logs y rollback
   - Revisa logs: `docker compose -f docker/docker-compose.yml logs --tail 200 backend`
   - Si algo falla, restaura DB desde `backup_pre_migration.sql`:
     `docker compose -f docker/docker-compose.yml exec -T mariadb sh -c 'mysql -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < backup_pre_migration.sql`

> Nota: las utilidades automáticas `check_*`, `apply_*` y `scripts/verify_migration.sh` fueron retiradas del repositorio; utiliza los pasos anteriores para QA manual.

### Crear usuario administrador

```bash
docker exec -it tdc-backend node /app/scripts/crear-admin.js
```

## Cambios recientes en la versión beta

---

## Cambios importantes (Migración Diciembre 2025)

- Se migró la tabla principal `eventos` a `eventos_confirmados`.
- Todas las claves foráneas que referenciaban `eventos(id)` ahora apuntan a `eventos_confirmados(id)`.
- Se actualizaron los scripts de datos de prueba y el schema para reflejar estos cambios.
- El backend y frontend consumen los nuevos endpoints y estructura.
- Si tienes scripts personalizados, revisa y actualiza cualquier referencia a la tabla `eventos`.

---

> **IMPORTANTE:** Esta versión es funcional y estable, pero no es la estructura final recomendada. Consulta `README_MIGRACION.md` para el futuro modelo de datos y lógica de negocio.

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

### Dev helpers (uso para desarrollo)

- `?demo_flyer=1` — inyecta un `flyer` de demostración en el primer ítem visible de la agenda cuando no existe ninguno. **Restricción:** solo funciona en hosts locales (`localhost`, `127.0.0.1`, `::1`, `0.0.0.0`) y se ignora en entornos remotos/producción.

### Ver Logs

```bash
# Logs del backend (en tiempo real)
docker logs -f docker-backend-1

# Últimos 50 logs del backend
docker logs docker-backend-1 --tail 50

# Filtrar solo errores
docker logs docker-backend-1 2>&1 | grep -i error

# Logs de la base de datos
docker logs docker-mariadb-1 --tail 50

# Logs de nginx
docker logs docker-nginx-1 --tail 50

# Ver logs de todos los servicios
docker-compose -f docker/docker-compose.yml logs -f
```

### Conectar a la Base de Datos

```bash
# Conectar como root
docker exec -it docker-mariadb-1 mysql -u root -p tdc_db

# Ejecutar query directamente
docker exec docker-mariadb-1 mysql -u root -p<password> tdc_db -e "SELECT * FROM usuarios;"
```

### Reiniciar Servicios

```bash
# Reiniciar solo backend
docker-compose -f docker/docker-compose.yml restart backend

# Reiniciar todos los servicios
docker-compose -f docker/docker-compose.yml restart
```

---

## Mejoras Pendientes del Panel de Administración

Lista de sugerencias para futuras mejoras del panel de administración:

### 1. Dashboard con métricas
Agregar un panel principal en `admin.html` con estadísticas rápidas:
- Total de solicitudes (por estado: Solicitadas, Confirmadas, Canceladas)
- Próximos eventos de la semana
- Ingresos estimados del mes
- Gráficos de tendencias (usando Chart.js o similar)

### 2. Búsqueda global
Implementar una barra de búsqueda universal en el navbar que permita buscar:
- Solicitudes por cliente, ID, fecha
- Personal por nombre
- Eventos por banda

### 3. Exportar datos
Agregar botones para exportar información a:
- **Excel/CSV**: Para análisis en hojas de cálculo
- **PDF**: Para reportes imprimibles (órdenes de trabajo, listados)

### 4. Notificaciones en tiempo real
Implementar sistema de notificaciones push o WebSocket para:
- Nueva solicitud recibida
- Cambio de estado de una solicitud
- Recordatorios de eventos próximos

### 5. Calendario visual
Crear una vista de calendario (usando FullCalendar.js) para visualizar:
- Eventos confirmados
- Disponibilidad del salón
- Asignaciones de personal

### 6. Historial de cambios (Auditoría)
Registrar y mostrar un log de:
- Quién modificó cada solicitud
- Qué campos se cambiaron
- Fecha y hora de cada cambio

### 7. Configuración de notificaciones por email
Panel para configurar:
- Templates de emails
- Destinatarios automáticos
- Frecuencia de recordatorios

### 8. Modo oscuro/claro
Toggle para cambiar entre temas de color según preferencia del usuario.

### 9. Filtros avanzados y guardados
- Permitir guardar filtros personalizados
- Filtros por rango de precios
- Filtros combinados más complejos

### 10. Gestión de archivos adjuntos
- Subir comprobantes de pago
- Adjuntar contratos firmados
- Galería de fotos de eventos anteriores

