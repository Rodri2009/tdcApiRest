#!/bin/bash

# ============================================================================
# SCRIPT: Corrección Automática de Estados de Solicitudes
# ============================================================================
# Propósito: Cambiar estado de solicitud de 'Solicitado' a 'Confirmado'
#           y sincronizar eventos_confirmados correctamente
# ============================================================================

set -e

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# ============================================================================
# FUNCIÓN: Verificar credenciales de BD
# ============================================================================

verify_db_credentials() {
    log_info "Verificando credenciales de MariaDB..."
    
    # Cargar variables de entorno desde .env
    if [ -f .env ]; then
        source .env
    else
        log_error "Archivo .env no encontrado en $(pwd)"
        exit 1
    fi
    
    # Verificar variables necesarias
    if [ -z "$MARIADB_ROOT_PASSWORD" ] || [ -z "$MARIADB_DATABASE" ]; then
        log_error "Variables MARIADB_ROOT_PASSWORD o MARIADB_DATABASE no están definidas en .env"
        exit 1
    fi
    
    # Intentar conectar a BD
    docker exec docker-mariadb-1 mysql -u root -p"$MARIADB_ROOT_PASSWORD" -D "$MARIADB_DATABASE" -e "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_success "Conexión a MariaDB exitosa"
    else
        log_error "No se puede conectar a MariaDB. ¿Est acorriendo docker-compose?"
        exit 1
    fi
}

# ============================================================================
# FUNCIÓN: Obtener información actual de solicitud
# ============================================================================

get_solicitud_info() {
    local ID=$1
    
    log_info "Obteniendo información de solicitud ID: $ID"
    
    # Limpiar prefijo si existe (bnd_, alq_, etc)
    REAL_ID=$(echo "$ID" | sed 's/^[a-z]*_//')
    
    # Obtener info de solicitudes
    local QUERY="SELECT 
        id_solicitud, 
        estado, 
        es_publico, 
        categoria,
        descripcion_corta
    FROM solicitudes 
    WHERE id_solicitud = $REAL_ID;"
    
    local RESULT=$(docker exec docker-mariadb-1 mysql -u root -p"$MARIADB_ROOT_PASSWORD" -D "$MARIADB_DATABASE" -N -e "$QUERY" 2>/dev/null)
    
    if [ -z "$RESULT" ]; then
        log_error "Solicitud ID $ID no encontrada"
        return 1
    fi
    
    # Parsear resultado
    read -r SOL_ID CURRENT_STATE CURRENT_PUBLIC CATEGORY DESC <<< "$RESULT"
    
    log_info "Solicitud encontrada:"
    echo "  - ID: $SOL_ID"
    echo "  - Estado: $CURRENT_STATE"
    echo "  - Es Público: $CURRENT_PUBLIC"
    echo "  - Categoría: $CATEGORY"
    echo "  - Descripción: $DESC"
    
    return 0
}

# ============================================================================
# FUNCIÓN: Cambiar estado usando SQL directo
# ============================================================================

