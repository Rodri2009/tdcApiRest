# TDC - Sistema de Gestión de Salones de Eventos

Este proyecto es la migración de una aplicación originalmente creada en Google Apps Script a una arquitectura moderna basada en Docker, con un backend de Node.js/Express y una base de datos MariaDB. El sistema permite a los clientes generar presupuestos y a los administradores gestionar las solicitudes.

## Arquitectura del Proyecto

-   **/backend**: Contiene el código fuente de la API RESTful (Node.js/Express).
    -   `/routes`: Define las rutas de la API.
    -   `/controllers`: Contiene la lógica de negocio.
    -   `/services`: Contiene servicios auxiliares, como el envío de emails.
-   **/frontend**: Contiene todos los archivos estáticos de la aplicación (HTML, CSS y JS del cliente).
-   **/docker**: Contiene los archivos de configuración de Docker.
    -   `docker-compose.yml`: Orquesta todos los servicios.
    -   `Dockerfile.*`: Define cómo construir las imágenes de los servicios.
-   **/database**: Contiene los scripts de inicialización de la base de datos.
    -   `schema.sql`: Crea la estructura de tablas.
    -   `seed.sql`: Carga los datos de configuración iniciales (semillas).
-   **/scripts**: Contiene scripts de utilidad, como la creación de usuarios administradores.
-   **/data_migration**: Carpeta local (ignorada por Git) para datos sensibles y scripts de migración de única vez.

---

## 🚀 Puesta en Marcha (Desde Cero)

Sigue estos pasos para clonar y ejecutar el proyecto por primera vez en un nuevo entorno (Debian/Ubuntu).

### Requisitos Previos

-   Git
-   Docker
-   Docker Compose

### 1. Clonar el Repositorio

```bash
git clone <URL_DE_TU_REPOSITORIO_EN_GIT>
cd <NOMBRE_DEL_DIRECTORIO_DEL_PROYECTO>
```

### 2. Configurar Variables de Entorno

El sistema necesita un archivo `.env` en la raíz del proyecto para funcionar. Este archivo **no está en Git** por seguridad.

**Crea el archivo `.env`:**
```bash
cp ejemplo.env .env
```
*(Nota: Se recomienda crear un archivo `ejemplo.env` en el repositorio con las claves pero sin los valores para facilitar este paso).*

**Abre el archivo `.env` y rellena los valores:**
```env
# Variables para el Backend y Docker Compose
PORT=3000

# Credenciales de la Base de Datos
DB_HOST=mariadb
DB_NAME=tdc_db
DB_USER=userPrincipal
DB_PASSWORD=passDelUserPrincipal

# Credenciales de MariaDB (usadas para la creación y el healthcheck)
MARIADB_DATABASE=tdc_db
MARIADB_USER=userPrincipal
MARIADB_PASSWORD=passDelUserPrincipal
MARIADB_ROOT_PASSWORD=passDelRoot

# Credenciales para el envío de Emails (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion_de_16_caracteres
EMAIL_ADMIN=email_destino_para_notificaciones@ejemplo.com

# Clave secreta para firmar los tokens de sesión (JWT)
JWT_SECRET=una_frase_secreta_muy_larga_y_aleatoria
```

### 3. Levantar el Entorno

Este proyecto incluye un script de arranque que valida la configuración y levanta todos los servicios.

**Dale permisos de ejecución al script (solo la primera vez):**
```bash
chmod +x up.sh
```

**Ejecuta el script:**
```bash
./up.sh
```
La primera vez que se ejecute, este script construirá las imágenes, creará los contenedores e inicializará la base de datos con las tablas y los datos de configuración.

### 4. Crear el Usuario Administrador (Solo la Primera Vez)

Después de que el entorno esté arriba, crea tu primer usuario para acceder al panel de administración.

**Instala las dependencias del script (solo la primera vez):**
```bash
npm install dotenv mariadb bcryptjs
```

**Ejecuta el script de creación:**
```bash
node scripts/crear-admin.js
```
Sigue las instrucciones en la terminal para introducir un email y una contraseña.

---

## 📚 Referencia de Comandos Docker Compose

Para una gestión avanzada, puedes usar estos comandos desde la raíz del proyecto.

-   **Ver el estado de los contenedores:**
    ```bash
    docker-compose -f docker/docker-compose.yml --env-file .env ps
    ```

-   **Ver los logs de un servicio en tiempo real (ej. `backend`):**
    ```bash
    docker-compose -f docker/docker-compose.yml --env-file .env logs -f backend
    ```

-   **Detener los servicios (conserva los datos):**
    ```bash
    docker-compose -f docker/docker-compose.yml --env-file .env stop
    ```

-   **Iniciar los servicios (si están detenidos):**
    ```bash
    docker-compose -f docker/docker-compose.yml --env-file .env start
    ```

-   **Reiniciar un servicio específico (ej. `backend`):**
    ```bash
    docker-compose -f docker/docker-compose.yml --env-file .env restart backend
    ```

-   **Abrir una terminal dentro de un contenedor (ej. `backend`):**
    ```bash
    docker-compose -f docker/docker-compose.yml --env-file .env exec backend sh
    ```

-   **Ejecutar una consulta SQL en la base de datos:**
    ```bash
    docker-compose -f docker/docker-compose.yml --env-file .env exec mariadb mariadb -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT * FROM solicitudes;"
    ```

