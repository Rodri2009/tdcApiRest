#!/bin/bash

# colors.sh - Definición de colores ANSI para salida en consola

# Formato de texto
BOLD='\033[1m'
DIM='\033[2m'
UNDERLINE='\033[4m'
BLINK='\033[5m'
REVERSE='\033[7m'
HIDDEN='\033[8m'

# Colores de texto (foreground)
BLACK='\033[30m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
MAGENTA='\033[35m'
CYAN='\033[36m'
WHITE='\033[37m'

# Colores de fondo (background)
BG_BLACK='\033[40m'
BG_RED='\033[41m'
BG_GREEN='\033[42m'
BG_YELLOW='\033[43m'
BG_BLUE='\033[44m'
BG_MAGENTA='\033[45m'
BG_CYAN='\033[46m'
BG_WHITE='\033[47m'

# Reset (No Color)
NC='\033[0m' # No Color

# Exportar variables para que estén disponibles en los scripts que importen este archivo
export BOLD DIM UNDERLINE BLINK REVERSE HIDDEN
export BLACK RED GREEN YELLOW BLUE MAGENTA CYAN WHITE
export BG_BLACK BG_RED BG_GREEN BG_YELLOW BG_BLUE BG_MAGENTA BG_CYAN BG_WHITE
export NC