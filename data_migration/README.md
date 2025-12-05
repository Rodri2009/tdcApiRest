# Carpeta de Migración y Gestión de Datos (`data_migration`)

**ADVERTENCIA:** Esta carpeta está **excluida del repositorio de Git** a través del archivo `.gitignore`. Su contenido es para uso local, tareas de única vez y gestión de datos sensibles que no deben ser versionados.

## Propósito

Esta carpeta contiene los archivos CSV originales exportados de Google Sheets y scripts de Node.js diseñados para realizar dos tareas principales:

1.  **Migración Inicial:** Procesar los datos crudos de los CSVs para la carga inicial en la base de datos (un proceso que ya se ha completado).
2.  **Gestión de Datos Sensibles:** Crear y manejar backups de los datos de clientes (solicitudes, etc.) para poder transportarlos entre diferentes entornos de desarrollo (ej. del trabajo a casa) sin comprometer la seguridad.

---

## Descripción de Archivos

### Archivos de Datos (CSVs)

Estos son los datos en crudo exportados de la hoja de cálculo original.

-   `Opciones_Duracion.csv`: Formato original de las duraciones (pivotado).
-   `Solicitudes.csv`: Contiene los datos sensibles de las solicitudes de los clientes.
-   `Solicitudes_Adicionales.csv`: Contiene los datos sensibles de los adicionales por solicitud.
-   `Solicitudes_Personal.csv`: Contiene los datos sensibles de la asignación de personal.

### Scripts de Node.js

Estos scripts requieren Node.js y las dependencias listadas en `package.json` (`npm install`).

-   **`restructure_duracion.js`**:
    -   **Propósito:** Script de única vez usado durante la migración inicial.
    -   **Función:** Lee `Opciones_Duracion.csv` (que tiene un formato de tabla pivotada) y lo convierte en `opciones_duracion_restructured.csv`, un formato de tabla larga (despivotada) adecuado para una base de datos relacional.
    -   **Estado:** **Obsoleto.** Ya no es necesario ejecutarlo a menos que se necesite reprocesar los datos originales.

-   **`generate_sensitive_dump.js`**:
    -   **Propósito:** **Herramienta principal para crear backups de los datos sensibles.**
    -   **Función:** Lee los archivos CSV de datos sensibles (`Solicitudes.csv`, etc.), los procesa, y genera un único archivo `.sql` (`datos_sensibles_backup.sql`) que contiene todas las sentencias `INSERT` necesarias para recrear esos datos. El archivo de salida se guarda en el Escritorio por defecto.
    -   **Uso:** Ejecutar `node generate_sensitive_dump.js` para crear un nuevo backup.

-   `import_sensitive_data.js` (si lo creaste):
    -   **Propósito:** Método alternativo para importar datos.
    -   **Función:** Se conectaría directamente a la base de datos en ejecución para insertar los datos de los CSVs sensibles.
    -   **Estado:** **Obsoleto.** Se ha reemplazado por el método más robusto de generar un dump con `generate_sensitive_dump.js` e importarlo a través de Docker.

### Archivos de Salida

-   `datos_sensibles_backup.sql`:
    -   **¡Este es el archivo importante!**
    -   **Contenido:** Un volcado SQL con todos los datos de las tablas sensibles.
    -   **Uso:** Este es el archivo que debes transportar (en un pendrive, Google Drive, etc.) a tu otro entorno de desarrollo. **NUNCA DEBE SUBIRSE A GIT.**

### Otros Archivos

-   `package.json`, `package-lock.json`, `node_modules/`:
    -   **Propósito:** Definen y contienen las dependencias de Node.js (`csv-parser`, `csv-writer`, `mariadb`) necesarias para que los scripts de esta carpeta funcionen.

---

## Flujo de Trabajo para Manejar Datos Sensibles

### Para Crear un Backup (Exportar)

1.  Asegúrate de que los archivos CSV sensibles (`Solicitudes.csv`, etc.) estén actualizados en esta carpeta.
2.  Desde el directorio raíz del proyecto (`tdc-app/`), ejecuta:
    ```bash
    node data_migration/generate_sensitive_dump.js
    ```
3.  Busca el archivo `datos_sensibles_backup.sql` en tu Escritorio.
4.  Transporta este archivo de forma segura.

### Para Restaurar un Backup (Importar)

1.  Copia el archivo `datos_sensibles_backup.sql` a tu máquina (por ejemplo, a la raíz del proyecto `tdc-app/`).
2.  Asegúrate de que los contenedores de Docker estén en ejecución (`docker-compose up -d`).
3.  Desde el directorio raíz del proyecto, ejecuta:
    ```bash
    docker-compose -f docker/docker-compose.yml exec -T mariadb mariadb -u tu_usuario -p'tu_contraseña' tu_db < datos_sensibles_backup.sql
    ```
    (Reemplaza las credenciales si son diferentes).