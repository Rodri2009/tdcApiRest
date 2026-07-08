# TDC - Sistema de Gestión Total (Versión Beta)

Sistema de gestión para solicitudes de alquiler, servicios, talleres y fechas de bandas.

## ⚡ Desarrollo y Pruebas Rápido

Este proyecto usa **Docker Compose** para orquestar 3 servicios:
- **nginx** (frontend/proxy): Puerto 80/443
- **backend** (Node.js/Express): Puerto 3000
- **mariadb** (base de datos): Puerto 3306

### 🚀 Inicio Rápido

```bash
# Levanta todo desde cero
./scripts/up.sh

# Reinicia solo el backend (cambios rápidos en código)
./scripts/restart.sh --backend

# Reinicia solo frontend (cambios en HTML/CSS/JS)
./scripts/restart.sh --frontend

# Reinicia BD (cambios en schema)
./scripts/restart.sh --db
```

**URLs de desarrollo:**
- Frontend: http://localhost
- API: http://localhost/api
- PhpMyAdmin (si está en docker-compose): http://localhost:8080

### 📝 Flujo de Trabajo: Haciendo Cambios

#### 1️⃣ Cambios en HTML/CSS/JavaScript

```bash
# Edita archivos en frontend/ (ej: index.html, style.css, app.js)
# Cambios se aplican INMEDIATAMENTE sin necesidad de rebuild
# Solo recarga la página en el navegador con F5

# Ejemplo:
vim frontend/admin_usuarios.html   # Haz cambios
# En navegador: F5 o Ctrl+Shift+R (hard refresh)
```

**¿Por qué es rápido?** El frontend está montado como volumen en nginx:
```yaml
volumes:
  - ../frontend:/usr/share/nginx/html  # Cambios en vivo
  - ../docker/nginx.conf:/etc/nginx/conf.d/default.conf  # Recarga inmediata
```

#### 2️⃣ Cambios en Backend (Node.js)

```bash
# Edita archivos en backend/ (ej: controllers/, routes/, services/)
vim backend/controllers/authController.js

# Reinicia el contenedor para que cargue los cambios
./scripts/restart.sh --backend

# Logs en tiempo real:
docker-compose -f docker/docker-compose.yml logs -f backend
```

**Con debugging:**
```bash
./scripts/restart.sh --backend -d    # debug detallado
./scripts/restart.sh --backend -v    # verbose (procesamiento)
./scripts/restart.sh --backend -e    # solo errores
```

#### 3️⃣ Cambios en Configuración de nginx

```bash
# Edita configuración de Nginx
vim docker/nginx.conf

# Recarga (sin rebuild):
docker-compose -f docker/docker-compose.yml restart nginx

# Ya no necesita rebuild porque nginx.conf está montado como volumen
```

**Antes (necesitaba rebuild):**
```bash
docker-compose down nginx && \
docker-compose build --no-cache nginx && \
docker-compose up -d nginx
```

**Ahora (solo restart):**
```bash
./scripts/restart.sh --frontend
```

#### 4️⃣ Cambios en Base de Datos

```bash
# Edita schema en database/01_schema.sql o agrega migración

# Reinicia BD y recarga datos
./scripts/reset.sh --db

# O sin datos de prueba (solo schema + seed):
./scripts/reset.sh --db --skip-test

# Opciones de SQL:
./scripts/reset.sh --db --only-schema    # solo estructura
./scripts/reset.sh --db --only-seed      # solo datos base
./scripts/reset.sh --db --only-test      # solo datos de prueba
```

### 🔧 Scripts Principales

#### `./scripts/up.sh` — Inicia el Proyecto

```bash
# Uso básico
./scripts/up.sh

# Con rebuild de imágenes (lento, ~30 min)
./scripts/up.sh --rebuild

# Aplicar migraciones después de levantar
./scripts/up.sh --migrate

# Con debug detallado
./scripts/up.sh -d

# Habilitar servicios opcionales (Mercado Pago, WhatsApp)
./scripts/up.sh --mp --wa

# Combinados
./scripts/up.sh --migrate -d --mp
```