update_state_sql() {
    local ID=$1
    local REAL_ID=$(echo "$ID" | sed 's/^[a-z]*_//')
    
    log_warning "Cambiando estado a 'Confirmado' usando SQL directo..."
    
    # SQL de actualización (sin transaction para evitar bloqueos)
    local SQL="
    -- 1. Actualizar tabla padre
    UPDATE solicitudes 
    SET estado = 'Confirmado', es_publico = 1, actualizado_en = NOW()
    WHERE id_solicitud = $REAL_ID;
    
    -- 2. Actualizar tabla hija según categoría
    UPDATE solicitudes_fechas_bandas 
    SET estado = 'Confirmado', actualizado_en = NOW()
    WHERE id_solicitud = $REAL_ID;
    
    -- 3. Crear evento_confirmado si no existe
    INSERT IGNORE INTO eventos_confirmados (
        id_solicitud, tipo_evento, tabla_origen,
        nombre_evento, descripcion, fecha_evento, hora_inicio,
        duracion_estimada, es_publico, activo, confirmado_en
    ) SELECT 
        $REAL_ID, 'BANDA', 'solicitudes_fechas_bandas',
        COALESCE(sf.descripcion, s.descripcion_corta, 'Banda'),
        sf.descripcion,
        sf.fecha_evento,
        COALESCE(sf.hora_evento, '21:00:00'),
        sf.duracion,
        1, 1,
        NOW()
    FROM solicitudes s
    LEFT JOIN solicitudes_fechas_bandas sf ON s.id_solicitud = sf.id_solicitud
    WHERE s.id_solicitud = $REAL_ID AND NOT EXISTS (
        SELECT 1 FROM eventos_confirmados WHERE id_solicitud = $REAL_ID AND tipo_evento = 'BANDA'
    );
    
    -- 4. Si el evento ya existe, actualizar campos
    UPDATE eventos_confirmados 
    SET 
        nombre_evento = COALESCE(nombre_evento, (
            SELECT COALESCE(sf.descripcion, s.descripcion_corta, 'Banda')
            FROM solicitudes_fechas_bandas sf
            JOIN solicitudes s ON sf.id_solicitud = s.id_solicitud
            WHERE sf.id_solicitud = $REAL_ID
        )),
        fecha_evento = (
            SELECT sf.fecha_evento FROM solicitudes_fechas_bandas sf WHERE sf.id_solicitud = $REAL_ID
        ),
        es_publico = 1,
        activo = 1,
        cancelado_en = NULL
    WHERE id_solicitud = $REAL_ID AND tipo_evento = 'BANDA' AND (
        nombre_evento IS NULL OR 
        nombre_evento = 'Sin nombre'
    );
    "
    
    # Ejecutar SQL
    echo "$SQL" | docker exec -i docker-mariadb-1 mysql -u root -p"$MARIADB_ROOT_PASSWORD" -D "$MARIADB_DATABASE" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "Estado actualizado correctamente en BD"
        return 0
    else
        log_error "Error al actualizar estado en BD"
        return 1
    fi
}

# ============================================================================
# FUNCIÓN: Verificar cambios
# ============================================================================

verify_changes() {
    local ID=$1
    local REAL_ID=$(echo "$ID" | sed 's/^[a-z]*_//')
    
    log_info "Verificando cambios..."
    
    # Verificar solicitud
    local SOL_QUERY="SELECT estado, es_publico FROM solicitudes WHERE id_solicitud = $REAL_ID;"
    local SOL_RESULT=$(docker exec docker-mariadb-1 mysql -u root -p"$MARIADB_ROOT_PASSWORD" -D "$MARIADB_DATABASE" -N -e "$SOL_QUERY" 2>/dev/null)
    
    read -r STATE PUBLIC <<< "$SOL_RESULT"
    
    if [ "$STATE" = "Confirmado" ] && [ "$PUBLIC" = "1" ]; then
        log_success "✓ solicitudes: estado='Confirmado', es_publico=1"
    else
        log_error "✗ solicitudes no actualizado correctamente (estado=$STATE, es_publico=$PUBLIC)"
        return 1
    fi
    
    # Verificar evento_confirmado
    local EVENT_QUERY="SELECT COUNT(*) FROM eventos_confirmados WHERE id_solicitud = $REAL_ID AND tipo_evento = 'BANDA';"
    local EVENT_COUNT=$(docker exec docker-mariadb-1 mysql -u root -p"$MARIADB_ROOT_PASSWORD" -D "$MARIADB_DATABASE" -N -e "$EVENT_QUERY" 2>/dev/null)
    
    if [ "$EVENT_COUNT" -gt 0 ]; then
        log_success "✓ eventos_confirmados: evento BANDA creado"
        
        # Detalles del evento
        local EVENT_DETAILS_QUERY="SELECT id, nombre_evento, fecha_evento, es_publico FROM eventos_confirmados WHERE id_solicitud = $REAL_ID AND tipo_evento = 'BANDA';"
        echo "$(docker exec docker-mariadb-1 mysql -u root -p"$MARIADB_ROOT_PASSWORD" -D "$MARIADB_DATABASE" -e "$EVENT_DETAILS_QUERY" 2>/dev/null)"
    else
        log_error "✗ No se creó evento_confirmado"
        return 1
    fi
    
    return 0
}

