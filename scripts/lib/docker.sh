#!/bin/bash

# docker.sh - Toda la lógica relacionada con Docker Compose

# Función para levantar los contenedores
docker_up() {
    local service="$1"
    if [ -z "$service" ]; then
        # Si no se especifica servicio, levantar todos
        docker compose up -d
    else
        docker compose up -d "$service"
    fi
}

# Función para detener los contenedores
docker_down() {
    docker compose down
}

# Función para reiniciar los contenedores
docker_restart() {
    local service="$1"
    if [ -z "$service" ]; then
        docker compose restart
    else
        docker compose restart "$service"
    fi
}

# Función para resetear (detener, eliminar volúmenes y volver a levantar)
docker_reset() {
    local service="$1"
    if [ -z "$service" ]; then
        docker compose down -v
        docker compose up -d
    else
        docker compose stop "$service"
        docker compose rm -f -v "$service"
        docker compose up -d "$service"
    fi
}

# Función para iniciar un servicio específico
docker_start_service() {
    local service="$1"
    docker compose up -d "$service"
}

# Función para detener un servicio específico
docker_stop_service() {
    local service="$1"
    docker compose stop "$service"
}

# Función para eliminar un volumen específico
docker_remove_volume() {
    local volume_name="$1"
    docker volume rm "$volume_name"
}

# Función para limpiar imágenes antiguas del backend (ejemplo)
docker_cleanup_old_backend() {
    # Implementar lógica específica para limpiar imágenes antiguas del backend
    # Por ejemplo, eliminar imágenes con cierta etiqueta o antigüedad
    echo "Limpiando imágenes antiguas del backend (implementar según necesidad)"
}

# Función para esperar a que MySQL esté listo (usando docker compose)
docker_wait_mysql() {
    local max_attempts="${1:-30}"
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if docker compose exec mariadb mariadb-admin ping -h${DB_HOST} --silent; then
            return 0
        fi
        echo "Esperando a que MySQL esté listo... intento $attempt/$max_attempts"
        sleep 2
        ((attempt++))
    done
    echo "Error: MySQL no estuvo listo después de $max_attempts intentos"
    return 1
}

# Función para esperar a que el backend esté listo (verificando endpoint de salud)
docker_wait_backend() {
    local max_attempts="${1:-30}"
    local attempt=1
    local backend_url="http://localhost:${BACKEND_PORT:-3000}/health"  # Ajustar según tu endpoint
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$backend_url" >/dev/null; then
            return 0
        fi
        echo "Esperando a que el backend esté listo... intento $attempt/$max_attempts"
        sleep 2
        ((attempt++))
    done
    echo "Error: Backend no estuvo listo después de $max_attempts intentos"
    return 1
}

# Función para obtener el ID o nombre de un contenedor
docker_get_container() {
    local service_name="$1"
    docker compose ps -q "$service_name"
}

# Función para sincronizar el entorno (copiar .env a .env.local si es necesario)
docker_sync_env() {
    if [ -f "$PROJECT_DIR/.env" ] && [ ! -f "$PROJECT_DIR/.env.local" ]; then
        cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.local"
    fi
}

# Función para crear un archivo de sobrescritura de entorno
docker_create_env_override() {
    local override_file="$1"
    shift
    # Crear el archivo con las variables proporcionadas
    > "$override_file"
    while [ $# -gt 0 ]; do
        echo "$1" >> "$override_file"
        shift
    done
}

# Función para limpiar archivos temporales
docker_cleanup_temp_files() {
    local temp_files=("$@")
    for file in "${temp_files[@]}"; do
        if [ -f "$file" ]; then
            rm -f "$file"
        fi
    done
}

# Exportar funciones
export -f docker_up docker_down docker_restart docker_reset
export -f docker_start_service docker_stop_service docker_remove_volume
export -f docker_cleanup_old_backend docker_wait_mysql docker_wait_backend
export -f docker_get_container docker_sync_env docker_create_env_override docker_cleanup_temp_files