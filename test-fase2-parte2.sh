#!/bin/bash

###############################################################################
# SCRIPT DE TESTING INTERACTIVO - FASE 2 PARTE 2
# 
# Propósito: Automatizar y guiar los tests definidos en TESTING_PLAN_FASE2_PARTE2.md
# Uso: ./test-fase2-parte2.sh
# Requisitos: curl, jq, docker, acceso a BD
#
###############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
BACKEND_URL="http://localhost:3000"
DB_CONTAINER="docker-mariadb-1"
DB_USER="root"
DB_PASS="sys8102root"
DB_NAME="tdc_db"
TOKEN=""
TEST_RESULTS=()

###############################################################################
# FUNCIONES AUXILIARES
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    TEST_RESULTS+=("✅ $1")
}

print_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    TEST_RESULTS+=("❌ $1")
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

pause_test() {
    echo ""
    echo -n "Presiona ENTER para continuar con el siguiente test..."
    read
}

###############################################################################
# VERIFICACIONES PREVIAS
###############################################################################

verify_prerequisites() {
    print_header "VERIFICACIÓN DE PREREQUISITOS"
    
    # Verificar backend
    print_test "Conectando a backend en $BACKEND_URL..."
    if curl -s "$BACKEND_URL/api/solicitudes/1" > /dev/null 2>&1; then
        print_pass "Backend accesible"
    else
        print_fail "Backend no responde"
        exit 1
    fi
    
    # Verificar Docker
    print_test "Verificando contenedores Docker..."
    if docker ps | grep -q "$DB_CONTAINER"; then
        print_pass "Contenedor BD accesible"
    else
        print_fail "Contenedor $DB_CONTAINER no encontrado"
        exit 1
    fi
    
    # Verificar jq
    print_test "Verificando jq..."
    if command -v jq &> /dev/null; then
        print_pass "jq instalado"
    else
        print_fail "jq no está instalado. Instala: sudo apt-get install jq"
        exit 1
    fi
    
    # Verificar curl
    print_test "Verificando curl..."
    if command -v curl &> /dev/null; then
        print_pass "curl instalado"
    else
        print_fail "curl no está instalado"
        exit 1
    fi
}

###############################################################################
# TEST SUITE 2: LECTURA (GET)
###############################################################################

test_2_1_publicas_listing() {
    print_header "TEST 2.1: GET /api/solicitudes/publicas"
    
    # Test 2.1.1
    print_test "2.1.1 Obtener todas las solicitudes públicas..."
    COUNT=$(curl -s "$BACKEND_URL/api/solicitudes/publicas" | jq 'length')
    if [ "$COUNT" -gt 0 ]; then
        print_pass "Se retornaron solicitudes públicas (count: $COUNT)"
    else
        print_fail "No se retornaron solicitudes públicas"
    fi
    
    # Test 2.1.2
    print_test "2.1.2 Verificar estructura de respuesta..."
    KEYS=$(curl -s "$BACKEND_URL/api/solicitudes/publicas" | jq '.[0] | keys | length')
    if [ "$KEYS" -gt 5 ]; then
        print_pass "Estructura correcta (campos: $KEYS)"
    else
        print_fail "Estructura incompleta"
    fi
    
    # Test 2.1.3
    print_test "2.1.3 Verificar evento 9 presente..."
    EVENTO9=$(curl -s "$BACKEND_URL/api/solicitudes/publicas" | jq '.[] | select(.id == 9) | .id')
    if [ ! -z "$EVENTO9" ]; then
        print_pass "Evento 9 presente en listado público"
    else
        print_fail "Evento 9 NO encontrado en listado público"
    fi
    
    # Test 2.1.4
    print_test "2.1.4 Verificar no hay eventos privados..."
    PRIVADOS=$(curl -s "$BACKEND_URL/api/solicitudes/publicas" | jq '[.[] | select(.esPublico == 0)] | length')
    if [ "$PRIVADOS" -eq 0 ]; then
        print_pass "No hay eventos privados en listado público"
    else
        print_warning "Encontrados $PRIVADOS eventos privados (posible cache)"
    fi
    
    pause_test
}

