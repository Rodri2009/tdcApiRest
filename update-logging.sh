#!/bin/bash
# Script para reemplazar console.log y console.error en controllers del backend

BACKEND_DIR="/home/almacen/tdcApiRest/backend"

# Lista de controladores clave
CONTROLLERS=(
    "solicitudController.js"
    "eventosController.js"
    "solicitudFechaBandaController.js"
    "bandasController.js"
    "talleresController.js"
    "serviciosController.js"
    "ticketsController.js"
    "uploadsController.js"
    "authController.js"
    "usuariosController.js"
    "opcionesController.js"
)

for controller in "${CONTROLLERS[@]}"; do
    file="$BACKEND_DIR/controllers/$controller"
    if [ -f "$file" ]; then
        echo "Procesando: $file"
        
        # Reemplazar console.log con logVerbose (preservando algunos logs importantes)
        sed -i "s/console\.log(\([^)]*\))/logVerbose(\1)/g" "$file"
        
        # Reemplazar console.error con logError
        sed -i "s/console\.error(\([^)]*\))/logError(\1)/g" "$file"
        
        # Reemplazar console.warn con logWarning
        sed -i "s/console\.warn(\([^)]*\))/logWarning(\1)/g" "$file"
        
        # Agregar import si no existe
        if ! grep -q "require.*debugFlags" "$file"; then
            sed -i "1,5s/^const pool = require.*$/const pool = require('..\/db');\nconst { logVerbose, logError, logSuccess, logWarning } = require('..\/lib\/debugFlags');/" "$file"
        fi
        
        echo "✓ $controller procesado"
    else
        echo "✗ No encontrado: $file"
    fi
done

echo ""
echo "Script completado. Todos los controllers han sido actualizados."
