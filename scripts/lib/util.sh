#!/bin/bash

# util.sh - Funciones de utilidad reutilizables

# Imprime un encabezado con un título opcional
print_header() {
    local title="$1"
    local width=60
    local padding=$(( (width - ${#title}) / 2 ))
    local left_pad=$(printf '%*s' "$padding" '')
    local right_pad=$(printf '%*s' "$((width - ${#title} - padding))" '')

    echo -e "${BLUE}${left_pad}${BOLD}${title}${NC}${BLUE}${right_pad}${NC}"
    echo
}

# Imprime una línea separadora
print_separator() {
    local char="${1:-=}"
    local length=${2:-60}
    printf "%*s\n" "$length" | tr ' ' "$char"
}

# Enmascara valores sensibles (como contraseñas) mostrando solo los primeros y últimos caracteres
mask_sensitive_values() {
    local value="$1"
    local visible_chars=${2:-3}  # Número de caracteres visibles al inicio y al final

    if [[ -z "$value" || ${#value} -le $((visible_chars * 2)) ]]; then
        echo "$value"
        return
    fi

    local start="${value:0:$visible_chars}"
    local end="${value: -$visible_chars}"
    local mask_length=$(( ${#value} - (visible_chars * 2) ))
    local mask=$(printf '%*s' "$mask_length" | tr ' ' '*')

    echo "${start}${mask}${end}"
}

# Verifica si un comando está instalado en el sistema
is_command_installed() {
    command -v "$1" &> /dev/null
}

# Verifica si un archivo existe
exists_file() {
    [[ -f "$1" ]]
}

# Verifica si un directorio existe
exists_directory() {
    [[ -d "$1" ]]
}

# Solicita confirmación al usuario (sí/no)
# Devuelve 0 para sí, 1 para no
confirm() {
    local prompt="$1"
    local default="${2:-n}"  # Por defecto, asumimos 'no' si no se especifica

    local choice
    read -rp "$prompt [y/N] " choice

    case "$choice" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Pausa la ejecución hasta que el usuario presione Enter
pause() {
    local message="${1:-Presione Enter para continuar...}"
    read -rp "$message"
}

# Muestra un spinner mientras se ejecuta un comando en segundo plano
# Uso: spinner "Mensaje" & comando; wait $!; kill $!
spinner() {
    local message="$1"
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $!)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  %s" "$spinstr" "$message"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Exportar funciones para que estén disponibles en los scripts que importen este archivo
export -f print_header print_separator mask_sensitive_values is_command_installed exists_file exists_directory confirm pause spinner