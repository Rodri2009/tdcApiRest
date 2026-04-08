#!/bin/bash

# Script para crear backup del proyecto completo con máxima compresión
# Excluye archivos según .gitignore

show_help() {
    cat <<EOF
Uso: $(basename "$0") [--help]

Crea un archivo tar.gz del proyecto excluyendo patrones en .gitignore.

Opciones:
  -h, --help  Muestra esta ayuda y sale.
EOF
}

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

set -e

PROJECT_DIR="/home/almacen/tdcApiRest"
BACKUP_DIR="/home/almacen"
TIMESTAMP=$(date +%Y-%m-%d)
BACKUP_FILENAME="tdcApiRest_backup_${TIMESTAMP}.tar.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# Verificar que el directorio del proyecto existe
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: El directorio $PROJECT_DIR no existe"
    exit 1
fi

# Verificar que .gitignore existe
if [ ! -f "$PROJECT_DIR/.gitignore" ]; then
    echo "❌ Error: El archivo $PROJECT_DIR/.gitignore no existe"
    exit 1
fi

echo "📦 Iniciando backup del proyecto..."
echo "   Origen: $PROJECT_DIR"
echo "   Destino: $BACKUP_PATH"
echo "   Compresión: Máxima (9)"
echo ""

# Crear backup con máxima compresión, excluyendo archivos en .gitignore
cd "$PROJECT_DIR" || exit 1

# Usar tar con máxima compresión (-9) y excluir según .gitignore
# --ignore-failed-read permite seguir aunque encuentre archivos inaccesibles
# (p.ej. perfiles Chromium/puppeteer con permisos restringidos)
tar --ignore-failed-read --exclude-from=.gitignore \
    -czf "$BACKUP_PATH" \
    --transform='s,^,tdcApiRest/,' \
    .

# Hacer dump de la DB (si existe el contenedor mariadb)
MYSQL_DUMP_FILE="/home/almacen/tdc_db_dump_${TIMESTAMP}.sql"
if docker ps --filter "name=mariadb" --filter "status=running" -q | grep -q .; then
    echo "📦 Volcando base de datos a ${MYSQL_DUMP_FILE}..."
    # Ajusta usuario y password según .env (DEBE existir)
    source "${PROJECT_DIR}/.env" 2>/dev/null || true
    if [ -z "$MARIADB_ROOT_PASSWORD" ]; then
        echo "⚠️  MARIADB_ROOT_PASSWORD no definido. Se omite el dump de DB."
    else
        docker exec -i docker-mariadb-1 mysqldump -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE" > "$MYSQL_DUMP_FILE"
        if [ $? -ne 0 ]; then
            echo "⚠️  No se pudo generar mysqldump. Continuando con backup de archivos..."
            rm -f "$MYSQL_DUMP_FILE"
        else
            echo "✅ Dump de DB creado: $MYSQL_DUMP_FILE"
        fi
    fi
else
    echo "⚠️  Contenedor MariaDB no encontrado/ejecutándose. Se omite dump de DB."
fi

# Verificar que el backup se creó correctamente
if [ -f "$BACKUP_PATH" ]; then
    SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    ORIG_SIZE=$(du -sh "$PROJECT_DIR" | cut -f1)
    echo ""
    echo "✅ Backup completado exitosamente"
    echo "   Archivo: $BACKUP_FILENAME"
    echo "   Tamaño: $SIZE"
    echo "   Tamaño original: ~$ORIG_SIZE"
    echo ""
    echo "📋 Información del backup:"
    tar -tzf "$BACKUP_PATH" | head -20 && echo "   ... (y más archivos)"

    # Limpiar dump temporal de DB local si fue creado
    if [ -f "$MYSQL_DUMP_FILE" ]; then
        rm -f "$MYSQL_DUMP_FILE"
    fi

    # Rotación de backups (mantener 7 últimos)
    echo "🔄 Rotando backups (mantener últimos 7)..."
    ls -1t "$BACKUP_DIR"/tdcApiRest_backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -v
else
    echo "❌ Error: No se pudo crear el backup"
    exit 1
fi
