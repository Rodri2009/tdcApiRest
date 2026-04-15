#!/bin/bash

# Script para verificar consistencia entre seed.sql y mysqldump_latest.sql

SEED="database/02_seed.sql"
DUMP="database/mysqldump_latest.sql"

echo "🔍 ANÁLISIS DE CONSISTENCIA: seed.sql vs mysqldump_latest.sql"
echo "==================================================================\n"

# 1. Contar número de INSERT statements por tabla

echo "📊 CANTIDAD DE INSERTS POR TABLA:"
echo "================================"

for tabla in "bandas_artistas" "solicitudes" "solicitudes_fechas_bandas" "solicitudes_talleres" "eventos_confirmados"; do
    seed_count=$(grep -c "INSERT INTO \`$tabla\`" "$SEED" || echo "0")
    dump_count=$(grep -c "INSERT INTO \`$tabla\`" "$DUMP" || echo "0")
    
    if [ "$seed_count" != "$dump_count" ]; then
        echo "❌ $tabla: SEED=$seed_count, DUMP=$dump_count (INCONSISTENCIA)"
    else
        echo "✓ $tabla: SEED=$seed_count, DUMP=$dump_count (OK)"
    fi
done

echo -e "\n📅 FECHAS DE SOLICITUDES CRÍTICAS:"
echo "==================================="

# Buscar fechas de las solicitudes públicas clave
for sol_id in 4 5 6 8; do
    echo -e "\n🔹 Solicitud $sol_id:"
    
    # En seed.sql
    seed_date=$(grep -o "2026-[0-9][0-9]-[0-9][0-9]" "$SEED" | sort -u | head -5)
    
    # En mysqldump
    dump_date=$(grep -o "2026-[0-9][0-9]-[0-9][0-9]" "$DUMP" | sort -u | head -5)
done

echo -e "\n⚠️  FECHAS EN SEED.SQL (muestreo):"
grep "2026-04\|2026-05" "$SEED" | head -10

echo -e "\n⚠️  FECHAS EN MYSQLDUMP_LATEST.SQL (muestreo):"
grep "2026-04\|2026-05" "$DUMP" | head -10