#### `./scripts/restart.sh` — Reinicia Contenedores Específicos

```bash
# Reinicia solo backend (defecto)
./scripts/restart.sh

# Reinicia frontend (nginx)
./scripts/restart.sh --frontend

# Reinicia BD
./scripts/restart.sh --db

# Múltiples contenedores
./scripts/restart.sh --backend --frontend

# Con rebuild de imagen
./scripts/restart.sh --backend --rebuild

# Con down previo (limpia volúmenes intermedios)
./scripts/restart.sh --backend --down --rebuild

# Con debug
./scripts/restart.sh --backend -d      # debug full
./scripts/restart.sh --backend -v      # solo verbose
./scripts/restart.sh --backend -e      # solo errores
```

#### `./scripts/reset.sh` — Reinicia BD y Datos

```bash
# Reset completo (todos contenedores + BD)
./scripts/reset.sh

# Solo la base de datos
./scripts/reset.sh --db

# Solo backend o frontend
./scripts/reset.sh --backend
./scripts/reset.sh --frontend

# Reconstruir imágenes y reiniciar
./scripts/reset.sh --all-rebuild

# Opciones de datos SQL:
./scripts/reset.sh --db --no-sql        # no ejecuta SQL
./scripts/reset.sh --db --skip-test     # sin datos de prueba
./scripts/reset.sh --db --only-schema   # solo estructura
./scripts/reset.sh --db --only-seed     # solo datos base

# Restaurar desde dump anterior
./scripts/reset.sh --use-latest-dump

# Con debug
./scripts/reset.sh -d

# Habilitar servicios Puppeteer (MP, WhatsApp)
./scripts/reset.sh --db --mp --wa --save-mp --save-wa
```

#### `./scripts/log.sh` — Ver Logs en Tiempo Real

```bash
# Logs de todos los servicios
docker-compose -f docker/docker-compose.yml logs -f

# Solo backend
docker-compose -f docker/docker-compose.yml logs -f backend

# Solo BD
docker-compose -f docker/docker-compose.yml logs -f mariadb

# Últimas 100 líneas
docker-compose -f docker/docker-compose.yml logs --tail=100 backend
```

### 💡 Ejemplos de Flujo Completo

**Escenario 1: Arreglar Bug Pequeño en Frontend**
```bash
# 1. Edita el HTML/CSS
vim frontend/admin_usuarios.html

# 2. F5 en el navegador → cambios visibles al instante
```

**Escenario 2: Cambiar Lógica de Backend**
```bash
# 1. Edita el código
vim backend/controllers/usuariosController.js

# 2. Reinicia backend
./scripts/restart.sh --backend -v

# 3. Prueba en navegador o con curl
curl http://localhost/api/usuarios
```

**Escenario 3: Agregar Campo a Base de Datos**
```bash
# 1. Edita schema
vim database/01_schema.sql

# 2. Aplica cambio
./scripts/reset.sh --db

# 3. Verifica con PhpMyAdmin o cliente SQL
mysql -h localhost -u tdcuser -p tdc_development
SELECT * FROM usuarios;
```

**Escenario 4: Cambiar Configuración de nginx**
```bash
# 1. Edita configuración
vim docker/nginx.conf

# 2. Recarga (sin rebuild, gracias al volumen montado)
./scripts/restart.sh --frontend

# 3. Verifica en navegador
curl -v http://localhost/missingpage  # Verifica redirects, etc.
```

### 📊 Estructura de Volúmenes (Importante)

Los volúmenes permiten cambios en vivo sin reconstruir imágenes:

