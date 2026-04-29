#!/bin/bash

###############################################################################
# Sugerencias de Comandos para Pruebas - reset.sh
###############################################################################
# Este archivo contiene ejemplos de comandos útiles para diferentes
# escenarios de testing y desarrollo con el nuevo reset.sh mejorado.

# ============================================================================
# 1. RESET RÁPIDOS DE BASE DE DATOS (sin destruir contenedores)
# ============================================================================

# Reset BD completa (schema + seed + test data) - UltraRápido ~2 seg
# Mantiene los contenedores corriendo!!!
./scripts/reset.sh --no-sql
# Luego para aplicar SQL mientras todo está corriendo:
docker exec docker-mariadb-1 mysql -u rodrigo -p desa8102test tdc_db < database/01_schema.sql 
docker exec docker-mariadb-1 mysql -u rodrigo -p desa8102test tdc_db < database/02_seed.sql
docker exec docker-mariadb-1 mysql -u rodrigo -p desa8102test tdc_db < database/03_test_data.sql

# Reset solo sin datos de prueba (para QA/testing limpio)
./scripts/reset.sh --skip-test

# Reset solo schema (para cambios de estructura)
./scripts/reset.sh --only-schema

# Reset solo datos de semilla
./scripts/reset.sh --only-seed

# Reset solo datos de prueba
./scripts/reset.sh --only-test


# ============================================================================
# 2. RESET DESTRUCTIVOS (destruyen y levantan contenedores)
# ============================================================================

# Reset COMPLETO (todos contenedores + BD) - Como up.sh pero reinicia BD
# Toma ~30-45 segundos (destruye/levanta todo)
./scripts/reset.sh --all

# Reset completo con rebuild de imágenes (si cambió algo en Dockerfile)
# Toma ~60+ segundos (rebuild + start)
./scripts/reset.sh --all-rebuild

# Reset solo BD (destruye mariadb, levanta nuevo, recarga SQL)
# Útil cuando BD está corrupta pero backend está bien
./scripts/reset.sh --db

# Reset solo Backend (reinicia la app)
# Útil para recargar cambios en código
./scripts/reset.sh --backend --no-sql

# Reset solo Frontend (reinicia nginx)
# Útil para cambios en frontend
./scripts/reset.sh --frontend --no-sql


# ============================================================================
# 3. RESET CON DEBUG Y LOGS EN VIVO
# ============================================================================

# Reset completo + ver logs del backend en tiempo real
./scripts/reset.sh --all -d

# Reset BD + ver logs (para ver cómo reacciona backend al reset)
./scripts/reset.sh --db -d

# Reset Backend + ver logs (para ver si inicia sin errores)
./scripts/reset.sh --backend -d

# Reset con debug detallado (muestra comandos SQL ejecutados)
./scripts/reset.sh -d


# ============================================================================
# 4. COMBINACIONES ÚTILES PARA TESTING
# ============================================================================

# ESCENARIO 1: Testing de migraciones
# Aplica solo schema para probar cambios de estructura
./scripts/reset.sh --only-schema -d

# ESCENARIO 2: Testing de datos (sin estructura)
# Útil si solo cambiaste datos en seed files
./scripts/reset.sh --only-seed -d

# ESCENARIO 3: Testing de datos de prueba
# Para regenerar datos de test (sin tocar producción seeds)
./scripts/reset.sh --skip-test --only-test -d

# ESCENARIO 4: Testing rápido de todo
# BD limpia pero sin contexto de test
./scripts/reset.sh --skip-test --all

# ESCENARIO 5: Debugging rápido
# Resetea BD sin datos de prueba + ve logs
./scripts/reset.sh --skip-test -d

# ESCENARIO 6: Destrucción completa (nuclear option)
# Useful si algo está MUY roto
./scripts/reset.sh --all-rebuild -d


# ============================================================================
# 5. OTRAS UTILIDADES ÚTILES (scripts complementarios)
# ============================================================================

# Ver diagnóstico del sistema
./scripts/diagnostico/diagnose_db.sh

# Ver estado de contenedores
docker-compose -f docker/docker-compose.yml ps

# Ver logs del backend en tiempo real (sin resetear)
docker logs -f docker-backend-1

# Ver logs del mariadb
docker logs -f docker-mariadb-1

# Conectar a BD directamente para queries manuales
docker exec -it docker-mariadb-1 mysql -u rodrigo -p desa8102test tdc_db