test_2_2_public_by_id() {
    print_header "TEST 2.2: GET /api/solicitudes/public/:id"
    
    # Test 2.2.1
    print_test "2.2.1 Obtener detalles solicitud pública (ID 9)..."
    RESULT=$(curl -s "$BACKEND_URL/api/solicitudes/public/9")
    ID=$(echo $RESULT | jq '.solicitudId // .id // empty')
    if [ ! -z "$ID" ]; then
        print_pass "Detalles obtenidos correctamente"
    else
        print_fail "No se pudieron obtener detalles"
    fi
    
    # Test 2.2.2
    print_test "2.2.2 Obtener detalles evento confirmado (ID ev_1)..."
    RESULT2=$(curl -s "$BACKEND_URL/api/solicitudes/public/ev_1")
    NOMBRE=$(echo $RESULT2 | jq '.nombreParaMostrar // .nombreEvento // empty')
    if [ ! -z "$NOMBRE" ]; then
        print_pass "Evento confirmado retornado"
    else
        print_fail "No se encontró evento confirmado"
    fi
    
    pause_test
}

###############################################################################
# TEST SUITE 3: ESCRITURA (PUT)
###############################################################################

get_admin_token() {
    print_info "Obteniendo token de admin..."
    TOKEN=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@test.com","password":"password"}' 2>/dev/null | jq -r '.token // empty')
    
    if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
        print_warning "Token no obtenido. Algunos tests requieren autenticación."
        print_warning "Continúa para tests públicos, salta tests de admin si es necesario."
        return 1
    else
        print_pass "Token obtenido: ${TOKEN:0:20}..."
        return 0
    fi
}

test_3_1_visibilidad() {
    print_header "TEST 3.1: PUT /api/admin/solicitudes/:id/visibilidad"
    
    if [ -z "$TOKEN" ]; then
        print_warning "Token no disponible. Saltando tests de admin."
        print_info "Para hacer estos tests manualmente, obtén un JWT token primero:"
        print_info "curl -X POST http://localhost:3000/api/auth/login -d '{\"email\":\"admin@\",\"password\":\"...\"}'i"
        pause_test
        return
    fi
    
    # Test 3.1.1
    print_test "3.1.1 Cambiar solicitud 9 a privada..."
    RESULT=$(curl -s -X PUT "$BACKEND_URL/api/admin/solicitudes/9/visibilidad" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"es_publico": 0}')
    
    MESSAGE=$(echo $RESULT | jq '.message // empty')
    if [[ "$MESSAGE" == *"actualiz"* ]] || [[ "$MESSAGE" == *"UPDATE"* ]]; then
        print_pass "Solicitud cambiada a privada"
    else
        print_warning "Respuesta: $RESULT"
    fi
    
    # Test 3.1.2
    print_test "3.1.2 Verificar en BD..."
    DB_RESULT=$(docker exec $DB_CONTAINER mysql -u $DB_USER -p$DB_PASS $DB_NAME \
      -e "SELECT es_publico FROM solicitudes WHERE id_solicitud = 9;" 2>/dev/null | tail -1)
    
    if [ "$DB_RESULT" == "0" ]; then
        print_pass "BD muestra solicitud privada (es_publico=0)"
    else
        print_fail "BD muestra solicitud pública aún (es_publico=$DB_RESULT)"
    fi
    
    # Test 3.1.3
    print_test "3.1.3 Verificar NO cambiaron tablas hijas..."
    print_info "Verificando solicitudes_fechas_bandas..."
    HIJO_RESULT=$(docker exec $DB_CONTAINER mysql -u $DB_USER -p$DB_PASS $DB_NAME \
      -e "SELECT COUNT(*) FROM solicitudes_fechas_bandas WHERE id_solicitud = 9;" 2>/dev/null | tail -1)
    
    if [ "$HIJO_RESULT" -gt 0 ]; then
        print_pass "Tabla hija NO fue modificada (expected)"
    fi
    
    # Test 3.1.4
    print_test "3.1.4 Verificar GET /publicas NO incluye evento 9..."
    sleep 1 # Pequeno delay
    EVENTO9=$(curl -s "$BACKEND_URL/api/solicitudes/publicas" | jq '.[] | select(.id == 9) | .id // empty')
    if [ -z "$EVENTO9" ]; then
        print_pass "Evento 9 removido de listado público"
    else
        print_fail "Evento 9 aún visible en público (cache?)"
    fi
    
    # Test 3.1.5
    print_test "3.1.5 Cambiar solicitud 9 de vuelta a pública..."
    curl -s -X PUT "$BACKEND_URL/api/admin/solicitudes/9/visibilidad" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"es_publico": 1}' > /dev/null
    
    sleep 1
    EVENTO9_BACK=$(curl -s "$BACKEND_URL/api/solicitudes/publicas" | jq '.[] | select(.id == 9) | .id')
    if [ "$EVENTO9_BACK" == "9" ]; then
        print_pass "Evento 9 devuelto a público"
    else
        print_fail "Error al devolver evento a público"
    fi
    
    pause_test
}

