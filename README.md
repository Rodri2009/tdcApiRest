# TDC - Sistema de Gestión de Salones de Eventos

Este proyecto es la migración de una aplicación originalmente creada en Google Apps Script a una arquitectura moderna basada en Docker, Node.js, Express.js y MariaDB.

## Requisitos Previos

Para ejecutar este proyecto en un nuevo entorno (como Debian 12/13), necesitarás tener instalado lo siguiente:

1.  **Git:** Para clonar el repositorio.
2.  **Docker:** Para gestionar los contenedores de la aplicación.
3.  **Docker Compose:** Para orquestar los servicios de Docker.

*Nota: Las instrucciones de instalación para Docker y Docker Compose en sistemas Debian/Ubuntu están detalladas en la sección de "Instalación por Primera Vez".*

---

## Puesta en Marcha (Desde Cero)
Sigue estos pasos para clonar y ejecutar el proyecto por primera vez.

### 1. Clonar el Repositorio
Abre una terminal y clona el proyecto desde GitHub:
```bash
git clone <URL_DE_TU_REPOSITORIO_EN_GITHU>
cd <NOMBRE_DEL_DIRECTORIO_DEL_PROYECTO>
```

### 2. Configurar Variables de Entorno
Crea el archivo backend/.env con el siguiente contenido:
```js
PORT=3000
DB_HOST=mariadb
DB_USER=rodrigo
DB_PASSWORD=desa8102test
DB_NAME=tdc_db
```

### 3. Levantar los Contenedores
Este comando hará todo: construirá las imágenes, creará los contenedores, y la primera vez que se ejecute, inicializará la base de datos con las tablas y los datos semilla.
```bash
docker-compose -f docker/docker-compose.yml up --build -d
```
    Docker ve que no hay un volumen de base de datos (mariadb_data).
    Crea un contenedor de MariaDB desde cero.
    El contenedor de MariaDB encuentra los scripts en /docker-entrypoint-initdb.d.
    Ejecuta 1_schema.sql, creando todas tus tablas.
    Ejecuta 2_seed.sql, llenando tus tablas de configuración con los datos de los CSV (semillas).
    Levanta los contenedores de backend y nginx.

Verificar los logs del contenedor de MariaDB:
```bash
docker-compose -f docker/docker-compose.yml logs mariadb
```
si por algun motivo no fncionó, primero hay que bajar los volumenes con este comando:
```bash
docker-compose -f docker/docker-compose.yml down --volumes
```

### 4. Inicializar la Base de Datos (Solo la primera vez)
Después de levantar los contenedores por primera vez, la base de datos estará vacía. Ejecuta el siguiente comando para crear todas las tablas necesarias:
```bash
docker-compose -f docker/docker-compose.yml exec -T mariadb mariadb -u rodrigo -pdesa8102test tdc_db < database/schema.sql
```



Referencia de Comandos Docker Compose
Todos los comandos deben ejecutarse desde el directorio raíz del proyecto (donde se encuentra la carpeta docker/). El flag -f docker/docker-compose.yml es necesario porque nuestro archivo de configuración no está en la raíz, sino en la carpeta docker/.

1. Puesta en Marcha y Ciclo de Vida
docker-compose -f docker/docker-compose.yml up --build -d
    Este es el comando principal para iniciar la aplicación desde cero.
    up: Crea y levanta los contenedores, redes y volúmenes definidos en el archivo.
    --build: Fuerza la reconstrucción de las imágenes de Docker. Es esencial usarlo la primera vez o después de haber hecho cambios en un Dockerfile (ej. al añadir dependencias del sistema).
    -d (o --detach): Ejecuta los contenedores en "modo detached" (en segundo plano). Esto libera tu terminal para que puedas seguir usándola. Si no usas -d, los logs de todos los servicios se mostrarán directamente en tu terminal y se detendrán si cierras la ventana.
    ¿Cuándo usarlo?
    La primera vez que clonas el proyecto en una nueva máquina.
    Después de hacer cambios en un Dockerfile.
    Después de hacer cambios en el docker-compose.yml que afecten la construcción de una imagen.