# Ejecutar query sin entrar a shell
docker exec docker-mariadb-1 mysql -u rodrigo -p desa8102test tdc_db -e "SELECT COUNT(*) FROM usuarios;"

# Ver volúmenes
docker volume ls

# Limpiar todo (⚠️ CUIDADO)
docker system prune -a --volumes


# ============================================================================
# 6. FLUJOS DE TRABAJO RECOMENDADOS
# ============================================================================

# FLUJO 1: Desarrollo daily
# Mañana al empezar:
./scripts/reset.sh --skip-test

# Durante el día si algo se daña:
./scripts/reset.sh -d

# FLUJO 2: Testing

# Antes de cada sesión de test:
./scripts/reset.sh --all

# Entre tests (reset rápido):
./scripts/reset.sh --only-test

# FLUJO 3: Debugging de backend
# Resetear BD manteniendo logs:
./scripts/reset.sh --db -d

# Ver reacción del backend:
# (los logs siguen visible en la terminal gracias a -d)

# FLUJO 4: Cambios en estructura
# Hacer cambios en 01_schema.sql, luego:
./scripts/reset.sh --only-schema -d

# FLUJO 5: Cambios en código del backend
# Hacer cambios, luego:
./scripts/reset.sh --backend -d

# FLUJO 6: Cambios en frontend
# Hacer cambios, luego:
./scripts/reset.sh --frontend --no-sql


# ============================================================================
# 7. COMPARATIVA: Cuándo usar qué
# ============================================================================

# Situación: "Solo necesito limpiar datos"
# → ./scripts/reset.sh --skip-test

# Situación: "Cambié la estructura de BD"
# → ./scripts/reset.sh --only-schema

# Situación: "El backend está en estado raro"
# → ./scripts/reset.sh --all -d

# Situación: "Solo cambié código del backend"
# → ./scripts/reset.sh --backend -d

# Situación: "Solo cambié frontend/HTML/CSS"
# → ./scripts/reset.sh --frontend --no-sql

# Situación: "Necesito ver exactamente lo que está pasando"
# → ./scripts/reset.sh -d

# Situación: "Todo se rompió, necesito empezar from scratch"
# → ./scripts/reset.sh --all-rebuild -d

# Situación: "Necesito reset MUY rápido"
# → ./scripts/reset.sh --no-sql (después agregar SQL manualmente)


# ============================================================================
# 8. ATAJOS ÚTILES (agrega a tu .bashrc o .zshrc)
# ============================================================================

# alias rs='cd ~/tdcApiRest && ./scripts/reset.sh'
# alias rsd='cd ~/tdcApiRest && ./scripts/reset.sh -d'
# alias rsdb='cd ~/tdcApiRest && ./scripts/reset.sh --db'
# alias rsb='cd ~/tdcApiRest && ./scripts/reset.sh --backend -d'
# alias rsf='cd ~/tdcApiRest && ./scripts/reset.sh --frontend --no-sql'
# alias diag='cd ~/tdcApiRest && ./scripts/diagnostico/diagnose_db.sh'

# Entonces puedes usar:
# rs              # Reset rápido
# rsd             # Reset normal con logs
# rsdb            # Reset solo BD
# rsb             # Reset backend con logs
# rsf             # Reset frontend
# diag            # Diagnóstico


# ============================================================================
# 9. CASOS EDGE (situaciones especiales)
# ============================================================================

# Split brain: BD inconsistente pero código OK
./scripts/reset.sh --db -d

# Memoria/recursos bajos: reset ultra rápido
./scripts/reset.sh --no-sql

# Necesitas preservar algunos datos mientras reseteas
# 1. Exportar antes:
docker exec docker-mariadb-1 mysqldump -u rodrigo -p desa8102test tdc_db > backup.sql
# 2. Reset
./scripts/reset.sh
# 3. Importar selectively después:
docker exec -i docker-mariadb-1 mysql -u rodrigo -p desa8102test tdc_db < backup.sql

# Testing concurrencia: múltiples instancias de reset
./scripts/reset.sh --only-test -d &
sleep 5
./scripts/reset.sh --backend --no-sql &
wait


# ============================================================================
# 10. MONITOREO MIENTRAS RESETEASS
# ============================================================================

# En otra terminal, monitorear el estado:
watch -n 1 'docker-compose -f docker/docker-compose.yml ps'

# O en otra terminal, ver el uso de recursos:
docker stats

# O ver el diagrama de red:
docker network ls
docker network inspect docker_default

###############################################################################
# Fin de sugerencias - Usa con sabiduría 🚀
###############################################################################
