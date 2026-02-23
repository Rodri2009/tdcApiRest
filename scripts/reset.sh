#!/bin/bash

# ==============================================================================
# Script de Reseteo Rápido para el Entorno TDC
#
# Uso: ./reset.sh [OPTIONS]
#
# Opciones:
#   --delete-uploads Elimina todas las imágenes subidas (bandas, flyers)
#                    Sin este flag, se mantienen todos los uploads
#
# Este script realiza un ciclo completo de DESTRUCCIÓN y RECONSTRUCCIÓN:
#   1. Valida que el archivo .env exista.
#   2. Destruye todos los contenedores, redes Y VOLÚMENES (incluyendo la base de datos).
#   3. Opcionalmente elimina imágenes subidas (backend/uploads/)
#   4. Reconstruye las imágenes de Docker desde cero (para aplicar cambios en el backend).
#   5. Levanta un entorno completamente nuevo.
#
# ADVERTENCIA: Este proceso es DESTRUCTIVO. Todos los datos en la base de datos
# (incluyendo solicitudes de prueba) serán eliminados permanentemente.
# La base de datos se recreará usando los scripts `schema.sql` y `seed.sql`.
# Las imágenes subidas se PRESERVAN por defecto. Usa --delete-uploads para eliminarlas.
# ==============================================================================

# --- Sección de Configuración ---
ENV_FILE=".env"
COMPOSE_FILE="docker/docker-compose.yml"
COMPOSE_CMD="docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE"

# Control de uploads
DELETE_UPLOADS=false

# Soportar flags
DEBUG_FLAGS=""
while [ $# -gt 0 ]; do
  case "$1" in
    -v|--verbose|-e|--error|-d|--debug|-h|--help)
      DEBUG_FLAGS="$DEBUG_FLAGS $1"
      shift
      ;;
    --delete-uploads)
      DELETE_UPLOADS=true
      echo "⚠️  Flag --delete-uploads activado: se eliminarán todas las imágenes subidas"
      shift
      ;;
    *)
      echo "❌ Argumento desconocido: $1"
      echo "Flags soportados: -v, -e, -d, --verbose, --error, --debug, --help, --delete-uploads"
      exit 1
      ;;
  esac
done

# Si hay DEBUG_FLAGS, mostrar qué se está usando
if [ -n "$DEBUG_FLAGS" ]; then
  echo "ℹ️  Debug flags detectados: $DEBUG_FLAGS"
  export DEBUG_FLAGS
fi

echo "--- 🚀 Iniciando Reseteo Rápido del Entorno TDC ---"
echo "ADVERTENCIA: Se eliminarán todos los datos de la base de datos."

# --- Fase 1: Validación ---
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR: No se encuentra el archivo de configuración '$ENV_FILE'. Abortando."
    exit 1
fi
echo "✅ Archivo '.env' encontrado."

# Cargar variables del archivo .env
source "$ENV_FILE"

# --- Fase 2: Destrucción Completa ---
echo ""
echo "--- 🗑️  Paso 1: Destruyendo entorno anterior (incluyendo volúmenes de base de datos)... ---"

# ⚠️ PRIMERO: Limpiar todos los contenedores duplicados que hayan quedado
echo "Limpiando contenedores duplicados que puedan haber quedado..."
docker ps -a --filter "name=docker-backend" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=docker-backend-run-" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=docker-nginx" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=docker-mariadb" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
echo "✅ Contenedores viejos limpiados"
echo ""

# Ahora hacer down normal (debería ser rápido porque no hay mucho que limpiar)
$COMPOSE_CMD down --volumes
if [ $? -ne 0 ]; then
    echo "❌ ERROR: 'docker-compose down' falló. Por favor, revisa los mensajes de arriba."
    exit 1
fi
echo "✅ Entorno anterior completamente eliminado."

