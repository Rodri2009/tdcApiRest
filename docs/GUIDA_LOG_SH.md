# 📋 Script log.sh - Guía de Uso

## 📖 Descripción

`log.sh` es un script auxiliar para visualizar logs de los contenedores Docker del proyecto en tiempo real o histórico, con soporte para filtrado por módulo (Mercado Pago, WhatsApp).

## 🎯 Ubicación

```bash
./scripts/log.sh
```

## 📚 Usos Rápidos

### Ver todos los logs en vivo (defecto)
```bash
./scripts/log.sh
# Muestra logs de backend, mariadb y nginx en tiempo real
```

### Ver logs del backend
```bash
./scripts/log.sh --backend
# Logs del backend (Node.js) en tiempo real
```

### Ver logs de la base de datos
```bash
./scripts/log.sh --mariadb
# O alias:
./scripts/log.sh --bd
```

### Ver logs del nginx (frontend)
```bash
./scripts/log.sh --frontend
# O alias:
./scripts/log.sh --nginx
```

### Filtrar solo logs de Mercado Pago
```bash
./scripts/log.sh --backend --mp
# Muestra solo líneas que contengan "Mercado" o "MP"
```

### Filtrar solo logs de WhatsApp
```bash
./scripts/log.sh --backend --wa
# Muestra solo líneas que contengan "WhatsApp" o "WA"
```

### Ver histórico sin seguimiento
```bash
./scripts/log.sh --backend --no-follow
# Muestra últimas 100 líneas, sin seguir nuevos logs
```

### Ajustar número de líneas
```bash
./scripts/log.sh --backend --tail 50
# Muestra últimas 50 líneas en lugar de 100
```

### Con timestamps
```bash
./scripts/log.sh --backend --timestamps
# Incluye timestamp en cada línea
```

### Modo debug
```bash
./scripts/log.sh --backend -d
# Muestra comandos que se ejecutan (útil para troubleshooting)
```

## 📋 Referencia Completa de Flags

### Contenedores (selecciona qué logs ver)
| Flag | Descripción |
|------|-------------|
| `--backend` | Logs del backend (Node.js) |
| `--mariadb`, `--bd` | Logs de MariaDB |
| `--frontend`, `--nginx` | Logs de nginx |
| (sin flags) | Muestra todos los contenedores (defecto) |

### Filtrado de Logs
| Flag | Descripción |
|------|-------------|
| `--mp` | Filtra solo logs de Mercado Pago |
| `--wa` | Filtra solo logs de WhatsApp |

### Visualización
| Flag | Descripción |
|------|-------------|
| `-f`, `--follow` | Sigue logs en tiempo real (defecto) |
| `--no-follow` | Muestra histórico, no sigue nuevos logs |
| `--tail N` | Muestra últimas N líneas (defecto 100) |
| `--timestamps` | Incluye timestamp en cada línea |

### Depuración
| Flag | Descripción |
|------|-------------|
| `-d`, `--debug` | Muestra comandos que se ejecutan |
| `-h`, `--help` | Muestra ayuda |

## 💡 Casos de Uso Comunes

### Debugging de Import MP en tiempo real
```bash
# Terminal 1: Ver logs del backend en vivo
./scripts/log.sh --backend

# Terminal 2: Presiona botón "Importar" en el frontend
# Los logs aparecerán en Terminal 1 instantáneamente
```

### Verificar importación de Mercado Pago
```bash
./scripts/log.sh --backend --mp --follow
# Muestra SOLO líneas relacionadas con MP, en tiempo real
```

### Investigar error de base de datos
```bash
./scripts/log.sh --mariadb --no-follow --tail 50
# Últimas 50 líneas de logs de MariaDB sin seguimiento
```

### Ver qué hace nginx
```bash
./scripts/log.sh --frontend --timestamps
# Logs de nginx con timestamps, útil para rastrear requests
```

### Combo: Backend + Mercado Pago + Debug
```bash
./scripts/log.sh --backend --mp -d
# Logs del backend filtrados solo MP + debug commands
```

### Ver todos los servicios con problemas
```bash
./scripts/log.sh --timestamps | grep -i error
# Todos los logs con timestamps, después filtrado por "error"
```

## 🔧 Integración con Otros Scripts

`log.sh` puede encadenarse con otros scripts:

```bash
# Reinicia backend Y muestra logs
./scripts/restart.sh --backend && sleep 2 && ./scripts/log.sh --backend

# Reset de BD Y luego monitorea logs de mariadb
./scripts/reset.sh --db && ./scripts/log.sh --mariadb
```

## ⚙️ Configuración Interna

El script automáticamente:
- ✅ Detecta si Docker está corriendo
- ✅ Valida que los contenedores existan
- ✅ Usa `docker compose logs` para múltiples contenedores
- ✅ Aplica filtros de grep al stream de logs
- ✅ Soporta Ctrl+C para salir del modo follow

## 🐛 Troubleshooting

### "Contenedor no encontrado"
```bash
# Verifica que docker esté corriendo y los contenedores levantados
docker ps

# Si no están, levanta con:
./scripts/up.sh
```

### No veo logs recientes
```bash
# Aumenta el número de líneas (defecto 100)
./scripts/log.sh --backend --tail 200
```

### Filtro de MP/WA no funciona
```bash
# Verifica que haya logs que coincidan
./scripts/log.sh --backend --tail 500 | grep -i mercado
```

### Quiero salir del modo "follow"
```bash
# Presiona Ctrl+C
```

## 📝 Notas

- El script mantiene la compatibilidad con `reset.sh`, `restart.sh` y `up.sh`
- Los colores se desactivan automáticamente si el output no es un TTY
- El filtrado es case-insensitive (busca "mp", "MP", "Mercado", etc.)
- Por defecto muestra últimas 100 líneas, ajustable con `--tail`

---

**Última actualización**: Mayo 2026  
**Script**: `/scripts/log.sh`  
**Autor**: Sistema de DevOps TDC
