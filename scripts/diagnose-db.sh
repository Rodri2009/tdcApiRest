#!/bin/bash

###############################################################################
# diagnose-db.sh - Diagnóstico de problemas con la base de datos
###############################################################################
# Este script verifica la disponibilidad de MySQL/MariaDB (local o Docker)
# y proporciona información para solucionar problemas.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_DIR="$PROJECT_DIR/docker"

echo -e "${YELLOW}=================================================${NC}"
echo -e "${YELLOW}  Diagnóstico de Conexión a Base de Datos${NC}"
echo -e "${YELLOW}=================================================${NC}"
echo ""

# Cargar .env si existe
if [ -f "$PROJECT_DIR/.env" ]; then
    echo -e "${BLUE}[*] Cargando variables de .env...${NC}"
    source "$PROJECT_DIR/.env"
fi

# 1. Verificar Docker
echo -e "${BLUE}[1] Verificando Docker...${NC}"
if command -v docker &>/dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null)
    echo -e "${GREEN}✓ Docker instalado:${NC} $DOCKER_VERSION"
    
    if docker ps &>/dev/null; then
        echo -e "${GREEN}✓ Docker está corriendo${NC}"
        
        # Encontrar contenedor de base de datos
        DB_CONTAINER=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -E '(mariadb|mysql|db)' | head -1)
        if [ -n "$DB_CONTAINER" ]; then
            echo -e "${GREEN}✓ Contenedor de BD encontrado:${NC} $DB_CONTAINER"
            
            # Verificar versión de MariaDB/MySQL
            DB_VERSION=$(docker exec "$DB_CONTAINER" mysqld --version 2>/dev/null || echo "No disponible")
            echo -e "${GREEN}  Versión:${NC} $DB_VERSION"
        else
            echo -e "${YELLOW}⚠ No se encontró contenedor de base de datos activo${NC}"
            echo -e "${YELLOW}  Contenedores disponibles:${NC}"
            docker ps -a --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | grep -E 'mariadb|mysql' || echo "    (ninguno)"
        fi
    else
        echo -e "${RED}✗ Docker no está corriendo${NC}"
        echo -e "${YELLOW}   Intenta: docker-compose -f $DOCKER_DIR/docker-compose.yml up -d${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Docker no está instalado${NC}"
fi
echo ""

# 2. Verificar MySQL/MariaDB local
echo -e "${BLUE}[2] Verificando MySQL/MariaDB local...${NC}"
if command -v mysql &>/dev/null; then
    MYSQL_VERSION=$(mysql --version 2>/dev/null)
    echo -e "${GREEN}✓ MySQL instalado:${NC} $MYSQL_VERSION"
    
    if pgrep mysql > /dev/null 2>&1 || pgrep mysqld > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MySQL está corriendo${NC}"
    else
        echo -e "${YELLOW}⚠ MySQL instalado pero no está corriendo${NC}"
        echo -e "${YELLOW}   Intenta: sudo systemctl start mysql${NC}"
    fi
else
    echo -e "${YELLOW}⚠ MySQL no está instalado localmente${NC}"
fi
echo ""

# 3. Información de configuración
echo -e "${BLUE}[3] Configuración del proyecto...${NC}"
if [ -f "$PROJECT_DIR/.env" ]; then
    echo -e "${GREEN}✓ Archivo .env encontrado${NC}"
    echo -e "${BLUE}  Variables de BD:${NC}"
    grep -E '^(DB_|MARIADB_)' "$PROJECT_DIR/.env" | sed "s/^/    /"
else
    echo -e "${YELLOW}⚠ No se encontró archivo .env${NC}"
fi
echo ""

# 4. Estado de Docker Compose
if [ -f "$DOCKER_DIR/docker-compose.yml" ]; then
    echo -e "${BLUE}[4] Estado de Docker Compose...${NC}"
    cd "$DOCKER_DIR" 2>/dev/null
    
    echo -e "${BLUE}  Servicios definidos:${NC}"
    docker-compose config --services 2>/dev/null | sed 's/^/    /'
    
    echo -e "${BLUE}  Estado de los servicios:${NC}"
    docker-compose ps 2>/dev/null | sed 's/^/    /'
else
    echo -e "${YELLOW}⚠ No se encontró docker-compose.yml${NC}"
fi
echo ""

# 5. Recomendaciones
echo -e "${BLUE}[5] Recomendaciones...${NC}"
if [ -f "$DOCKER_DIR/docker-compose.yml" ] && [ -f "$PROJECT_DIR/.env" ]; then
    if docker ps &>/dev/null; then
        DB_CONTAINER=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -E '(mariadb|mysql)' | head -1)
        if [ -z "$DB_CONTAINER" ]; then
            echo -e "${YELLOW}→ Inicia Docker Compose:${NC}"
            echo -e "   cd $DOCKER_DIR && docker-compose up -d"
        fi
    fi
fi

echo -e "${YELLOW}→ Para reinicializar la BD:${NC}"
echo -e "   cd $PROJECT_DIR && ./scripts/reset.sh"

echo -e "${YELLOW}→ Para ver detalles de errores:${NC}"
echo -e "   cd $PROJECT_DIR && ./scripts/reset.sh -d"
echo ""

echo -e "${GREEN}[✓] Diagnóstico completado${NC}"
echo ""

