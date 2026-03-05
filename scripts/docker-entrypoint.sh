#!/bin/sh
set -e

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  echo "Entrypoint para la aplicación Node. Todos los argumentos se pasan finalmente a node."
  echo "Uso: docker run <imagen> [<node args>]"
  exit 0
fi

echo "[entrypoint] Comprobando node_modules y dependencias..."

cd /app || exit 1

# Si no existe node_modules o faltan paquetes importantes, instalamos dependencias
need_install=0
if [ ! -d node_modules ]; then
  need_install=1
else
  # Intenta requerir un par de módulos críticos para validar instalación
  node -e "require('uuid')" >/dev/null 2>&1 || need_install=1
  node -e "require('puppeteer')" >/dev/null 2>&1 || need_install=1
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
  
  # Configurar teclado Español
  # Layout: es (Spanish keyboard)
  # Alt Gr + Q = @
  # Alt Gr + 2 = @
  export DISPLAY=:1
  echo "[entrypoint] ⌨️  Configurando teclado Español..."
  setxkbmap -display :1 es
  echo "[entrypoint] ✓ Teclado configurado: es (Alt Gr + Q/2 = @)"
  
  echo "[entrypoint] 🔌 Iniciando x11vnc en puerto 5901..."
  
  # Iniciar x11vnc
  # -display :1 = conectar a Xvfb
  # -forever = mantener corriendo
  # -nopw = sin contraseña
  # -noxdamage = sin damagea X11
  # Al ejecutarse dentro de un contenedor Docker el puerto se publica desde
  # 0.0.0.0, por lo que debemos escuchar en todas las interfaces. El
  # parámetro "-listen localhost" restringía el binding a 127.0.0.1, lo que
  # hacía que Docker NAT rechazara las conexiones entrantes. Por eso quitamos
  # "-listen localhost" y dejamos la configuración por defecto (0.0.0.0).
  x11vnc -display :1 -forever -nopw -rfbport 5901 -noxdamage -bg -quiet
  
  echo "[entrypoint] ✓ VNC disponible en puerto 5901 (contenedor escucha en 0.0.0.0)"
  echo "[entrypoint] 📱 Conéctate desde el host: vncviewer localhost:5901 (sin contraseña)"
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
