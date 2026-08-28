# TDC - Sistema de Gestión Total (Versión Beta)

Sistema de gestión para solicitudes de alquiler, servicios, talleres y fechas de bandas.

## ⚡ Desarrollo y Pruebas Rápido

Este proyecto usa **Docker Compose** para orquestar 3 servicios. Los puertos de acceso varían según dónde se levanta la copia del proyecto:

- **nginx** (frontend/proxy): expone el frontend en el host con `8080:80` en este servidor y puede variar si se levanta en otra máquina
- **backend** (Node.js/Express): escucha internamente en `3000`, pero se expone en el host según el contexto; en este servidor se usa `3001:3000`
- **mariadb** (base de datos): expone `3307:3306` en este servidor; también puede variar en otros entornos

> Importante: este repositorio se usa como copia de seguridad y como respaldo del equipo. Por eso la misma configuración puede ejecutarse en distintos hosts con puertos distintos. En este servidor se accede al frontend por `http://192.168.1.21:8080/` y el backend directo por `http://192.168.1.21:3001/`. En otro equipo local o en una réplica del proyecto, lo normal es usar `http://localhost:8080/` o `http://localhost:3001/` si mantiene el mismo mapeo de puertos.

### 🧩 Configuración de entorno único

Este proyecto debe usar un único archivo de configuración raíz: [.env](.env).

- La variable de entorno real es la del repositorio raíz.
- El archivo [docker/.env](docker/.env) se sincroniza como copia auxiliar para que Docker pueda leerlo, pero no debe editarse a mano ni considerarse la fuente de verdad.
- Si vas a activar o desactivar MP/WA/VNC, hacelo en [.env](.env) y luego reiniciá con los scripts.
- Los scripts [scripts/up.sh](scripts/up.sh), [scripts/reset.sh](scripts/reset.sh) y [scripts/restart.sh](scripts/restart.sh) ahora generan overrides temporales desde la raíz para evitar que un archivo desactualizado vuelva a levantar servicios externos.

> Regla: editá solo [.env](.env). Si un script necesita un override temporal, lo crea desde esa raíz y no desde [docker/.env](docker/.env).

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

### 🔌 Acceso rápido por entorno

```text
ENTORNO ACTUAL DEL SERVIDOR
- Frontend: http://192.168.1.21:8080/
- API vía nginx: http://192.168.1.21:8080/api
- Backend directo: http://192.168.1.21:3001/
- MariaDB: 192.168.1.21:3307

COPIA DE RESPALDO / EQUIPO DE DESARROLLO
- Frontend: http://localhost:8080/
- API vía nginx: http://localhost:8080/api
- Backend directo: http://localhost:3001/
- MariaDB: localhost:3307

NOTA
- Los servicios internos siguen siendo 80 (nginx), 3000 (Node.js) y 3306 (MariaDB).
- Los puertos del host cambian según el equipo donde se levanta la copia.
- El repositorio se usa como respaldo y como copia de trabajo; por eso siempre debe documentarse el entorno de despliegue.
```

### 📝 Flujo de Trabajo: Haciendo Cambios

#### 1️⃣ Cambios en HTML/CSS/JavaScript

```bash
# Edita archivos en frontend/ (ej: index.html, style.css, app.js)
# Cambios se aplican INMEDIATAMENTE sin necesidad de rebuild
# Solo recarga la página en el navegador con F5

# Ejemplo:
nano frontend/admin_usuarios.html   # Haz cambios
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
nano backend/controllers/authController.js

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
nano docker/nginx.conf

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

### 💡 Ejemplos de Flujo Completo

**Escenario 1: Arreglar Bug Pequeño en Frontend**
```bash
# 1. Edita el HTML/CSS
nano frontend/admin_usuarios.html

# 2. F5 en el navegador → cambios visibles al instante
```

**Escenario 2: Cambiar Lógica de Backend**
```bash
# 1. Edita el código
nano backend/controllers/usuariosController.js

# 2. Reinicia backend
./scripts/restart.sh --backend -v

# 3. Prueba en navegador o con curl
curl http://localhost/api/usuarios
```

**Escenario 3: Agregar Campo a Base de Datos**
```bash
# 1. Edita schema
nano database/01_schema.sql

# 2. Aplica cambio
./scripts/reset.sh --db

# 3. Verifica con PhpMyAdmin o cliente SQL
mysql -h localhost -u tdcuser -p tdc_development
SELECT * FROM usuarios;
```

**Escenario 4: Cambiar Configuración de nginx**
```bash
# 1. Edita configuración
nano docker/nginx.conf

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

## 📋 Características

- ✅ Gestión de solicitudes (alquiler, servicios, talleres, fechas de bandas)
- ✅ Panel de administración con confirmación y cambio de estado
- ✅ Agenda pública con eventos confirmados
- ✅ Autenticación con email (verificación requerida)
- ✅ Autenticación OAuth (Google, Facebook, Instagram)
- ✅ Base de datos con recovery desde binlogs

## 📚 Documentación

- [Lógica de Negocio](docs/LOGICA_NEGOCIO.md) — Reglas y flujos del sistema
- [Backup & Recovery](docs/BINLOG_STRATEGY.md) — Recuperación desde binlogs de MariaDB
- Scripts auxiliares en [scripts/](scripts/) — Diagnóstico, recuperación y optimización
