#!/bin/bash

# Script para verificar que todos los datos de seed y test se cargaron correctamente

echo "========================================="
echo "VERIFICACION DE DATOS CARGADOS EN BD"
echo "========================================="

DB_USER="root"
DB_PASS="sys8102root"
DB_NAME="tdc_db"
DB_HOST="docker-mariadb-1"

# Función para ejecutar query y contar
verify_table() {
    local table=$1
    local expected=$2
    local query=$3
    
    if [ -z "$query" ]; then
        query="SELECT COUNT(*) as cnt FROM $table"
    fi
    
    actual=$(docker exec $DB_HOST mysql -u$DB_USER -p$DB_PASS -D$DB_NAME -se "$query" | tail -1)
    
    if [ "$actual" -eq "$expected" ]; then
        echo "✅ $table: $actual registros (esperado: $expected)"
    else
        echo "❌ $table: $actual registros (esperado: $expected) - FALTA: $((expected - actual))"
    fi
}

echo ""
echo "=== TABLAS DE CONFIGURACION GENERAL ==="
verify_table "catalogo_instrumentos" 24
verify_table "catalogo_roles" 11
verify_table "configuracion" 7
verify_table "configuracion_horarios" 42

echo ""
echo "=== TABLAS DE BANDAS Y ARTISTAS ==="
verify_table "bandas_artistas" 39
verify_table "bandas_formacion" 26

echo ""
echo "=== TABLAS DE PERSONAL Y TARIFAS ==="
verify_table "personal_disponible" 6
verify_table "personal_tarifas" 6
verify_table "costos_personal_vigencia" 10

echo ""
echo "=== TABLAS DE PRECIOS Y OPCIONES ==="
verify_table "opciones_tipos" 14
verify_table "opciones_duracion" 22
verify_table "opciones_adicionales" 20
verify_table "opciones_adicionales_x_tipo_evento" 20
verify_table "precios_vigencia" 29
verify_table "precios_servicios" 6
verify_table "precios_talleres" 15
verify_table "roles_por_evento" 32

echo ""
echo "=== TABLAS DE SERVICIOS Y TALLERES ==="
verify_table "servicios_catalogo" 6
verify_table "talleres" 6
verify_table "talleristas" 4

echo ""
echo "=== TABLAS DE USUARIOS Y CLIENTES ==="
verify_table "usuarios" 2
verify_table "clientes" 13

echo ""
echo "=== TABLAS DE SOLICITUDES ==="
verify_table "solicitudes" 18
verify_table "solicitudes_alquiler" 11
verify_table "solicitudes_adicionales" 4
verify_table "solicitudes_fechas_bandas" 3
verify_table "solicitudes_servicios" 1
verify_table "solicitudes_talleres" 1

echo ""
echo "=== TABLAS DE EVENTOS Y LINEUPS ==="
verify_table "eventos_confirmados" 5
verify_table "eventos_lineup" 8

echo ""
echo "=== TABLAS VACIAS (NORMALMENTE) ==="
verify_table "solicitudes_personal" 0
verify_table "profesionales_servicios" 0
verify_table "eventos_bandas_invitadas" 0
verify_table "asistencias_talleres" 0
verify_table "inscripciones_talleres" 0
verify_table "personal_pagos" 0
verify_table "cupones" 0
verify_table "tickets" 0
verify_table "turnos_servicios" 0

echo ""
echo "========================================="
echo "VERIFICACION COMPLETADA"
echo "========================================="