```yaml
# Frontend - cambios inmediatos al editar archivos
../frontend:/usr/share/nginx/html

# Configuración nginx - carga sin reconstruir
../docker/nginx.conf:/etc/nginx/conf.d/default.conf

# Backend código - requiere restart del contenedor
../backend:/app

# DB data - persiste entre restarts
mariadb_data:/var/lib/mysql

# node_modules - separado para acelerar builds
tdc_backend_node_modules:/app/node_modules
```

---

## Qué hace
- Permite crear y gestionar solicitudes desde el frontend
- Administra y confirma solicitudes desde el panel de administración
- Publica eventos confirmados en la agenda
- Controla visibilidad de solicitudes públicas

## Requisitos
- Docker y Docker Compose
- Archivo `.env` en la raíz del proyecto

## Puesta en marcha

```bash
git clone <repo-url>
cd tdcApiRest
cp .env.example .env
# Editar .env con tus valores
./scripts/up.sh
```

**URLs:**
- Frontend: http://localhost
- API: http://localhost/api

## Scripts principales

| Script | Descripción |
|--------|-------------|
| `./scripts/up.sh` | Levanta todos los servicios |
| `./scripts/restart.sh` | Reinicia contenedores específicos |
| `./scripts/reset.sh` | Reinstala la BD y carga datos de prueba |
| `./scripts/recuperacion/recuperar_desde_binlog.sh` | Recupera la BD usando binlogs |

## Otros scripts

- `scripts/diagnostico/` — Herramientas para validar el estado del sistema.
  - `README.md` — Descripción de los scripts de diagnóstico.
  - `verify_seed_data.sh` — Verifica integridad de los datos semilla.
  - `test_fase2_scanner.js` — Prueba manual del flujo de escaneo/validación de tickets.
- `scripts/infraestructura/` — Scripts de soporte para infraestructura y mantenimiento.
  - `README.md` — Guía de uso interna para estos scripts.
  - `backup_project.sh` — Copia de seguridad del proyecto.
  - `docker_entrypoint.sh` — Entrada personalizada para Docker.
  - `restart_backend.sh` — Reinicia el backend con opciones avanzadas.
- `scripts/herramientas/` — Utilidades auxiliares.
  - `README.md` — Descripción de las herramientas disponibles.
- `scripts/optimizacion/` — Scripts relacionados con optimización y ajustes.
  - `README.md` — Documentación de optimización.
- `scripts/persistencia_de_perfiles/` — Gestión de perfiles de usuario y configuración.
  - `GUIA_RAPIDA.md` — Guía de uso rápido para perfiles.
  - `share_profile.sh` — Script para compartir perfiles.
- `scripts/recuperacion/` — Recuperación y restauración de bases de datos.
  - `recuperar_desde_binlog.sh` — Recupera datos desde binlogs de MariaDB.

## Arquitectura

- `nginx` sirve el frontend y hace proxy al backend
- `backend` es Node.js/Express en el puerto `3000`
- `mariadb` es la base de datos en el puerto `3306`

## Backup y recovery

La aplicación usa binlogs de MariaDB para recovery. La documentación está en:
- `docs/ESTRATEGIA_BINLOG.md`

## Documentación útil

- `docs/LOGICA_NEGOCIO.md`

## Cambios relevantes

- La tabla principal de eventos es `eventos_confirmados`
- Las referencias a `eventos` fueron actualizadas
- Esta versión está en beta y es funcional

## Reiniciar contenedores

```bash
./scripts/restart.sh --backend
./scripts/restart.sh --frontend
./scripts/restart.sh --db
```

## Estructura general

- `backend/` — API y lógica del servidor
- `frontend/` — interfaces web
- `database/` — esquema y datos de prueba
- `docker/` — orquestación de contenedores
- `docs/` — documentación del proyecto

## Endpoints básicos

- `GET /api/solicitudes`
- `POST /api/solicitudes`
- `GET /api/solicitudes/:id`
- `PUT /api/solicitudes/:id`
- `GET /api/admin/solicitudes`
- `PUT /api/admin/solicitudes/:id/estado`