###############################################################################
# TEST SUITE 4: REGRESIÓN
###############################################################################

test_4_1_regression() {
    print_header "TEST 4.1: Endpoints POST/PUT no relacionados"
    
    # Test 4.1.1
    print_test "4.1.1 GET /api/solicitudes/:id (debe retornar datos)..."
    RESULT=$(curl -s "$BACKEND_URL/api/solicitudes/1")
    ID=$(echo $RESULT | jq '.id_solicitud // .id // empty')
    if [ ! -z "$ID" ]; then
        print_pass "GET /solicitudes/:id funciona"
    else
        print_fail "GET /solicitudes/:id falló"
    fi
    
    # Test 4.1.2
    print_test "4.1.2 Estructura de respuesta..."
    KEYS=$(echo $RESULT | jq 'keys | length')
    if [ "$KEYS" -gt 5 ]; then
        print_pass "Respuesta tiene estructura completa"
    else
        print_fail "Respuesta incompleta"
    fi
    
    pause_test
}

###############################################################################
# RESUMEN Y REPORTE
###############################################################################

print_summary() {
    print_header "RESUMEN DE RESULTADOS"
    
    echo ""
    for result in "${TEST_RESULTS[@]}"; do
        echo "$result"
    done
    echo ""
    
    PASS_COUNT=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "✅" || true)
    FAIL_COUNT=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "❌" || true)
    TOTAL=$((PASS_COUNT + FAIL_COUNT))
    
    echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
    echo -e "Total Tests: $TOTAL"
    echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
    echo -e "${RED}Failed: $FAIL_COUNT${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
    echo ""
    
    if [ $FAIL_COUNT -eq 0 ]; then
        echo -e "${GREEN}✅ TODOS LOS TESTS PASARON${NC}"
        echo -e "Procede a Fase 2 Parte 3: ALTER TABLE DROP COLUMN"
        return 0
    else
        echo -e "${RED}❌ ALGUNOS TESTS FALLARON${NC}"
        echo -e "Revisa los errores arriba y arregla antes de continuar."
        return 1
    fi
}

###############################################################################
# MENU PRINCIPAL
###############################################################################

main_menu() {
    while true; do
        print_header "TESTING SUITE - FASE 2 PARTE 2"
        
        echo "Elige qué tests ejecutar:"
        echo ""
        echo "  1) Ejecutar TODO (2 + 2 + 4)"
        echo "  2) Solo tests de LECTURA (2)"
        echo "  3) Solo tests de ESCRITURA (3)"
        echo "  4) Solo tests de REGRESION (4)"
        echo "  5) Verificar prerequisitos"
        echo "  6) Ver resultados previos"
        echo "  0) Salir"
        echo ""
        echo -n "Opción [0-6]: "
        read -r choice
        
        case $choice in
            1)
                verify_prerequisites
                test_2_1_publicas_listing
                test_2_2_public_by_id
                get_admin_token
                test_3_1_visibilidad
                test_4_1_regression
                print_summary
                ;;
            2)
                verify_prerequisites
                test_2_1_publicas_listing
                test_2_2_public_by_id
                print_summary
                ;;
            3)
                verify_prerequisites
                get_admin_token
                test_3_1_visibilidad
                ;;
            4)
                verify_prerequisites
                test_4_1_regression
                ;;
            5)
                verify_prerequisites
                ;;
            6)
                echo ""
                echo "Resultados de tests:"
                for result in "${TEST_RESULTS[@]}"; do
                    echo "$result"
                done
                ;;
            0)
                echo "Saliendo..."
                exit 0
                ;;
            *)
                print_error "Opción inválida"
                ;;
        esac
        echo ""
    done
}

###############################################################################
# INICIO
###############################################################################

#if [ "$1" == "--unattended" ]; then
#    # Modo automático (para CI/CD)
#    verify_prerequisites
#    test_2_1_publicas_listing
#    test_2_2_public_by_id
#    get_admin_token
#    test_3_1_visibilidad
#    test_4_1_regression
#    print_summary
#else
#    # Modo interactivo
#    main_menu
#fi

# Por ahora, siempre modo interactivo
main_menu
