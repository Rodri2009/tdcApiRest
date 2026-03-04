# Flujo de Build y Copias de Archivos en Docker

## 📋 Proceso General

### 1. docker-compose.yml
**Contexto**: La raíz del proyecto (`..` desde /docker/)

```
Contexto build: /home/almacen/tdcApiRest/
├── backend/          ← Código fuente backend
├── database/         ← Scripts SQL
├── frontend/         ← Código fuente frontend  
├── scripts/          ← Scripts de entrypoint
└── docker/           ← Dockerfiles
    ├── Dockerfile.backend
    └── Dockerfile.nginx
```

---

## 🐳 CONTENEDOR: Backend (Node.js)

### Dockerfile: `docker/Dockerfile.backend`

**Proceso en orden**:

| Paso | Comando | Arquivos Copiados | Origen (Host) | Destino (Contenedor) | Propósito |
|------|---------|-------------------|---------------|----------------------|-----------|
| 1 | `COPY backend/package*.json ./` | package.json, package-lock.json | `/home/almacen/tdcApiRest/backend/` | `/app/` | Instalar dependencias |
| 2 | `RUN npm install` | (generado) | - | `/app/node_modules/` | Crear node_modules |
| 3 | `COPY backend /app` | TODO el backend | `/home/almacen/tdcApiRest/backend/` | `/app/` | Copiar código fuente |
| 4 | `COPY scripts/docker-entrypoint.sh /usr/local/bin/` | 1 archivo bash | `/home/almacen/tdcApiRest/scripts/` | `/usr/local/bin/docker-entrypoint.sh` | Script de entrada |

### Volúmenes Montados (runtime):

```yaml
volumes:
  - ../backend:/app                           # HOST → CONTENEDOR (bidireccional)
  - tdc_backend_node_modules:/app/node_modules # VOLUMEN PERSISTENTE
  - ../scripts:/app/scripts                   # HOST → CONTENEDOR (bidireccional)
```

**Efecto**: 
- El código se copia en el build PERO se sobrescribe en runtime con volúmenes
- Cambios en host (`../backend/`) se reflejan inmediatamente en contenedor sin rebuild
- `node_modules` en volumen persistente para optimizar builds futuros

---

## 🐳 CONTENEDOR: Nginx (Frontend Web Server)

### Dockerfile: `docker/Dockerfile.nginx`

| Paso | Comando | Archivos Copiados | Origen (Host) | Destino (Contenedor) | Propósito |
|------|---------|-------------------|---|---|---|
| 1 | `COPY frontend/ /usr/share/nginx/html` | **TODO el frontend (19.69MB)** | `/home/almacen/tdcApiRest/frontend/` | `/usr/share/nginx/html/` | Servir arquivos estáticos |
| 2 | `COPY docker/nginx.conf /etc/nginx/conf.d/` | nginx.conf | `/home/almacen/tdcApiRest/docker/` | `/etc/nginx/conf.d/default.conf` | Configuración Nginx |

### Volúmenes Montados (runtime):

```yaml
volumes:
  - ../frontend:/usr/share/nginx/html  # HOST → CONTENEDOR (bidireccional)
```

**Efecto**:
- Frontend se copia en el build (19.69MB)
- Se sobrescribe en runtime con volumen del host
- Cambios en frontend se ven instantáneamente sin rebuild

---

## 🐳 CONTENEDOR: MariaDB (Base de Datos)

### Service Config (sin Dockerfile, usa imagen oficial)

| Aspecto | Ruta Host | Ruta Contenedor | Tipo | Propósito |
|---------|-----------|-----------------|------|-----------|
| Schema | `/home/almacen/tdcApiRest/database/01_schema.sql` | `/docker-entrypoint-initdb.d/01_schema.sql` | Init Script | Crear tablas (ejecutado al primer start) |
| Seed Data | `/home/almacen/tdcApiRest/database/02_seed.sql` | `/docker-entrypoint-initdb.d/02_seed.sql` | Init Script | Insertar datos de configuración |
| Test Data | `/home/almacen/tdcApiRest/database/03_test_data.sql` | `/docker-entrypoint-initdb.d/03_test_data.sql` | Init Script | Insertar datos de prueba |
| Data Persist | - | `/var/lib/mysql/` | **Volumen** | Almacenar base de datos |
| Seeds Files | `/home/almacen/tdcApiRest/database/seeds/` | `/var/lib/mysql-files/` | Mount | Archivos para LOAD DATA INFILE |

### Volúmenes Persistentes:

```yaml
volumes:
  mariadb_data:          # Volumen nombrado Docker
    └─ /var/lib/mysql/  # Datos persisten entre restarts
```

**Flujo de Inicialización**:

1. ✅ Primer inicio: MariaDB ejecuta los scripts en orden alfabético
   - `01_schema.sql` → Crea estructura (DDL)
   - `02_seed.sql` → Inserta catálogos
   - `03_test_data.sql` → Inserta datos de prueba

2. ✅ Inicios posteriores: Usa volumen persistente, NO re-ejecuta scripts

---

## 📊 Resumen de Tamaños Transferidos

### Durante Build:

| Componente | Tamaño | Archivo/Directorio |
|-----------|--------|-------------------|
| **Backend Code** | 3.9MB | `backend/` |
| **Backend Dependencies** | 410 paquetes | Generado por npm install |
| **Frontend Code** | **19.69MB** | `frontend/` (COPIA COMPLETA) |
| **Scripts** | <1MB | `scripts/docker-entrypoint.sh` |
| **Database Scripts** | ~100KB | `database/*.sql` |
| **TOTAL** | **~24MB** | Para construir imágenes |