# --- Limpieza Opcional de Uploads ---
if [ "$DELETE_UPLOADS" = true ]; then
    echo ""
    echo "--- 🗑️  Paso 1.5: Eliminando imágenes subidas (bandas, flyers)... ---"
    rm -rf "backend/uploads/bandas" "backend/uploads/flyers" "/app/uploads/bandas" "/app/uploads/flyers" 2>/dev/null
    echo "✅ Directorios de uploads eliminados."
else
    echo ""
    echo "--- ✔️  Paso 1.5: Preservando imágenes subidas (sin --delete-uploads)... ---"
    echo "✅ Los directorios backend/uploads/ se mantienen intactos."
fi

# --- Fase 3: Reconstrucción y Arranque ---
echo ""
echo "--- ✨ Paso 2: Reconstruyendo y levantando el entorno desde cero... ---"
# El flag --build es crucial aquí para aplicar cualquier cambio que hayas hecho en el backend
# IMPORTANTE: Siempre levantar TODOS los servicios (mariadb, backend, nginx)
# Los DEBUG_FLAGS se pasan vía variable de entorno (exportada arriba si fueron especificados)
$COMPOSE_CMD up --build -d
if [ $? -ne 0 ]; then
    echo "❌ ERROR: 'docker-compose up' falló. Por favor, revisa los mensajes de arriba."
    exit 1
fi

# Esperar que la DB esté lista (aproximación simple pero confiable)
echo "--- 🔎 Esperando que MariaDB esté lista para aceptar conexiones... ---"
# Simplemente esperamos un tiempo fijo que es suficiente para que MariaDB inicie
# Los healthchecks de docker-compose también validan que esté healthy
sleep 15
echo "✅ MariaDB debería estar listo ahora"

# --- Aplicar migraciones (si existen) ---
# Nota: las migraciones en database/migrations se aplican **solo** cuando ejecutás ./reset.sh
MIG_DIR="database/migrations"
if [ -d "$MIG_DIR" ] && ls $MIG_DIR/*.sql >/dev/null 2>&1; then
    echo "--- ⤴️  Aplicando migraciones SQL desde $MIG_DIR ---"
    for sqlfile in $(ls $MIG_DIR/*.sql | sort); do
        # Saltar migraciones archivadas (consolidadas en `01_schema.sql` / `02_seed.sql`)
        if grep -q '^-- ARCHIVED:' "$sqlfile" 2>/dev/null; then
            echo "Saltando migración archivada: $sqlfile"
            continue
        fi
        echo "Aplicando: $sqlfile"
        # Ejecutar migración directamente sin sh -c intermedio (más confiable)
        if ! cat "$sqlfile" | $COMPOSE_CMD exec -T mariadb mysql -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE" 2>&1; then
            echo "⚠️  Advertencia: hay errores en $sqlfile, pero continuando..."
            # No abortar en primer error - algunas migraciones pueden tener REPLACE INTO que son idempotentes
        fi
    done
    echo "--- ✅ Migraciones procesadas ---"
else
    echo "--- ℹ️ No se encontraron migraciones en $MIG_DIR (o no hay archivos .sql) ---"
fi

# --- Nota: verificación/fixes automáticos retirados ---
# Las utilidades `verify_and_fix_inconsistencies.sql` y `fix_inconsistencies.sql` han sido
# eliminadas del repositorio para simplificar el mantenimiento. Si necesitas ejecutar
# verificaciones o correcciones, sigue el procedimiento manual descrito en README.md
# bajo "Verificación manual (QA) — pasos rápidos". Las variables de entorno
# RUN_DB_VERIFICATION / APPLY_FIXES / FORCE_APPLY_FIXES ya no son utilizadas.

# --- Fase 4: Información Final ---
echo ""
echo "--- ✅ ¡Reseteo completado! ---"
echo "La base de datos ha sido recreada con los scripts iniciales."
echo ""
echo "--- 📊 Estado de los contenedores ---"
sleep 3  # Damos tiempo a que se estabilicen
$COMPOSE_CMD ps
echo ""
echo "--- 🚀 Backend levantado - Viendo logs (Ctrl+C para salir)... ---"
$COMPOSE_CMD logs -f backend