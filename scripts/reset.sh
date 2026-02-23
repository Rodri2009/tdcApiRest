#!/bin/bash

###############################################################################
# reset.sh - Reinicializa la base de datos desde cero
###############################################################################
# Este script:
# 1. Elimina la base de datos existente
# 2. Crea la base de datos nueva
# 3. Carga el esquema (01_schema.sql)
# 4. Carga las semillas (02_seed.sql)
# 5. Carga los datos de prueba (03_test_data.sql)
# 6. Verifica la integridad de los datos
###############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
DB_NAME="tdc_db"
DB_USER="root"
DB_PASSWORD=""
DB_HOST="localhost"
DB_PORT="3306"
SQL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../database" && pwd)"

echo -e "${YELLOW}=================================================${NC}"
echo -e "${YELLOW}  TDC App - Database Reset${NC}"
echo -e "${YELLOW}=================================================${NC}"
echo ""

# Función para ejecutar SQL
run_sql() {
    local file=$1
    local description=$2
    
    echo -ne "${YELLOW}[*]${NC} Cargando: $description... "
    
    if [ -z "$DB_PASSWORD" ]; then
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < "$file" 2>/dev/null
    else
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$file" 2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FALLÓ${NC}"
        return 1
    fi
}

# Verificar que existan los archivos SQL
echo -e "${YELLOW}[*]${NC} Verificando archivos SQL..."
for file in "01_schema.sql" "02_seed.sql" "03_test_data.sql"; do
    if [ ! -f "$SQL_DIR/$file" ]; then
        echo -e "${RED}[✗] ERROR: Archivo no encontrado: $SQL_DIR/$file${NC}"
        exit 1
    fi
    echo -e "${GREEN}    ✓${NC} $file"
done
echo ""

# Drop database
echo -ne "${YELLOW}[*]${NC} Eliminando base de datos existente... "
if [ -z "$DB_PASSWORD" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;" 2>/dev/null
else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;" 2>/dev/null
fi
echo -e "${GREEN}✓ OK${NC}"

# Create database
echo -ne "${YELLOW}[*]${NC} Creando base de datos nueva... "
if [ -z "$DB_PASSWORD" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
fi
echo -e "${GREEN}✓ OK${NC}"
echo ""

# Load schema
if ! run_sql "$SQL_DIR/01_schema.sql" "Schema (Estructura de tablas)"; then
    echo -e "${RED}[✗] ERROR: No se pudo cargar el schema${NC}"
    exit 1
fi

# Load seed data
if ! run_sql "$SQL_DIR/02_seed.sql" "Seed Data (Configuración y catálogos)"; then
    echo -e "${RED}[✗] ERROR: No se pudo cargar los datos de semilla${NC}"
    exit 1
fi

# Load test data
if ! run_sql "$SQL_DIR/03_test_data.sql" "Test Data (Datos dinámicos de prueba)"; then
    echo -e "${RED}[✗] ERROR: No se pudo cargar los datos de prueba${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[*]${NC} Verificando integridad de datos..."

# Verificación básica
if [ -z "$DB_PASSWORD" ]; then
    TABLE_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DB_NAME';" 2>/dev/null | tail -1)
else
    TABLE_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DB_NAME';" 2>/dev/null | tail -1)
fi

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}    ✓${NC} Base de datos creada con $TABLE_COUNT tablas"
else
    echo -e "${RED}    ✗${NC} No se encontraron tablas en la base de datos"
    exit 1
fi

# Verificar datos críticos
echo -e "${YELLOW}[*]${NC} Verificando datos cargados..."

QUERIES=(
    "SELECT COUNT(*) FROM configuracion;"
    "SELECT COUNT(*) FROM opciones_tipos;"
    "SELECT COUNT(*) FROM clientes;"
    "SELECT COUNT(*) FROM usuarios;"
    "SELECT COUNT(*) FROM solicitudes;"
    "SELECT COUNT(*) FROM eventos_confirmados;"
    "SELECT COUNT(*) FROM bandas_artistas;"
)

LABELS=(
    "Configuración"
    "Tipos de eventos"
    "Clientes"
    "Usuarios"
    "Solicitudes"
    "Eventos confirmados"
    "Bandas artistas"
)

for i in "${!QUERIES[@]}"; do
    if [ -z "$DB_PASSWORD" ]; then
        result=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" -NB -e "${QUERIES[$i]}" 2>/dev/null)
    else
        result=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -NB -e "${QUERIES[$i]}" 2>/dev/null)
    fi
    
    if [ -n "$result" ] && [ "$result" -gt 0 ]; then
        echo -e "${GREEN}    ✓${NC} ${LABELS[$i]}: $result registros"
    else
        echo -e "${YELLOW}    ⚠${NC}  ${LABELS[$i]}: Sin registros"
    fi
done

echo ""
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}  ✓ Base de datos reiniciada exitosamente${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo -e "${YELLOW}Detalles:${NC}"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Schema: 01_schema.sql"
echo "  Seeds: 02_seed.sql"
echo "  Test Data: 03_test_data.sql"
echo ""

exit 0
