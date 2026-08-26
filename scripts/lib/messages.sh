#!/bin/bash

# messages.sh - Centraliza toda la salida por consola

# Imprime un mensaje de ayuda
print_help() {
    cat << 'EOF'
Uso: ./reset.sh [opciones]

Opciones de contenedores (destructivas):
  --all            Destruye y levanta TODO (defecto si no usa flags)
  --db             Solo base de datos (mariadb)
  --backend        Solo backend (app node.js)
  --frontend       Solo frontend (nginx)
  --all-rebuild    Todo con rebuild de imágenes (--build)

Opciones de SQL:
  --no-sql         No ejecuta scripts SQL (solo levanta contenedores)
  --skip-test      No carga 03_test_data.sql (solo schema + seed)
  --only-schema    Solo carga 01_schema.sql
  --only-seed      Solo carga 02_seed.sql
  --only-test      Solo carga 03_test_data.sql
  --use-latest-dump Usa database/mysqldump_latest.sql para restaurar todo (ignore 01/02/03).

Opciones de Servicios (Puppeteer):
  --mp             Habilita Mercado Pago (ENABLE_PUPPETEER_MP=true)
  --wa             Habilita WhatsApp (ENABLE_PUPPETEER_WA=true)

Opciones de respaldo de sesión (no destruyen datos existentes, simplemente
copian/recuperan carpetas en backend/profile):
  --save-mp        Si va a reiniciar contenedores con MP, guarda/restaura
                   la carpeta mp-profile antes/después del reset
  --save-wa        parecido para wa-profile
  --save-all       alias para los dos anteriores (mp+wa)

Opciones de backup:
  --no-backup      Omite el backup automático previo al reset

Opciones de debug:
  -d, --debug      Muestra debug detallado (no engancha logs en tiempo real)
  -l, --local      Fuerza MySQL local (sin Docker)
  -h, --help       Muestra esta ayuda

Ejemplos:
  ./reset.sh                    # Todos los contenedores + reset BD
  ./reset.sh --db               # Solo mariadb + reset BD
  ./reset.sh --backend -d       # Solo backend (usa backend_logs.sh para ver salida)
  ./reset.sh --db --skip-test   # DB sin datos de prueba
  ./reset.sh --all-rebuild -d   # Todo con rebuild + logs
  ./reset.sh --mp --wa -d       # Con WA y MP habilitados + debug
EOF
}

# Imprime un mensaje de éxito
print_success() {
    local message="$1"
    echo -e "${GREEN}[✓] $message${NC}"
}

# Imprime un mensaje de error
print_error() {
    local message="$1"
    echo -e "${RED}[✗] $message${NC}" >&2
}

# Imprime un mensaje de advertencia
print_warning() {
    local message="$1"
    echo -e "${YELLOW}[!] $message${NC}"
}

# Imprime un mensaje informativo
print_info() {
    local message="$1"
    echo -e "${BLUE}[i] $message${NC}"
}

# Imprime un resumen de las acciones realizadas
print_summary() {
    echo
    print_separator "="
    echo "RESUMEN DE ACCIONES"
    print_separator "-"
    # Las variables que se imprimirán deben ser establecidas por los scripts principales
    # Este es un ejemplo, los scripts principales deberán establecer las variables apropiadas
    echo "Contenedores reseteados: ${CONTAINERS_TO_RESET[*]:-ninguno}"
    echo "Se ejecutó backup: ${BACKUP_PERFORMED:-no}"
    echo "Se ejecutó restauración de BD: ${DB_RESTORED:-no}"
    echo "Se restauraron perfiles: ${PROFILES_RESTORED:-no}"
    echo "Estado de salud: ${HEALTH_STATUS:-desconocido}"
    print_separator "="
    echo
}

# Exportar funciones para que estén disponibles en los scripts que importen este archivo
export -f print_help print_success print_error print_warning print_info print_summary