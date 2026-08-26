#!/bin/bash

# health.sh - Toda la verificación posterior a la puesta en marcha

# Función para verificar el estado de salud de los contenedores
check_containers_health() {
    local services=("$@")
    local all_healthy=true

    for service in "${services[@]}"; do
        if ! docker compose ps "$service" --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
            echo "Advertencia: El servicio $service no está saludable"
            all_healthy=false
        fi
    done

    if [ "$all_healthy" = true ]; then
        echo "Todos los contenedores especificados están saludables"
        return 0
    else
        return 1
    fi
}

# Función para verificar el backend mediante HTTP
check_backend_http() {
    local url="${1:-http://localhost:3000/health}"
    local timeout="${2:-10}"
    if curl -s --max-time "$timeout" "$url" >/dev/null; then
        echo "Backend responde correctamente en $url"
        return 0
    else
        echo "Error: El backend no responde en $url"
        return 1
    fi
}

# Función para verificar la base de datos (ejecutar una consulta simple)
check_database() {
    local db_name="$1"
    local db_user="$2"
    local db_password="$3"
    local db_host="${4:-localhost}"
    local db_port="${5:-3306}"

    local mysql_cmd="mysql -h$db_host -P$db_port -u$db_user"
    if [ -n "$db_password" ]; then
        mysql_cmd="$mysql_cmd -p$db_password"
    fi

    if $mysql_cmd "$db_name" -e "SELECT 1;" >/dev/null 2>&1; then
        echo "Conexión a la base de datos $db_name exitosa"
        return 0
    else
        echo "Error: No se pudo conectar a la base de datos $db_name"
        return 1
    fi
}

# Función para imprimir un resumen de salud
print_health_summary() {
    echo
    echo "=== RESUMEN DE SALUD ==="
    # Estas variables deberían ser establecidas por los scripts que llamen a las funciones de verificación
    echo "Contenedores: ${CONTAINERS_HEALTH:-no verificado}"
    echo "Backend HTTP: ${BACKEND_HTTP_HEALTH:-no verificado}"
    echo "Base de datos: ${DB_HEALTH:-no verificado}"
    echo "========================"
    echo
}

# Exportar funciones
export -f check_containers_health check_backend_http check_database print_health_summary