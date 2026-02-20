#!/bin/bash
set -e

echo "[entrypoint] Comprobando node_modules y dependencias..."
echo "[entrypoint] Argumentos recibidos: $@"

cd /app || exit 1

# Si no existe node_modules o el módulo 'uuid' no se puede requerir, instalamos dependencias
need_install=0
if [ ! -d node_modules ]; then
  need_install=1
else
  # Intenta requerir 'uuid' para validar una dependencia crítica
  node -e "require('uuid')" >/dev/null 2>&1 || need_install=1
fi

if [ "$need_install" -eq 1 ]; then
  echo "[entrypoint] node_modules parece faltar o faltan paquetes. Ejecutando 'npm install' en /app..."
  npm install
  echo "[entrypoint] npm install finalizado."
else
  echo "[entrypoint] node_modules y dependencias presentes."
fi

echo "[entrypoint] Iniciando la aplicación..."
exec node --unhandled-rejections=warn server.js "$@"
