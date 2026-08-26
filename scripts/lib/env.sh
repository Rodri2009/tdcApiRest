#!/bin/bash

# env.sh - Gestión de variables de entorno y archivos .env

# Directorio del proyecto (asumido que ya está definido en config.sh, pero lo redeclaramos por si se usa solo)
# En la práctica, este archivo debería importarse después de config.sh, pero dejamos las variables por si se usa solo.
# Sin embargo, según las restricciones, config.sh será la base y se cargará primero.

# Función para cargar variables de entorno desde un archivo .env
load_env() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        # Exportar todas las variables definidas en el archivo
        set -a  # export all variables that are defined
        source "$env_file"
        set +a
        return 0
    else
        echo "Advertencia: Archivo de entorno no encontrado: $env_file" >&2
        return 1
    fi
}

# Función para crear un archivo .env temporal con overrides
create_temp_env() {
    local output_file="$1"
    shift
    # Los argumentos restantes son pares KEY=VALUE
    > "$output_file"  # Vaciar o crear el archivo
    while [ $# -gt 0 ]; do
        echo "$1" >> "$output_file"
        shift
    done
}

# Función para sincronizar el entorno: copiar .env.example a .env si no existe
sync_env() {
    local project_dir="$1"
    if [ ! -f "$project_dir/.env" ] && [ -f "$project_dir/.env.example" ]; then
        cp "$project_dir/.env.example" "$project_dir/.env"
        echo "Archivo .env creado desde .env.example"
    fi
}

# Función para crear un archivo de sobrescritura (override) de entorno
create_override_env() {
    local override_file="$1"
    shift
    # Similar a create_temp_env, pero podemos añadir lógica específica si es necesario
    create_temp_env "$override_file" "$@"
}

# Función para limpiar archivos temporales de entorno
cleanup_temp_env() {
    local temp_files=("$@")
    for file in "${temp_files[@]}"; do
        if [ -f "$file" ]; then
            rm -f "$file"
        fi
    done
}

# Exportar funciones
export -f load_env create_temp_env sync_env create_override_env cleanup_temp_env