### Durante Runtime (Volúmenes):

| Volumen | Tamaño | Contenedor | Modificable |
|---------|--------|-----------|------------|
| `../backend:/app` | 3.9MB | backend-1 | ✅ SÍ - cambios reflejados |
| `tdc_backend_node_modules` | 410 paquetes | backend-1 | ⚠️ Temporal |
| `../frontend:/usr/share/nginx/html` | 19.69MB | nginx-1 | ✅ SÍ - cambios reflejados |
| `mariadb_data:/var/lib/mysql` | ~100MB (init) | mariadb-1 | ✅ Persistente |

---

## 🔄 Flujo Completo en Orden de Ejecución

```
1. Docker Compose inicia
   ↓
2. Build images (dockerfile)
   ├─ Backend:
   │  ├─ COPY backend/package*.json → /app/
   │  ├─ RUN npm install → /app/node_modules/
   │  ├─ COPY backend → /app/ (todo el código)
   │  └─ COPY scripts/docker-entrypoint.sh → /usr/local/bin/
   │
   └─ Nginx:
      ├─ COPY frontend/ → /usr/share/nginx/html/ (19.69MB)
      └─ COPY docker/nginx.conf → /etc/nginx/conf.d/

3. Crea network docker_default
   ↓
4. Inicia contenedores EN ORDEN:
   ├─ MariaDB:
   │  ├─ Monta volumen mariadb_data:/var/lib/mysql
   │  ├─ Copia scripts init (01,02,03.sql)
   │  ├─ Ejecuta en /docker-entrypoint-initdb.d/ en orden
   │  └─ Healthcheck: cada 10s por hasta 100s
   │
   ├─ Backend (espera healthcheck de MariaDB):
   │  ├─ Monta ../backend:/app (SOBRESCRIBE la copia del build)
   │  ├─ Monta ../scripts:/app/scripts
   │  ├─ Monta volumen tdc_backend_node_modules:/app/node_modules
   │  ├─ Ejecuta docker-entrypoint.sh
   │  │  └─ Verifica node_modules, npm install si falta
   │  └─ Inicia servidor: node server.js
   │
   └─ Nginx:
      ├─ Monta ../frontend:/usr/share/nginx/html (SOBRESCRIBE)
      └─ Inicia servidor Nginx

5. Sistema operativo:
   ✅ Backend listening en 0.0.0.0:3000
   ✅ Nginx listening en 0.0.0.0:80
   ✅ MariaDB listening en 0.0.0.0:3306
```

---

## ⚡ Puntos Clave

### 1️⃣ El Frontend se copia COMPLETAMENTE (19.69MB)
- En el Dockerfile: `COPY frontend/ /usr/share/nginx/html`
- Se incluye en la imagen Docker
- En runtime: Volumen lo sobrescribe

### 2️⃣ El Backend se copia PERO se sobrescribe
- En el Dockerfile: `COPY backend /app`
- En runtime: Volumen `../backend:/app` lo sobrescribe
- Cambios en host se reflejan sin rebuild

### 3️⃣ node_modules usa Volumen Persistente
- No se recopia en cada build
- Se reutiliza si la imagen no cambia
- Ahorra 400MB+ en rebuilds

### 4️⃣ Base de Datos se Inicializa UNA SOLA VEZ
- Scripts SQL copiados a `/docker-entrypoint-initdb.d/`
- Ejecutados solo en primera ejecución
- Datos persisten en volumen `mariadb_data`

### 5️⃣ Volúmenes Nombrados
- `mariadb_data`: Persiste entre restarts (real DB)
- `tdc_backend_node_modules`: Caché de dependencias

---

## 🔧 Instalación de Dependencias

### En tiempo de Build:

```dockerfile
# Dockerfile.backend
COPY backend/package*.json ./
RUN npm install           # Instala 410 paquetes en /app/node_modules/
```

### En tiempo de Runtime (Entrypoint):

```bash
# scripts/docker-entrypoint.sh
if [ ! -d node_modules ]; then
  npm install             # Instala si falta o volumen vacío
else
  echo "TODO OK"          # Usa las existentes
fi
```

**Motivo**: El volumen `tdc_backend_node_modules` puede estar vacío en primer init, así que el entrypoint garantiza que existan.

---

## 📌 Respuesta a tu pregunta

**Rutas de archivos que se copian durante build**:

```
HOST (Proyecto)                    →    CONTENEDOR BACKEND
├─ backend/                        →    /app/
├─ backend/package*.json           →    /app/package*.json
├─ scripts/docker-entrypoint.sh    →    /usr/local/bin/docker-entrypoint.sh
└─ No se copia aquí:
   ├─ database/SQL       (solo para MariaDB)
   └─ frontend/          (solo para Nginx)

HOST (Proyecto)                    →    CONTENEDOR NGINX
└─ frontend/                       →    /usr/share/nginx/html/
   └─ (19.69MB COMPLETAMENTE)

HOST (Proyecto)                    →    CONTENEDOR MARIADB
├─ database/01_schema.sql          →    /docker-entrypoint-initdb.d/
├─ database/02_seed.sql            →    /docker-entrypoint-initdb.d/
└─ database/03_test_data.sql       →    /docker-entrypoint-initdb.d/
```

El tamaño total transferido durante el build es **~24MB**, pero Docker necesita **mínimo 5-10GB libres** para construir e inicializar los contenedores.
