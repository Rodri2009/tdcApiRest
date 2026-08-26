#!/bin/bash

# mysql.sh - Toda la lógica SQL

# Función para verificar que los archivos SQL existan
verify_sql_files() {
    local sql_dir="$1"
    shift
    local sql_files=("$@")
    for sql_file in "${sql_files[@]}"; do
        if [ ! -f "$sql_dir/$sql_file" ]; then
            echo "Error: El archivo SQL $sql_file no existe en $sql_dir"
            return 1
        fi
    done
    return 0
}

# Función para crear la base de datos
create_database() {
    local db_name="$1"
    local db_user="$2"
    local db_password="$3"
    local db_host="${4:-localhost}"
    local db_port="${5:-3306}"

    # Si se proporciona una contraseña, usarla; de lo contrario, intentar sin ella
    local mysql_cmd="mysql -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        mysql_cmd="$mysql_cmd -p$db_password"
    fi

    # Crear la base de datos si no existe
    $mysql_cmd -e "CREATE DATABASE IF NOT EXISTS \`$db_name\`;"
}

# Función para eliminar la base de datos
drop_database() {
    local db_name="$1"
    local db_user="$2"
    local db_password="$3"
    local db_host="${4:-localhost}"
    local db_port="${5:-3306}"

    local mysql_cmd="mysql -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        mysql_cmd="$mysql_cmd -p$db_password"
    fi

    $mysql_cmd -e "DROP DATABASE IF EXISTS \`$db_name\`;"
}

# Función para crear el usuario y otorgar permisos
create_user_and_grant() {
    local db_name="$1"
    local db_user="$2"
    local db_password="$3"
    local db_host="${4:-localhost}"
    local db_port="${5:-3306}"

    local mysql_cmd="mysql -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        mysql_cmd="$mysql_cmd -p$db_password"
    fi

    # Crear el usuario si no existe y establecer la contraseña
    $mysql_cmd -e "CREATE USER IF NOT EXISTS '$db_user'@'%' IDENTIFIED BY '$db_password';"
    $mysql_cmd -e "GRANT ALL PRIVILEGES ON \`$db_name\`.* TO '$db_user'@'%';"
    $mysql_cmd -e "FLUSH PRIVILEGES;"
}

# Función para ejecutar un archivo SQL
run_sql_file() {
    local sql_file="$1"
    local db_name="$2"
    local db_user="$3"
    local db_password="$4"
    local db_host="${5:-localhost}"
    local db_port="${6:-3306}"

    local mysql_cmd="mysql -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        mysql_cmd="$mysql_cmd -p$db_password"
    fi

    $mysql_cmd "$db_name" < "$sql_file"
}

# Función para ejecutar un volcado SQL (dump)
run_sql_dump() {
    local dump_file="$1"
    local db_name="$2"
    local db_user="$3"
    local db_password="$4"
    local db_host="${5:-localhost}"
    local db_port="${6:-3306}"

    local mysql_cmd="mysql -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        mysql_cmd="$mysql_cmd -p$db_password"
    fi

    # Si el archivo está comprimido, descomprimirlo al vuelo
    if [[ "$dump_file" == *.gz ]]; then
        gunzip -c "$dump_file" | $mysql_cmd "$db_name"
    else
        $mysql_cmd "$db_name" < "$dump_file"
    fi
}

# Función para ejecutar una consulta SQL arbitraria
exec_sql() {
    local query="$1"
    local db_name="$2"
    local db_user="$3"
    local db_password="$4"
    local db_host="${5:-localhost}"
    local db_port="${6:-3306}"

    local mysql_cmd="mysql -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        mysql_cmd="$mysql_cmd -p$db_password"
    fi

    $mysql_cmd "$db_name" -e "$query"
}

# Función para esperar a que MySQL esté listo (espera activa)
wait_mysql_ready() {
    local db_name="$1"
    local db_user="$2"
    local db_password="$3"
    local db_host="${4:-localhost}"
    local db_port="${5:-3306}"
    local max_attempts="${6:-30}"
    local attempt=1

    local mysql_cmd="mysql -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        mysql_cmd="$mysql_cmd -p$db_password"
    fi

    while [ $attempt -le $max_attempts ]; do
        if $mysql_cmd "$db_name" -e "SELECT 1;" >/dev/null 2>&1; then
            return 0
        fi
        echo "Esperando a que MySQL esté listo... intento $attempt/$max_attempts"
        sleep 2
        ((attempt++))
    done
    echo "Error: MySQL no estuvo listo después de $max_attempts intentos"
    return 1
}

# Exportar funciones para que estén disponibles en los scripts que importen este archivo
export -f verify_sql_files create_database drop_database create_user_and_grant
export -f run_sql_file run_sql_dump exec_sql wait_mysql_ready