#!/bin/sh
set -e

echo "[entrypoint] Comprobando node_modules y dependencias..."

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
  echo "[entrypoint] node_modules y dependencias presentes. TODO OK"
fi

echo "[entrypoint] Iniciando la aplicación..."

# ============================================================================
# INICIAR XVFB Y VNC SI ESTÁN HABILITADOS
# ============================================================================
# Variables de entorno para controlar Xvfb/VNC:
#   ENABLE_VNC=true     → Inicia Xvfb + x11vnc para debugging
#   HEADLESS=true       → Solo headless (sin VNC)

ENABLE_VNC="${ENABLE_VNC:-false}"

if [ "$ENABLE_VNC" = "true" ]; then
  echo "[entrypoint] 🖥️  Iniciando Xvfb en display :1 (1920x1080, 24-bit)..."
  
  # Iniciar Xvfb (servidor X virtual)
  # :1 = display number
  # -screen 0 1920x1080x24 = resolución y profundidad de color
  # -nolisten tcp = no escucha conexiones TCP de X11 (seguridad)
  Xvfb :1 -screen 0 1920x1080x24 -nolisten tcp &
  XVFB_PID=$!
  
  echo "[entrypoint] ✓ Xvfb iniciado (PID: $XVFB_PID)"
  
  sleep 2  # Dar tiempo a Xvfb para inicializar
  
  echo "[entrypoint] 🔌 Iniciando x11vnc en puerto 5901..."
  
  # Iniciar x11vnc
  # -display :1 = conectar a Xvfb
  # -forever = mantener corriendo
  # -nopw = sin contraseña
  # -listen localhost = solo escuchar en localhost
  # -noxkb = sin teclado X11 (simplifica)
  # -noxdamage = sin damagea X11
  x11vnc -display :1 -forever -nopw -listen localhost -rfbport 5901 -noxkb -noxdamage -bg -quiet
  
  echo "[entrypoint] ✓ VNC disponible en localhost:5901"
  echo "[entrypoint] 📱 Conexión: VNC Viewer → 127.0.0.1:5901 (sin contraseña)"
  
  # Exportar DISPLAY para que Node.js sepa dónde está el servidor X
  export DISPLAY=:1
else
  echo "[entrypoint] ℹ️  VNC deshabilitado (ENABLE_VNC!=true)"
fi

# ============================================================================
# INICIAR APLICACIÓN NODE.JS
# ============================================================================

# Soportar DEBUG_FLAGS desde variable de entorno
# Ejemplo: docker run -e DEBUG_FLAGS="-d" ...
NODE_ARGS=""
if [ -n "$DEBUG_FLAGS" ]; then
  echo "[entrypoint] DEBUG_FLAGS detectado: $DEBUG_FLAGS"
  NODE_ARGS="$DEBUG_FLAGS"
fi

# Pasar argumentos también si se proporcionan directamente ($@)
if [ $# -gt 0 ]; then
  NODE_ARGS="$NODE_ARGS $@"
fi

exec node --unhandled-rejections=warn server.js $NODE_ARGS
