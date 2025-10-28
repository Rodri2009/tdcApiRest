#!/bin/bash

#
# Script para restaurar datos sensibles si existe un backup.
# Se ejecuta DENTRO del contenedor de MariaDB al inicio.
#

set -e # Termina el script si un comando falla

BACKUP_FILE="/var/lib/mysql-files/datos_sensibles_backup.sql"

# Comprobamos si el archivo de backup existe DENTRO del contenedor
if [ -f "$BACKUP_FILE" ]; then
    echo "--- Encontrado backup de datos sensibles. Restaurando... ---"
    
    # Usamos las variables de entorno que el contenedor de MariaDB ya tiene
    mysql -u "$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE" < "$BACKUP_FILE"
    
    echo "--- ✅ Restauración de datos sensibles completada. ---"
else
    echo "--- No se encontró backup de datos sensibles. Continuando con una base de datos limpia (solo con datos semilla). ---"
fi