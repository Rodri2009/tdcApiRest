#!/bin/bash

# config.sh - Configuración centralizada para los scripts de infraestructura

# Directorios base
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/lib"
DOCKER_DIR="$PROJECT_DIR/docker"
SQL_DIR="$PROJECT_DIR/database"

# Configuración de la base de datos
DB_NAME="${DB_NAME:-tdc_db}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

# Flags globales (serán sobrescritos por args.sh)
USE_DOCKER="${USE_DOCKER:-true}"
USE_LOCAL="${USE_LOCAL:-false}"

# Otras configuraciones
# Añadir aquí cualquier otra variable de configuración necesaria

export PROJECT_DIR SCRIPT_DIR LIB_DIR DOCKER_DIR SQL_DIR
export DB_NAME DB_USER DB_PASSWORD DB_HOST DB_PORT
export USE_DOCKER USE_LOCAL