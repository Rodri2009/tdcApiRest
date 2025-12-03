#!/bin/bash
#
# Script de inicialización completa de la BD
# Ejecuta todos los scripts SQL en orden correcto
#

set -e

echo "🚀 Iniciando inicialización completa de la BD..."

# Variables de conexión
MYSQL_CMD="mysql -h localhost -u root -p${MARIADB_ROOT_PASSWORD}"

# 1. SCHEMA
echo "📋 Ejecutando schema principal..."
echo "USE tdc;" | cat - /docker-entrypoint-initdb.d/1_schema.sql | $MYSQL_CMD
echo "USE tdc;" | cat - /docker-entrypoint-initdb.d/1_schema_tickets.sql | $MYSQL_CMD

# 2. SEEDS
echo "🌱 Ejecutando seeds..."
echo "USE tdc;" | cat - /docker-entrypoint-initdb.d/2_seed.sql | $MYSQL_CMD
echo "USE tdc;" | cat - /docker-entrypoint-initdb.d/2_seed_tickets.sql | $MYSQL_CMD

# 3-9. MIGRACIONES
echo "🔧 Ejecutando migraciones..."
for script in \
  /docker-entrypoint-initdb.d/3_migration_add_event_prices_and_coupon_scope.sql \
  /docker-entrypoint-initdb.d/4_create_subtables_eventos.sql \
  /docker-entrypoint-initdb.d/5_migration_add_categoria_opciones_tipos.sql \
  /docker-entrypoint-initdb.d/6_migration_bandas_solicitudes.sql \
  /docker-entrypoint-initdb.d/7_migration_add_precios_bandas.sql \
  /docker-entrypoint-initdb.d/8_create_eventos_personal.sql \
  /docker-entrypoint-initdb.d/9_add_estado_to_eventos.sql; do
  
  if [ -f "$script" ]; then
    echo "  ✓ Ejecutando $(basename $script)..."
    echo "USE tdc;" | cat - "$script" | $MYSQL_CMD || echo "  ⚠️  Error en $(basename $script), continuando..."
  fi
done

# 10. RESTAURAR DATOS SENSIBLES
echo "🔐 Restaurando datos sensibles..."
if [ -f /docker-entrypoint-initdb.d/10_restore_sensitive.sql ]; then
  echo "USE tdc;" | cat - /docker-entrypoint-initdb.d/10_restore_sensitive.sql | $MYSQL_CMD || echo "⚠️  Error restaurando datos sensibles"
else
  echo "⚠️  No hay datos sensibles para restaurar"
fi

echo "✅ Inicialización completada!"
