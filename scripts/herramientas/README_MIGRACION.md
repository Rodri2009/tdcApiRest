# Migración completa de TDC a un nuevo servidor

Este documento explica cómo usar el script `empacar_migracion.sh` para preparar el proyecto y trasladarlo a otro equipo Debian 13.

## Qué hace el script

El script crea un paquete con:

- el código del repositorio (sin `node_modules` ni `.git`)
- los perfiles Puppeteer de MercadoPago y WhatsApp:
  - `backend/profile/mp-profile`
  - `backend/profile/wa-profile`
- los datos persistentes de MariaDB desde los volúmenes Docker:
  - `mariadb_data`
  - `mariadb_binlogs`

## Requisitos en el servidor origen

- Docker instalado y funcionando
- Acceso al directorio del proyecto
- Permiso para ejecutar el script

## Uso del script en el servidor origen

1. Desde el repo raíz:

```bash
cd /home/almacen/tdcApiRest
chmod +x scripts/herramientas/empacar_migracion.sh
scripts/herramientas/empacar_migracion.sh
```

2. El script generará un directorio de salida en `/tmp`, por ejemplo:

```bash
/tmp/tdcApiRest-migracion-20260630-153000
```

3. Dentro estarán los archivos:

- `tdcApiRest-repo.tar.gz`
- `mp-profile.tar.gz`
- `wa-profile.tar.gz`
- `mariadb_data.tgz`
- `mariadb_binlogs.tgz`
- `tdcApiRest-migracion-*.tar.gz`

## Transferir al nuevo servidor

Copiá el paquete final y los archivos auxiliares al nuevo host. Por ejemplo:

```bash
scp /tmp/tdcApiRest-migracion-*.tar.gz usuario@nuevo-servidor:/tmp/
```

## Proceso en el nuevo servidor Debian 13

### 1. Instalar Docker y Docker Compose

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 2. Descomprimir el paquete

```bash
cd /tmp
tar -xzf tdcApiRest-migracion-*.tar.gz
```

### 3. Restaurar el repositorio

```bash
mkdir -p /home/almacen/tdcApiRest
cd /home/almacen/tdcApiRest
tar -xzf /tmp/tdcApiRest-repo.tar.gz
```

### 4. Restaurar los perfiles de Puppeteer

```bash
mkdir -p /home/almacen/tdcApiRest/backend/profile
cd /home/almacen/tdcApiRest/backend/profile
rm -rf mp-profile wa-profile
tar -xzf /tmp/mp-profile.tar.gz
tar -xzf /tmp/wa-profile.tar.gz
```

### 5. Crear y restaurar los volúmenes Docker

```bash
docker volume create mariadb_data
docker volume create mariadb_binlogs

docker run --rm -v mariadb_data:/volume -v /tmp:/backup alpine sh -c "cd /volume && tar xzf /backup/mariadb_data.tgz"

docker run --rm -v mariadb_binlogs:/volume -v /tmp:/backup alpine sh -c "cd /volume && tar xzf /backup/mariadb_binlogs.tgz"
```

### 6. Revisar y ajustar la configuración

1. Revisa `docker/.env` y `.env` en la raíz del repo.
2. Ajusta si es necesario:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `MARIADB_ROOT_PASSWORD`
   - `APP_URL`
   - `MP_SERVER_URL`
   - `WA_SERVER_URL`
   - `USER_DATA_DIR`
   - `WA_USER_DATA_DIR`
   - `JWT_SECRET`

### 7. Levantar la aplicación

```bash
cd /home/almacen/tdcApiRest/docker
docker compose up -d --build
```

### 8. Verificar el estado

```bash
docker compose ps
docker compose logs mariadb
docker compose logs backend
docker compose logs nginx
```

Comprueba que la aplicación responde en el puerto configurado.

## Notas importantes

- El script no copia `node_modules` ni `.git`, para mantener el paquete liviano.
- Si faltan los perfiles de Puppeteer, las sesiones de MP y WA se perderán.
- Si no se restauran correctamente los volúmenes de MariaDB, la base de datos no tendrá los datos previos.
- Si la nueva máquina usa rutas diferentes, actualizá `docker/.env` y `.env`.
- Si el paquete final no contiene los volúmenes, asegurate de que el host origen tenga los volúmenes creados y activos.

## ¿Qué hacer si algo falla?

- Revisa permisos de `/home/almacen/tdcApiRest/backend/profile`.
- Revisa que Docker esté corriendo.
- Revisa logs de los contenedores.
- Revisa que `docker compose` lea el archivo `docker/.env`.

---

Con esto tendrás el proyecto preparado para migrar a un nuevo servidor y mantener los datos y sesiones de MP/WA siempre que los archivos y volúmenes se restauren correctamente.