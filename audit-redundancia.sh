#!/bin/bash

# ============================================================================
# SCRIPT: Auditoría de Redundancia y Sincronización de Tablas
# ============================================================================
# Propósito: Detectar inconsistencias en campos duplicados entre tablas
# Uso: ./audit-redundancia.sh
# ============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Funciones logging
log_title() { echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"; echo -e "${BLUE}$1${NC}"; echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"; }
log_section() { echo -e "\n${MAGENTA}▶ $1${NC}"; }
log_ok() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

# Ejecutar query SQL y retornar resultado
run_sql() {
    local query="$1"
    docker exec docker-mariadb-1 mysql -u root -psys8102root -D tdc_db -N -e "$query" 2>/dev/null
}

# Contar resultados
count_rows() {
    local query="$1"
    run_sql "$query" | wc -l
}

# ============================================================================
# AUDITORÍA 1: REDUNDANCIA DE CAMPO 'estado'
# ============================================================================

audit_campo_estado() {
    log_section "AUDITORÍA 1: Redundancia de Campo 'estado'"
    
    # Problema: 'estado' existe en solicitudes, solicitudes_alquiler, solicitudes_fechas_bandas
    # Debería ser solo en solicitudes (tabla padre)
    
    echo "Buscando inconsistencias de 'estado' entre tabla padre e hijas..."
    
    # Chequear solicitudes_alquiler
    local alquiler_inconsistent=$(run_sql "
        SELECT COUNT(*) FROM solicitudes s
        JOIN solicitudes_alquiler sa ON s.id_solicitud = sa.id_solicitud
        WHERE s.estado != sa.estado OR (s.estado IS NULL AND sa.estado IS NOT NULL)
    ")
    
    if [ "$alquiler_inconsistent" -eq 0 ]; then
        log_ok "solicitudes_alquiler: Estado sincronizado ✓ (0 inconsistencias)"
    else
        log_error "solicitudes_alquiler: $alquiler_inconsistent registros con 'estado' inconsistente"
        echo "   Ejemplos:"
        run_sql "
            SELECT id_solicitud, s.estado, sa.estado 
            FROM solicitudes s
            JOIN solicitudes_alquiler sa ON s.id_solicitud = sa.id_solicitud
            WHERE s.estado != sa.estado LIMIT 3
        " | while read row; do echo "   $row"; done
    fi
    
    # Chequear solicitudes_fechas_bandas
    local bandas_inconsistent=$(run_sql "
        SELECT COUNT(*) FROM solicitudes s
        JOIN solicitudes_fechas_bandas sfb ON s.id_solicitud = sfb.id_solicitud
        WHERE s.estado != sfb.estado OR (s.estado IS NULL AND sfb.estado IS NOT NULL)
    ")
    
    if [ "$bandas_inconsistent" -eq 0 ]; then
        log_ok "solicitudes_fechas_bandas: Estado sincronizado ✓ (0 inconsistencias)"
    else
        log_error "solicitudes_fechas_bandas: $bandas_inconsistent registros con 'estado' inconsistente"
    fi
    
    echo ""
    log_warn "Conclusión: Campo 'estado' está DUPLICADO en solicitudes_alquiler y solicitudes_fechas_bandas"
    log_warn "Acción: Eliminar estas columnas y usar solo solicitudes.estado"
}

# ============================================================================
# AUDITORÍA 2: REDUNDANCIA DE CAMPO 'es_publico'
# ============================================================================

audit_campo_es_publico() {
    log_section "AUDITORÍA 2: Redundancia de Campo 'es_publico'"
    
    # Problema: 'es_publico' existe en:
    # - solicitudes
    # - solicitudes_fechas_bandas
    # - eventos_confirmados
    
    echo "Analizando sincronización de 'es_publico' en 3 tablas..."
    
    # Casos donde solicitudes y solicitudes_fechas_bandas difieren
    local sfb_diff=$(run_sql "
        SELECT COUNT(*) FROM solicitudes s
        JOIN solicitudes_fechas_bandas sf ON s.id_solicitud = sf.id_solicitud
        WHERE COALESCE(s.es_publico, 0) != COALESCE(sf.es_publico, 0)
    ")
    
    if [ "$sfb_diff" -eq 0 ]; then
        log_ok "solicitudes ↔ solicitudes_fechas_bandas: Sincronizados ✓"
    else
        log_error "solicitudes ↔ solicitudes_fechas_bandas: $sfb_diff registros DESINCRONIZADOS"
        echo "   Ejemplos:"
        run_sql "
            SELECT s.id_solicitud, s.es_publico, sf.es_publico
            FROM solicitudes s
            JOIN solicitudes_fechas_bandas sf ON s.id_solicitud = sf.id_solicitud
            WHERE COALESCE(s.es_publico, 0) != COALESCE(sf.es_publico, 0) LIMIT 3
        " | while read row; do echo "   $row"; done
    fi
    
    # Casos donde solicitudes y eventos_confirmados difieren
    local ec_diff=$(run_sql "
        SELECT COUNT(*) FROM solicitudes s
        LEFT JOIN eventos_confirmados ec ON s.id_solicitud = ec.id_solicitud
        WHERE ec.id IS NOT NULL AND COALESCE(s.es_publico, 0) != COALESCE(ec.es_publico, 0)
    ")
    
    if [ "$ec_diff" -eq 0 ]; then
        log_ok "solicitudes ↔ eventos_confirmados: Sincronizados ✓"
    else
        log_error "solicitudes ↔ eventos_confirmados: $ec_diff registros DESINCRONIZADOS"
    fi
    
    echo ""
    log_warn "Conclusión: Campo 'es_publico' está TRIPLICADO"
    log_warn "Riesgo: Causa problemas de sincronización (como evento 9)"
    log_warn "Acción: Eliminar de solicitudes_fechas_bandas, usar desde solicitudes"
}

# ============================================================================
# AUDITORÍA 3: REDUNDANCIA DE CAMPOS TEMPORALES
# ============================================================================

audit_campos_temporales() {
    log_section "AUDITORÍA 3: Redundancia de Campos Temporales (fecha, hora, duracion)"
    
    echo "Buscando duplicación de campos de fecha/hora entre padre e hijas..."
    
    # Campos disponibles en solicitudes
    local sol_fields=$(run_sql "
        SELECT GROUP_CONCAT(COLUMN_NAME)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'solicitudes' AND TABLE_SCHEMA = 'tdc_db'
          AND COLUMN_NAME IN ('fecha_evento', 'hora_evento', 'duracion')
    ")
    
    if [ -z "$sol_fields" ] || [ "$sol_fields" = "NULL" ]; then
        log_ok "solicitudes: NO tiene campos fecha_evento, hora_evento, duracion ✓"
        log_warn "→ Estos campos están en tablas hijas (correcto)"
    else
        log_error "solicitudes: Tiene campos duplicados ($sol_fields)"
    fi
    
    # Verificar consistencia en alquiler
    local alq_count=$(run_sql "
        SELECT COUNT(DISTINCT id_solicitud) FROM solicitudes_alquiler
        WHERE fecha_evento IS NOT NULL
    ")
    
    log_ok "solicitudes_alquiler tiene $alq_count solicitudes con fecha_evento"
    
    # Verificar consistencia en bandas
    local sfb_count=$(run_sql "
        SELECT COUNT(DISTINCT id_solicitud) FROM solicitudes_fechas_bandas
        WHERE fecha_evento IS NOT NULL
    ")
    
    log_ok "solicitudes_fechas_bandas tiene $sfb_count solicitudes con fecha_evento"
    
    echo ""
    log_warn "Conclusión: Campos temporales estate bien distribuidos (no duplicados en padre)"
    log_warn "→ Mantener como están: cada tabla hija con sus fechas específicas"
}

# ============================================================================
# AUDITORÍA 4: SINCRONIZACIÓN EVENTOS_CONFIRMADOS
# ============================================================================

audit_eventos_confirmados() {
    log_section "AUDITORÍA 4: Sincronización de eventos_confirmados"
    
    echo "Verificando datos en eventos_confirmados..."
    
    # Contar eventos confirmados
    local total_eventos=$(run_sql "SELECT COUNT(*) FROM eventos_confirmados WHERE activo = 1")
    log_ok "Total eventos confirmados activos: $total_eventos"
    
    # Eventos con nombre_evento NULL
    local nombre_null=$(run_sql "SELECT COUNT(*) FROM eventos_confirmados WHERE activo = 1 AND (nombre_evento IS NULL OR nombre_evento = 'Sin nombre')")
    
    if [ "$nombre_null" -gt 0 ]; then
        log_error "eventos_confirmados: $nombre_null eventos con nombre_evento NULL/vacío"
        echo "   Ejemplos:"
        run_sql "
            SELECT id, id_solicitud, nombre_evento, tipo_evento
            FROM eventos_confirmados
            WHERE activo = 1 AND (nombre_evento IS NULL OR nombre_evento = 'Sin nombre')
            LIMIT 5
        " | while read row; do echo "   $row"; done
    else
        log_ok "Todos los eventos_confirmados tienen nombre_evento ✓"
    fi
    
    # Eventos donde fecha difiere de su solicitud padre
    local fecha_diff=$(run_sql "
        SELECT COUNT(DISTINCT ec.id) FROM eventos_confirmados ec
        JOIN solicitudes_fechas_bandas sf ON ec.id_solicitud = sf.id_solicitud
        WHERE ec.tipo_evento = 'BANDA' AND ec.fecha_evento != sf.fecha_evento
    ")
    
    if [ "$fecha_diff" -gt 0 ]; then
        log_error "eventos_confirmados: $fecha_diff bandas con fecha_evento INCONSISTENTE"
        echo "   Ejemplos:"
        run_sql "
            SELECT ec.id, ec.id_solicitud, ec.fecha_evento, sf.fecha_evento, sf.descripcion
            FROM eventos_confirmados ec
            JOIN solicitudes_fechas_bandas sf ON ec.id_solicitud = sf.id_solicitud
            WHERE ec.tipo_evento = 'BANDA' AND ec.fecha_evento != sf.fecha_evento
            LIMIT 5
        " | while read row; do echo "   $row"; done
    else
        log_ok "Todas las fechas en eventos_confirmados son consistentes ✓"
    fi
    
    echo ""
    log_warn "Conclusión: eventos_confirmados DUPLICA múltiples campos"
    log_warn "Riesgo: Causadesincronización cuando datos cambian en tablas origen"
}

# ============================================================================
# AUDITORÍA 5: CONSISTENCIA DE DESCRIPCIÓN
# ============================================================================

audit_descripcion() {
    log_section "AUDITORÍA 5: Campos de Descripción Duplicados"
    
    echo "Verificando redundancia en campos de descripción..."
    
    # En solicitudes hay: descripcion_corta, descripcion_larga, descripcion
    local desc_fields=$(run_sql "
        SELECT COUNT(COLUMN_NAME) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'solicitudes' AND TABLE_SCHEMA = 'tdc_db'
          AND COLUMN_NAME LIKE '%descripcion%'
    ")
    
    log_error "solicitudes tiene $desc_fields campos con 'descripcion' (debería ser 1-2)"
    run_sql "
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'solicitudes' AND TABLE_SCHEMA = 'tdc_db'
          AND COLUMN_NAME LIKE '%descripcion%'
    " | while read col; do echo "   - $col"; done
    
    echo ""
    log_warn "Conclusión: Problemas de nomenclatura en campos de descripción"
    log_warn "Recomendación: Unificar a descripcion_corta + descripcion_larga SOLAMENTE"
}

# ============================================================================
# AUDITORÍA 6: DISTRIBUCIÓN DE DATOS
# ============================================================================

audit_distribucion_datos() {
    log_section "AUDITORÍA 6: Distribución de Registros por Tipo"
    
    echo "Analizando distribuición de solicitudes por categoría..."
    
    run_sql "
        SELECT 
            s.categoria,
            COUNT(*) total,
            SUM(CASE WHEN s.estado = 'Confirmado' THEN 1 ELSE 0 END) confirmados,
            SUM(CASE WHEN s.estado = 'Cancelado' THEN 1 ELSE 0 END) cancelados
        FROM solicitudes s
        GROUP BY s.categoria
        ORDER BY total DESC
    " | while read row; do
        # Mostrar en formato más legible
        category=$(echo "$row" | awk '{print $1}')
        total=$(echo "$row" | awk '{print $2}')
        confirmed=$(echo "$row" | awk '{print $3}')
        cancelled=$(echo "$row" | awk '{print $4}')
        echo "  $category: $total total, $confirmed confirmados, $cancelled cancelados"
    done
    
    echo ""
    log_ok "Distribución de datos completada"
}

# ============================================================================
# RESUMEN EJECUTIVO
# ============================================================================

print_summary() {
    echo ""
    log_title "RESUMEN EJECUTIVO DE REDUNDANCIA"
    
    echo "${MAGENTA}PROBLEMAS CRÍTICOS:${NC}"
    echo "  ${RED}✗${NC} Campo 'estado' duplicado en 2 tablas"
    echo "  ${RED}✗${NC} Campo 'es_publico' triplicado (causa sincronización)"
    echo "  ${RED}✗${NC} Campo 'nombre_evento' NULL en eventos_confirmados"
    echo "  ${RED}✗${NC} Múltiples campos de descripción sin claridad"
    
    echo ""
    echo "${MAGENTA}RECOMENDACIONES INMEDIATAS:${NC}"
    echo "  ${GREEN}1.${NC} Eliminar solicitudes_alquiler.estado"
    echo "  ${GREEN}2.${NC} Eliminar solicitudes_fechas_bandas.estado"
    echo "  ${GREEN}3.${NC} Eliminar solicitudes_fechas_bandas.es_publico"
    echo "  ${GREEN}4.${NC} Establecer triggers para sincronizar eventos_confirmados"
    echo "  ${GREEN}5.${NC} Consolidar campos descripcion_* → descripcion_corta + descripcion_larga"
    
    echo ""
    echo "${MAGENTA}ESFUERZO ESTIMADO:${NC}"
    echo "  • Fase 1 (Eliminar redundancias simples): 3-5 días"
    echo "  • Fase 2 (Sincronización garantizada): 1-2 semanas"
    echo "  • Fase 3 (Consolidación completa): 3-4 semanas"
    
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    log_title "AUDITORÍA DE REDUNDANCIA Y SINCRONIZACIÓN - TDC API"
    
    # Verificar conexión a BD
    if ! run_sql "SELECT 1" > /dev/null 2>&1; then
        log_error "No se puede conectar a MariaDB"
        echo "Asegúrate de que docker-compose está corriendo:"
        echo "  cd /home/almacen/tdcApiRest && ./start-clean.sh up"
        exit 1
    fi
    
    log_ok "Conexión a BD establecida"
    
    # Ejecutar todas las auditorías
    audit_campo_estado
    audit_campo_es_publico
    audit_campos_temporales
    audit_eventos_confirmados
    audit_descripcion
    audit_distribucion_datos
    
    # Resumen
    print_summary
    
    echo -e "${BLUE}Para más detalles, ver:${NC}"
    echo "  • ANALISIS_RELACIONAL_DETALLADO.md"
    echo "  • ANALISIS_REDUNDANCIA_TABLAS.md"
}

# Ejecutar
main "$@"

