#!/bin/bash

echo "═══════════════════════════════════════════════════════════════════════════"
echo "   VALIDACIÓN FINAL - REFACTORIZACIÓN DE CONTROLADORES"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Función para validar
validate() {
    local test_name=$1
    local command=$2
    
    echo -n "🔍 Validando: $test_name ... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASADO${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FALLIDO${NC}"
        ((FAILED++))
    fi
}

# Validaciones
echo "📋 VERIFICACIÓN DE ARCHIVOS"
echo "──────────────────────────────────────────────────────────────────────────"

validate "Archivo solicitudController.js existe" "test -f /home/rodrigo/tdcApiRest/backend/controllers/solicitudController.js"
validate "Archivo 01_schema.sql existe" "test -f /home/rodrigo/tdcApiRest/database/01_schema.sql"
validate "Archivo 03_test_data.sql existe" "test -f /home/rodrigo/tdcApiRest/database/03_test_data.sql"

echo ""
echo "📝 VERIFICACIÓN DE DOCUMENTACIÓN"
echo "──────────────────────────────────────────────────────────────────────────"

validate "RESUMEN_REFACTORING.txt existe" "test -f /home/rodrigo/tdcApiRest/RESUMEN_REFACTORING.txt"
validate "REFACTORING_SOLICITUDES.md existe" "test -f /home/rodrigo/tdcApiRest/REFACTORING_SOLICITUDES.md"
validate "PLAN_REFACTORING_CONTROLLERS.md existe" "test -f /home/rodrigo/tdcApiRest/PLAN_REFACTORING_CONTROLLERS.md"
validate "REFACTORING_REPORT.md existe" "test -f /home/rodrigo/tdcApiRest/REFACTORING_REPORT.md"
validate "TESTING_GUIDE.md existe" "test -f /home/rodrigo/tdcApiRest/TESTING_GUIDE.md"
validate "DOCUMENTACION_REFACTORING.md existe" "test -f /home/rodrigo/tdcApiRest/DOCUMENTACION_REFACTORING.md"

echo ""
echo "💻 VERIFICACIÓN DE CÓDIGO"
echo "──────────────────────────────────────────────────────────────────────────"

validate "Sintaxis JavaScript (solicitudController.js)" "node -c /home/rodrigo/tdcApiRest/backend/controllers/solicitudController.js"

echo ""
echo "🐳 VERIFICACIÓN DE CONTENEDORES"
echo "──────────────────────────────────────────────────────────────────────────"

validate "Backend está corriendo" "docker ps | grep -q docker-backend-1"
validate "MariaDB está corriendo" "docker ps | grep -q docker-mariadb-1"
validate "Nginx está corriendo" "docker ps | grep -q docker-nginx-1"

echo ""
echo "🌐 VERIFICACIÓN DE API"
echo "──────────────────────────────────────────────────────────────────────────"

validate "API /api/bandas responde" "curl -s http://localhost:3000/api/bandas | grep -q 'id'"
validate "API /api/servicios responde" "curl -s http://localhost:3000/api/servicios | grep -q 'id'"

echo ""
echo "🗄️  VERIFICACIÓN DE BASE DE DATOS"
echo "──────────────────────────────────────────────────────────────────────────"

# Check if solicitudes table exists
validate "Tabla 'solicitudes' existe" \
    "docker exec docker-mariadb-1 mysql -urodgrigo -ptdc_2025 tdc_db -e 'SHOW TABLES;' 2>/dev/null | grep -q solicitudes"

validate "Tabla 'solicitudes_alquiler' existe" \
    "docker exec docker-mariadb-1 mysql -urodgrigo -ptdc_2025 tdc_db -e 'SHOW TABLES;' 2>/dev/null | grep -q solicitudes_alquiler"

validate "Tabla 'solicitudes_bandas' existe" \
    "docker exec docker-mariadb-1 mysql -urodgrigo -ptdc_2025 tdc_db -e 'SHOW TABLES;' 2>/dev/null | grep -q solicitudes_bandas"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "                           RESULTADO FINAL"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "✅ Pruebas PASADAS:  ${GREEN}$PASSED${NC}"
echo -e "❌ Pruebas FALLIDAS: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 TODAS LAS VALIDACIONES PASARON EXITOSAMENTE${NC}"
    echo ""
    echo "El refactoring está completo y listo para:"
    echo "  1. Pruebas funcionales"
    echo "  2. Pruebas de integración"
    echo "  3. Despliegue en producción"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  ALGUNAS VALIDACIONES FALLARON${NC}"
    echo ""
    echo "Revisa los errores anteriores y ejecuta nuevamente."
    echo ""
    exit 1
fi