# ============================================================================
# FUNCIÓN: Verificar en API endpoints
# ============================================================================

verify_api() {
    local ID=$1
    
    log_info "Verificando en API endpoints..."
    
    # Verificar /api/solicitudes/publicas
    log_info "Consultando GET /api/solicitudes/publicas..."
    local API_RESULT=$(curl -s http://localhost:3000/api/solicitudes/publicas | grep -i "$ID" || echo "")
    
    if [ -n "$API_RESULT" ]; then
        log_success "✓ Solicitud encontrada en /api/solicitudes/publicas"
    else
        log_warning "✗ Solicitud NO encontrada en /api/solicitudes/publicas (puede estar siendo indexado)"
    fi
    
    # Verificar /api/eventos/publicos
    log_info "Consultando GET /api/eventos/publicos..."
    local EVENTS_RESULT=$(curl -s http://localhost:3000/api/eventos/publicos | grep -i "ALTA FECHAA" || echo "")
    
    if [ -n "$EVENTS_RESULT" ]; then
        log_success "✓ Evento confirmado encontrado en /api/eventos/publicos"
    else
        log_warning "✗ Evento NO encontrado en /api/eventos/publicos"
    fi
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   Corrección Automática de Estados de Solicitudes TDC API     ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Validar argumentos
    if [ $# -lt 1 ]; then
        log_error "Uso: $0 <ID_SOLICITUD> [--verify-only]"
        echo ""
        echo "Ejemplos:"
        echo "  $0 9           # Cambiar estado del evento 9"
        echo "  $0 bnd_9       # Cambiar estado (con prefijo bnd_)"
        echo "  $0 9 --verify-only  # Solo verificar sin cambiar"
        echo ""
        exit 1
    fi
    
    local SOLICITUD_ID=$1
    local VERIFY_ONLY=${2:-false}
    
    # Verificar credenciales
    verify_db_credentials
    
    # Obtener información actual
    if ! get_solicitud_info "$SOLICITUD_ID"; then
        exit 1
    fi
    
    echo ""
    
    # Si solo verificar
    if [ "$VERIFY_ONLY" = "--verify-only" ]; then
        log_info "Modo verificación solamente"
        verify_changes "$SOLICITUD_ID"
        exit $?
    fi
    
    # Preguntar confirmación
    echo ""
    log_warning "¿Deseas cambiar el estado a 'Confirmado' y hacerlo público?"
    read -p "Presiona [S/s] para confirmar: " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log_info "Cancelado por usuario"
        exit 0
    fi
    
    # Ejecutar cambios
    echo ""
    if ! update_state_sql "$SOLICITUD_ID"; then
        exit 1
    fi
    
    # Esperar un poco para que cambios se repliquen
    echo ""
    log_info "Esperando 2 segundos para sincronización..."
    sleep 2
    
    # Verificar cambios
    echo ""
    if ! verify_changes "$SOLICITUD_ID"; then
        log_error "Verificación falló. Revisa los datos manualmente."
        exit 1
    fi
    
    # Verificar en API (si backend está corriendo)
    echo ""
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo ""
        verify_api "$SOLICITUD_ID"
    else
        log_warning "Backend no está disponible en http://localhost:3000"
    fi
    
    echo ""
    log_success "════════════════════════════════════════════════════════"
    log_success "Solicitud #$SOLICITUD_ID cambió a estado 'Confirmado' ✓"
    log_success "════════════════════════════════════════════════════════"
    echo ""
    echo "Próximos pasos:"
    echo "  1. Abre index.html en navegador → debería ver el evento en agenda"
    echo "  2. Abre seccion_agenda.html → debería ver evento con nombre correcto"
    echo "  3. Si hay problemas, revisa:"
    echo "     - ANALISIS_REDUNDANCIA_TABLAS.md (explicación completa)"
    echo "     - docker logs docker-backend-1 (errores del API)"
    echo ""
}

# Ejecutar
main "$@"