-   **Destruir el entorno (contenedores y redes, pero CONSERVA los datos):**
    ```bash
    docker-compose -f docker/docker-compose.yml --env-file .env down
    ```

-   **DESTRUCCIÓN TOTAL (borra la base de datos y hace un backup previo):**
    ```bash
    ./down-and-backup.sh
    ```

---

## 🧪 Pruebas y Endpoints de la API

### Acceso a la Aplicación

-   **Página del Cliente:** `http://localhost/`
-   **Panel de Administración:** `http://localhost/login.html`

### Endpoints de la API

#### Autenticación (`/api/auth`)
-   `POST /login`: Inicia sesión.
-   `POST /logout`: Cierra sesión.

#### Opciones Generales (`/api/opciones`)
-   `GET /tipos-evento`: Devuelve la lista de tipos de evento.
-   `GET /tarifas`: Devuelve todas las reglas de precios.
-   `GET /duraciones`: Devuelve las duraciones por tipo de evento.
-   `GET /horarios`: Devuelve los horarios por tipo de evento.
-   `GET /fechas-ocupadas`: Devuelve las fechas confirmadas.
-   `GET /config`: Devuelve la configuración general.

#### Solicitudes (`/api/solicitudes`)
-   `POST /`: Crea una nueva solicitud.
-   `GET /sesion`: Busca una sesión activa por `fingerprintId`.
-   `GET /:id`: Obtiene los detalles de una solicitud.
-   `PUT /:id`: Actualiza los datos básicos de una solicitud.
-   `POST /:id/adicionales`: Guarda los adicionales para una solicitud.
-   `PUT /:id/finalizar`: Confirma una solicitud con los datos del cliente.

#### Administración (`/api/admin`) - **Protegido**
-   `GET /solicitudes`: Obtiene todas las solicitudes.
-   `PUT /solicitudes/:id/estado`: Actualiza el estado de una solicitud.
-   `DELETE /solicitudes/:id`: Elimina una solicitud.

### Pruebas desde la Terminal (usando `curl`)

-   **Probar el estado del backend:**
    ```bash
    curl http://localhost/api/status
    ```
-   **Probar el envío de email de prueba:**
    ```bash
    curl -X POST http://localhost/api/test/email
    ```
-   **Crear una nueva solicitud:**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"tipoEvento": "INFANTILES", "fechaEvento": "2025-12-25", ...}' http://localhost/api/solicitudes
    ```

---

## Dependencia adicional: uuid

El backend usa la librería `uuid` para generar identificadores únicos para tickets. Si al arrancar el servicio ves un error como `Cannot find package 'uuid'`, instala la dependencia desde la raíz del proyecto:

```bash
npm install uuid
# si tu proyecto es CommonJS y quieres compatibilidad con uuid v8:
npm install uuid@8
```

Si usas Docker/Compose, reconstruye la imagen del backend para que la dependencia quede incluida:

```bash
docker-compose -f docker/docker-compose.yml --env-file .env build --no-cache backend
docker-compose -f docker/docker-compose.yml --env-file .env up -d
```

---

## Requisitos del sistema

Antes de levantar el proyecto, asegúrate de tener instaladas estas herramientas en la máquina donde ejecutarás `./up.sh`:

- Docker (daemon en ejecución)
- Docker Compose (o el plugin `docker compose` incluido en versiones recientes de Docker)
- Node.js >= 14.0.0
- npm >= 6.0.0
- Un archivo `.env` en la raíz del repositorio con las variables de configuración

Ejemplos de instalación en Linux (Debian/Ubuntu):

```bash
# Docker (sigue la guía oficial si necesitas otra distribución):
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Node.js (usando NodeSource para versiones LTS, por ejemplo Node 18):
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifica versiones:
node --version
npm --version
```

### Reconstruir la imagen del backend y levantar los servicios

Si mueves el proyecto a otra máquina, asegúrate de reconstruir la imagen del backend para que las dependencias listadas en `backend/package.json` se instalen en la imagen y, si hace falta, en el contenedor durante el entrypoint:

```bash
# Desde la raíz del repositorio
docker-compose -f docker/docker-compose.yml --env-file .env build --no-cache backend
docker-compose -f docker/docker-compose.yml --env-file .env up -d

# Ver logs del backend
docker-compose -f docker/docker-compose.yml --env-file .env logs -f backend
```

El `Dockerfile.backend` incluye un entrypoint que ejecuta `npm install` dentro del contenedor si detecta que faltan `node_modules` o paquetes críticos como `uuid`. Esto garantiza que, incluso si no instalas dependencias en el host, el contenedor intentará instalar lo necesario en runtime.

---

## Scripts de backup e import

En `scripts/` hay dos utilidades para manejar backups SQL de la base de datos:

- `scripts/backup_and_stop.sh`: crea un dump timestamped de la base de datos (en `backups/<ts>/`) y luego detiene los contenedores.
- `scripts/import_sqls.sh`: busca archivos `.sql` en `backups/` (recursivo) e intenta importarlos en la base de datos; los movidos a `backups/imported/` o `backups/failed/` según el resultado.

Uso típico:

```bash
# Crear backup y detener contenedores
chmod +x scripts/backup_and_stop.sh
./scripts/backup_and_stop.sh

# Importar SQLs detectados
chmod +x scripts/import_sqls.sh
./scripts/import_sqls.sh
```

Nota: ambos scripts leen las variables del archivo `.env` para obtener credenciales y el nombre de la base de datos. Asegúrate de que `.env` exista en la raíz del repo.