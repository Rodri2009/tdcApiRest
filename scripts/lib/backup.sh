#!/bin/bash

# backup.sh - Toda la lógica de backups

# Directorio donde se almacenarán los backups (por defecto, dentro del proyecto)
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"

# Función para crear un backup de la base de datos
backup_database() {
    local db_name="$1"
    local db_user="$2"
    local db_password="$3"
    local db_host="${4:-localhost}"
    local db_port="${5:-3306}"
    local backup_file="$6"  # Si se proporciona, se usa ese nombre; sino, se genera uno

    # Crear el directorio de backups si no existe
    mkdir -p "$BACKUP_DIR"

    # Si no se proporciona un nombre de archivo, generar uno con timestamp
    if [ -z "$backup_file" ]; then
        backup_file="$BACKUP_DIR/${db_name}_backup_$(date +%Y%m%d_%H%M%S).sql"
    fi

    # Construir el comando mysqldump
    local dump_cmd="mysqldump -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        dump_cmd="$dump_cmd -p$db_password"
    fi
    dump_cmd="$dump_cmd $db_name"

    # Ejecutar el dump y guardar en el archivo
    $dump_cmd > "$backup_file"

    # Comprobar si el comando tuvo éxito
    if [ $? -eq 0 ]; then
        echo "Backup de la base de datos creado en: $backup_file"
        # Opcional: comprimir el backup
        # gzip "$backup_file"
        return 0
    else
        echo "Error: Falló el backup de la base de datos" >&2
        return 1
    fi
}

# Función para restaurar un backup de la base de datos
restore_database() {
    local backup_file="$1"
    local db_name="$2"
    local db_user="$3"
    local db_password="$4"
    local db_host="${5:-localhost}"
    local db_port="${6:-3306}"

    # Comprobar que el archivo de backup existe
    if [ ! -f "$backup_file" ]; then
        echo "Error: El archivo de backup $backup_file no existe" >&2
        return 1
    fi

    # Construir el comando mysql para restaurar
    local restore_cmd="mysql -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        restore_cmd="$restore_cmd -p$db_password"
    fi
    restore_cmd="$restore_cmd $db_name"

    # Si el archivo está comprimido, descomprimirlo al vuelo
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | $restore_cmd
    else
        $restore_cmd < "$backup_file"
    fi

    # Comprobar si el comando tuvo éxito
    if [ $? -eq 0 ]; then
        echo "Base de datos restaurada desde: $backup_file"
        return 0
    else
        echo "Error: Falló la restauración de la base de datos" >&2
        return 1
    fi
}

# Función para hacer backup de los perfiles (por ejemplo, de puppeteer)
backup_profiles() {
    local profile_dir="$1"  # Directorio de perfiles a respaldar (ej: backend/profile)
    local backup_name="$2"  # Nombre base para el backup (ej: mp-profile)

    # Crear el directorio de backups si no existe
    mkdir -p "$BACKUP_DIR"

    # Nombre del archivo de backup con timestamp
    local backup_file="$BACKUP_DIR/${backup_name}_backup_$(date +%Y%m%d_%H%M%S).tar.gz"

    # Crear el backup comprimido
    tar -czf "$backup_file" -C "$(dirname "$profile_dir")" "$(basename "$profile_dir")"

    if [ $? -eq 0 ]; then
        echo "Backup de perfiles creado en: $backup_file"
        return 0
    else
        echo "Error: Falló el backup de los perfiles" >&2
        return 1
    fi
}

# Función para restaurar los perfiles desde un backup
restore_profiles() {
    local backup_file="$1"  # Archivo de backup a restaurar
    local profile_dir="$2"  # Directorio donde se restaurarán los perfiles (ej: backend/profile)

    # Comprobar que el archivo de backup existe
    if [ ! -f "$backup_file" ]; then
        echo "Error: El archivo de backup $backup_file no existe" >&2
        return 1
    fi

    # Asegurarse de que el directorio de destino exista
    mkdir -p "$profile_dir"

    # Extraer el backup en el directorio de destino
    tar -xzf "$backup_file" -C "$profile_dir"

    if [ $? -eq 0 ]; then
        echo "Perfiles restaurados desde: $backup_file"
        return 0
    else
        echo "Error: Falló la restauración de los perfiles" >&2
        return 1
    fi
}

# Función para limpiar backups antiguos (mantener solo los N más recientes)
cleanup_backup() {
    local max_count="${1:-10}"  # Por defecto, mantener los 10 más recientes
    local backup_pattern="${2:-*.sql}"  # Patrón de archivos a considerar (por defecto, .sql)

    # Asegurarse de que el directorio de backups existe
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "Directorio de backups no encontrado: $BACKUP_DIR"
        return 0
    fi

    # Listar los archivos de backup ordenados por fecha (más reciente primero) y eliminar los excedentes
    ls -1t "$BACKUP_DIR/$backup_pattern" 2>/dev/null | tail -n +$((max_count+1)) | while read -r backup_file; do
        if [ -n "$backup_file" ]; then
            rm -f "$backup_file"
            echo "Backup antiguo eliminado: $backup_file"
        fi
    done
}

# Exportar funciones para que estén disponibles en los scripts que importen este archivo
export -f backup_database restore_database backup_profiles restore_profiles cleanup_backup