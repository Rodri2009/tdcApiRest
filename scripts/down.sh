#!/bin/bash

# down.sh - Detiene y elimina contenedores, redes y volúmenes definidos en docker-compose.yml

source "$(dirname "$0")/lib/config.sh"
source "$(dirname "$0")/lib/args.sh"
source "$(dirname "$0")/lib/messages.sh"

parse_arguments "$@"

docker_down

print_summary