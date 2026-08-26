#!/bin/bash

# args.sh - Parseo centralizado de argumentos de línea de comandos

# Variables globales que serán establecidas por parse_arguments
DEBUG=false
ENABLE_MP=false
ENABLE_WA=false
SAVE_MP_SESSION=false
SAVE_WA_SESSION=false
REBUILD_IMAGES=false
CONTAINERS_TO_RESET=()
SQL_SCRIPTS=()
SKIP_SQL=false
SKIP_BACKUP=false
USE_LATEST_DUMP=false

# Función para parsear los argumentos
parse_arguments() {
    # Resetear variables a sus valores por defecto (en caso de que se llame múltiples veces)
    DEBUG=false
    ENABLE_MP=false
    ENABLE_WA=false
    SAVE_MP_SESSION=false
    SAVE_WA_SESSION=false
    REBUILD_IMAGES=false
    CONTAINERS_TO_RESET=()
    SQL_SCRIPTS=()
    SKIP_SQL=false
    SKIP_BACKUP=false
    USE_LATEST_DUMP=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --debug)
                DEBUG=true
                shift
                ;;
            --enable-mp)
                ENABLE_MP=true
                shift
                ;;
            --enable-wa)
                ENABLE_WA=true
                shift
                ;;
            --save-mp-session)
                SAVE_MP_SESSION=true
                shift
                ;;
            --save-wa-session)
                SAVE_WA_SESSION=true
                shift
                ;;
            --rebuild-images)
                REBUILD_IMAGES=true
                shift
                ;;
            --containers-to-reset)
                shift
                # Si el siguiente argumento no es una opción, lo añadimos a la lista
                while [[ $# -gt 0 && ! "$1" =~ ^-- ]]; do
                    # Dividir por coma y/o espacios y añadir cada elemento
                    IFS=',' read -ra ADDR <<< "$1"
                    for item in "${ADDR[@]}"; do
                        # Eliminar espacios en blanco
                        item=$(echo "$item" | xargs)
                        if [[ -n "$item" ]]; then
                            CONTAINERS_TO_RESET+=("$item")
                        fi
                    done
                    shift
                done
                ;;
            --sql-scripts)
                shift
                while [[ $# -gt 0 && ! "$1" =~ ^-- ]]; do
                    IFS=',' read -ra ADDR <<< "$1"
                    for item in "${ADDR[@]}"; do
                        item=$(echo "$item" | xargs)
                        if [[ -n "$item" ]]; then
                            SQL_SCRIPTS+=("$item")
                        fi
                    done
                    shift
                done
                ;;
            --skip-sql)
                SKIP_SQL=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --use-latest-dump)
                USE_LATEST_DUMP=true
                shift
                ;;
            --help|-h)
                # Esta opción será manejada por messages.sh, pero podemos hacer un eco básico aquí si se llama directamente
                echo "Uso: $0 [opciones]"
                echo "Opciones:"
                echo "  --debug                         Activar modo depuración"
                echo "  --enable-mp                     Habilitar MercadoPago"
                echo "  --enable-wa                     Habilitar WhatsApp"
                echo "  --save-mp-session               Guardar sesión de MercadoPago"
                echo "  --save-wa-session               Guardar sesión de WhatsApp"
                echo "  --rebuild-images                Reconstruir imágenes de Docker"
                echo "  --containers-to-reset <lista>   Lista de contenedores a resetear (separados por coma o espacio)"
                echo "  --sql-scripts <lista>           Lista de scripts SQL a ejecutar (separados por coma o espacio)"
                echo "  --skip-sql                      Omitir ejecución de scripts SQL"
                echo "  --skip-backup                   Omitir respaldo de base de datos"
                echo "  --use-latest-dump               Usar el último volcado disponible"
                echo "  -h, --help                      Mostrar esta ayuda"
                exit 0
                ;;
            *)
                echo "Opción desconocida: $1" >&2
                exit 1
                ;;
        esac
    done

    # Exportar variables para que estén disponibles en los scripts que importen este archivo
    export DEBUG ENABLE_MP ENABLE_WA SAVE_MP_SESSION SAVE_WA_SESSION
    export REBUILD_IMAGES CONTAINERS_TO_RESET SQL_SCRIPTS
    export SKIP_SQL SKIP_BACKUP USE_LATEST_DUMP
}

# Si el archivo se ejecuta directamente (no se sourcea), mostrar ayuda
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
fi