2. Monitoreo y Depuración
docker-compose -f docker/docker-compose.yml ps
    Muestra el estado de todos los contenedores asociados a tu proyecto.
    ps (Process Status): Te permite ver rápidamente qué servicios están en ejecución (Up), detenidos (Exited), o en qué puertos están escuchando.
    ¿Cuándo usarlo?
    Para verificar rápidamente si todos los servicios se iniciaron correctamente.
    Para ver si algún contenedor ha fallado y se ha detenido inesperadamente.
docker-compose -f docker/docker-compose.yml logs -f [nombre-del-servicio]
    Muestra los logs (la salida de la consola) de uno o todos los servicios. Es tu herramienta de depuración más importante.
    logs: Recupera los logs de los contenedores.
    -f (o --follow): Sigue los logs en tiempo real. La terminal se quedará "enganchada" mostrando las nuevas líneas a medida que se generan. Presiona Ctrl + C para salir.
    [nombre-del-servicio] (opcional): Especifica de qué servicio quieres ver los logs (ej. backend, nginx, mariadb). Si no lo especificas, verás los logs de todos los servicios mezclados.
    ¿Cuándo usarlo?
    Cuando el backend falla al iniciar para ver el mensaje de error.
    Para ver las peticiones que llegan en tiempo real (GET /api/...).
    Para depurar errores de conexión a la base de datos.

3. Gestión Diaria
docker-compose -f docker/docker-compose.yml stop y start
stop: Detiene los contenedores en ejecución sin eliminarlos. Su estado y los datos en los volúmenes se conservan.
start: Inicia los contenedores que fueron previamente detenidos.
¿Cuándo usarlo?
Usa stop al final del día para liberar recursos (RAM, CPU) sin perder nada.
Usa start al día siguiente para continuar trabajando rápidamente, ya que no necesita reconstruir nada.
docker-compose -f docker/docker-compose.yml restart [nombre-del-servicio]
Detiene y vuelve a iniciar inmediatamente uno o más servicios.
restart: Un atajo para stop seguido de start.
¿Cuándo usarlo?
Es muy útil durante el desarrollo. Como montamos el código del backend con un volumen, si haces un cambio en un archivo .js, simplemente ejecutas docker-compose -f docker/docker-compose.yml restart backend para que el servidor Node.js se reinicie y cargue tus cambios.

4. Limpieza y Re-inicialización
docker-compose -f docker/docker-compose.yml down
Detiene y elimina los contenedores y las redes creadas por up.
down: Es la forma limpia de apagar completamente el entorno. No elimina los volúmenes nombrados (como mariadb_data) por defecto, por lo que tus datos de la base de datos persistirán.
¿Cuándo usarlo?
Cuando quieres asegurarte de que todo está limpio antes de volver a levantar el entorno con up.
docker-compose -f docker/docker-compose.yml down --volumes
Hace lo mismo que down, pero además elimina los volúmenes nombrados.
--volumes: Le dice a Docker que borre el volumen mariadb_data.
¿Cuándo usarlo?
¡Este es el botón de reinicio total! Úsalo cuando quieras borrar completamente la base de datos para forzar la re-ejecución de los scripts de inicialización (1_schema.sql y 2_seed.sql) en el próximo up. Es perfecto para simular una instalación desde cero.

5. Comandos Avanzados
docker-compose -f docker/docker-compose.yml exec -T mariadb ...
Ejecuta un comando dentro de un contenedor que ya está en ejecución.
exec: Permite "entrar" a un contenedor para realizar tareas.
-T: Deshabilita la asignación de una pseudo-TTY. Es necesario cuando estás redirigiendo la entrada de un archivo, como hicimos con < database/schema.sql.
mariadb: El nombre del servicio en el que quieres ejecutar el comando.
...: El comando a ejecutar (ej. mariadb -u..., o bash para obtener una terminal interactiva).
¿Cuándo usarlo?
Para ejecutar manualmente scripts SQL.
Para abrir una terminal dentro de un contenedor (docker-compose exec backend sh) y explorar su sistema de archivos o ejecutar comandos de depuración.




