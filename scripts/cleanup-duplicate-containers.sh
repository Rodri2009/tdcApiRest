#!/bin/bash

# ==============================================================================
# cleanup-duplicate-containers.sh
# 
# Limpia contenedores duplicados o huérfanos que hayan quedado del proyecto TDC.
# Útil cuando hay múltiples docker-backend-run-* contenedores corriendo.
#
# Uso: ./cleanup-duplicate-containers.sh
#
# Este script:
#   1. Identifica todos los contenedores TDC (backend, nginx, mariadb)
#   2. Muestra cuáles están corriendo y cuáles están detenidos
#   3. Elimina los detenidos y opcionalmente los duplicados en ejecución
# ==============================================================================

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Limpieza de Contenedores Duplicados/Huérfanos del TDC      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detectar contenedores TDC (de forma única)
BACKEND_CONTAINERS=$(docker ps -a --filter "name=docker-backend" --format "{{.ID}}" 2>/dev/null | sort -u)
BACKEND_RUN_CONTAINERS=$(docker ps -a --filter "name=docker-backend-run-" --format "{{.ID}}" 2>/dev/null | sort -u)
NGINX_CONTAINERS=$(docker ps -a --filter "name=docker-nginx" --format "{{.ID}}" 2>/dev/null | sort -u)
MARIADB_CONTAINERS=$(docker ps -a --filter "name=docker-mariadb" --format "{{.ID}}" 2>/dev/null | sort -u)

ALL_CONTAINERS=$(printf "%s\n%s\n%s\n%s\n" "$BACKEND_CONTAINERS" "$BACKEND_RUN_CONTAINERS" "$NGINX_CONTAINERS" "$MARIADB_CONTAINERS" | grep -v '^$' | sort -u)

if [ -z "$ALL_CONTAINERS" ] || [ "$ALL_CONTAINERS" = "   " ]; then
    echo "✅ No hay contenedores TDC encontrados."
    exit 0
fi

echo "📋 Contenedores TDC detectados:"
echo ""

# Mostrar estado de cada contenedor
RUNNING_COUNT=0
STOPPED_COUNT=0

for container_id in $ALL_CONTAINERS; do
    STATUS=$(docker ps -a --filter "id=$container_id" --format "{{.Status}}" 2>/dev/null)
    NAME=$(docker ps -a --filter "id=$container_id" --format "{{.Names}}" 2>/dev/null)
    
    if docker ps --filter "id=$container_id" -q 2>/dev/null | grep -q .; then
        echo -e "${GREEN}✓ RUNNING${NC}  | $NAME"
        ((RUNNING_COUNT++))
    else
        echo -e "${YELLOW}✗ STOPPED${NC}  | $NAME"
        ((STOPPED_COUNT++))
    fi
done

echo ""
echo "📊 Resumen:"
echo "   Contenedores corriendo: $RUNNING_COUNT"
echo "   Contenedores detenidos: $STOPPED_COUNT"
echo ""

# Eliminar contenedores detenidos
STOPPED_CONTAINERS=$(docker ps -a -f "status=exited" --filter "name=docker-backend\|docker-nginx\|docker-mariadb" -q 2>/dev/null)

if [ -n "$STOPPED_CONTAINERS" ]; then
    echo "🗑️  Eliminando contenedores detenidos..."
    echo "$STOPPED_CONTAINERS" | xargs -r docker rm -f 2>/dev/null
    echo -e "${GREEN}✅ Contenedores detenidos eliminados${NC}"
    echo ""
fi

# Si hay múltiples contenedores corriendo, ofrecer limpiarlos
# Si hay múltiples contenedores corriendo, ofrecer limpiarlos
RUNNING_BACKENDS=$(docker ps --filter "name=docker-backend" --format "{{.Names}}" 2>/dev/null | wc -l)
RUNNING_BACKEND_RUNS=$(docker ps --filter "name=docker-backend-run-" --format "{{.Names}}" 2>/dev/null | wc -l)

if [ "$RUNNING_BACKENDS" -gt 1 ] || [ "$RUNNING_BACKEND_RUNS" -gt 1 ]; then
    echo -e "${YELLOW}⚠️  Se detectaron múltiples contenedores corriendo.${NC}"
    echo ""
    echo "Estos pueden estar causando conflictos:"
    docker ps --filter "name=docker-backend\|docker-nginx\|docker-mariadb" --format "table {{.Names}}\t{{.Status}}"
    echo ""
    read -p "¿Deseas detener todos estos contenedores y hacer un reset limpio? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "Deteniendo contenedores..."
        docker ps --filter "name=docker-backend\|docker-nginx\|docker-mariadb" -q | xargs -r docker stop 2>/dev/null
        docker ps -a --filter "name=docker-backend\|docker-nginx\|docker-mariadb" -q | xargs -r docker rm -f 2>/dev/null
        echo -e "${GREEN}✅ Todos los contenedores han sido detenidos y eliminados${NC}"
        echo ""
        echo "Ahora puedes ejecutar: ./scripts/reset.sh"
    fi
else
    echo -e "${GREEN}✅ Sistema limpio - máximo un contenedor de cada tipo${NC}"
fi

echo ""
echo "Estado final:"
docker ps --filter "name=docker-backend\|docker-nginx\|docker-mariadb" --format "table {{.Names}}\t{{.Status}}" || echo "   (sin contenedores activos)"
