#!/bin/bash

# ==============================================================================
# Script de Reseteo Rápido para el Entorno TDC
#
# Uso: ./reset.sh
#
# Este script realiza un ciclo completo de DESTRUCCIÓN y RECONSTRUCCIÓN:
#   1. Valida que el archivo .env exista.
#   2. Destruye todos los contenedores, redes Y VOLÚMENES (incluyendo la base de datos).
#   3. Reconstruye las imágenes de Docker desde cero (para aplicar cambios en el backend).
#   4. Levanta un entorno completamente nuevo.
#
# ADVERTENCIA: Este proceso es DESTRUCTIVO. Todos los datos en la base de datos
# (incluyendo solicitudes de prueba) serán eliminados permanentemente.
# La base de datos se recreará usando los scripts `schema.sql` y `seed.sql`.
# ==============================================================================

# --- Sección de Configuración ---
ENV_FILE=".env"
COMPOSE_FILE="docker/docker-compose.yml"
COMPOSE_CMD="docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE"

echo "--- 🚀 Iniciando Reseteo Rápido del Entorno TDC ---"
echo "ADVERTENCIA: Se eliminarán todos los datos de la base de datos."

# --- Fase 1: Validación ---
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR: No se encuentra el archivo de configuración '$ENV_FILE'. Abortando."
    exit 1
fi
echo "✅ Archivo '.env' encontrado."

# --- Fase 2: Destrucción Completa ---
echo ""
echo "--- 🗑️  Paso 1: Destruyendo entorno anterior (incluyendo volúmenes de base de datos)... ---"
$COMPOSE_CMD down --volumes
if [ $? -ne 0 ]; then
    echo "❌ ERROR: 'docker-compose down' falló. Por favor, revisa los mensajes de arriba."
    exit 1
fi
echo "✅ Entorno anterior completamente eliminado."

# --- Fase 3: Reconstrucción y Arranque ---
echo ""
echo "--- ✨ Paso 2: Reconstruyendo y levantando el entorno desde cero... ---"
# El flag --build es crucial aquí para aplicar cualquier cambio que hayas hecho en el backend
$COMPOSE_CMD up --build -d
if [ $? -ne 0 ]; then
    echo "❌ ERROR: 'docker-compose up' falló. Por favor, revisa los mensajes de arriba."
    exit 1
fi

# Esperar que la DB esté lista
echo "--- 🔎 Esperando que MariaDB esté lista para aceptar conexiones... ---"
TRIES=0
MAX_TRIES=30
until $COMPOSE_CMD exec -T mariadb mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; do
    TRIES=$((TRIES+1))
    if [ $TRIES -ge $MAX_TRIES ]; then
        echo "❌ ERROR: MariaDB no respondió después de $MAX_TRIES intentos. Abortando."
        exit 1
    fi
    sleep 2
done

# --- Aplicar migraciones (si existen) ---
# Nota: las migraciones en database/migrations se aplican **solo** cuando ejecutás ./reset.sh
MIG_DIR="database/migrations"
if [ -d "$MIG_DIR" ] && ls $MIG_DIR/*.sql >/dev/null 2>&1; then
    echo "--- ⤴️  Aplicando migraciones SQL desde $MIG_DIR ---"
    for sqlfile in $(ls $MIG_DIR/*.sql | sort); do
        echo "Aplicando: $sqlfile"
        if ! cat "$sqlfile" | $COMPOSE_CMD exec -T mariadb sh -c "mysql -u root -p\"$MARIADB_ROOT_PASSWORD\" \"$MARIADB_DATABASE\""; then
            echo "❌ ERROR: Falló la migración $sqlfile. Revirtiendo al estado base..."
            echo "--- 🔁 Revirtiendo: deteniendo y recreando el entorno base (volverá a cargar schema+seed) ---"
            $COMPOSE_CMD down --volumes
            $COMPOSE_CMD up --build -d
            echo "❌ RESET ABORTADO: las migraciones no se aplicaron correctamente. El entorno fue restaurado al estado base."
            exit 1
        fi
    done
    echo "--- ✅ Migraciones aplicadas correctamente ---"
else
    echo "--- ℹ️ No se encontraron migraciones en $MIG_DIR (o no hay archivos .sql) ---"
fi

# --- Fase 4: Información Final ---
echo ""
echo "--- ✅ ¡Reseteo completado! ---"
echo "La base de datos ha sido recreada y los datos semilla de tus archivos CSV han sido recargados."
echo ""

echo "--- Mostrando estado de los contenedores (espera unos segundos a que se estabilicen)... ---"
sleep 5 # Damos 5 segundos para que los healthchecks empiecen a correr
$COMPOSE_CMD ps

echo ""
echo "--- Siguientes Pasos Sugeridos ---"
echo "Para ver los logs del backend en tiempo real:"
echo "docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend"