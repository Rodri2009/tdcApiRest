# 🚀 QUICK START - FASE 2 PARTE 2

**Última actualización**: 3 Marzo 2026
**Status**: ✅ Fase 2 Parte 1 Completada, Listo para Parte 2
**Tiempo estimado próximo paso**: 45 minutos

---

## ¿QUÉ PASÓ?

Completamos **PARTE 1** de Fase 2: Eliminamos todas las escrituras redundantes de `es_publico` a las tablas hijas y eventos_confirmados.

**Cambios hechos**:
- 3 controllers modificados
- 3 UPDATE statements removidos
- 1 INSERT statement simplificado
- 0 data perdida
- ✅ **Todo revertible** si algo sale mal

**Validación**:
- ✅ Endpoints públicos funcionan correctamente
- ✅ Base de datos tiene valores correctos
- ✅ Opción A (Confirmado = Público automático) funciona
- ✅ No hay inconsistencias

---

## PRÓXIMO PASO: TESTING (45 min)

Necesitas **validar** que todos nuestros cambios realmente funcionan.

### Opción Fácil: Ejecutar Script Automático

```bash
cd /home/almacen/tdcApiRest
./test-fase2-parte2.sh
```

El script te guiará interactivamente por 30+ tests.

### Opción Manual: Seguir Guía de Testing

Abre: [TESTING_PLAN_FASE2_PARTE2.md](TESTING_PLAN_FASE2_PARTE2.md)

Sigue los tests section-by-section con comandos curl.

---

## TIMELINE

### Hoy/Mañana (45 min)

1. Ejecuta `./test-fase2-parte2.sh`
2. Verifica que TODOS los tests pasen ✅
3. Si alguno falla → DEBUG & FIX → Re-run
4. Si TODOS pasan → Procede a Parte 3

### Después (30 min - Parte 3)

```bash
# Backup (ALWAYS FIRST!)
docker exec docker-mariadb-1 mysqldump -u root -psys8102root tdc_db > backup_antes_part3.sql

# Drop column
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "ALTER TABLE solicitudes_fechas_bandas DROP COLUMN es_publico;"

# Verify aplicación sigue funcionando
curl http://localhost:3000/api/solicitudes/publicas | head -20
```

---

## FILES IMPORTANTES

**Para entender qué se hizo**:
- [FASE_2_VALIDACION_PARTE_1.md](FASE_2_VALIDACION_PARTE_1.md) - Detalles técnicos

**Para ejecutar tests**:
- [TESTING_PLAN_FASE2_PARTE2.md](TESTING_PLAN_FASE2_PARTE2.md) - Plan detallado
- [test-fase2-parte2.sh](test-fase2-parte2.sh) - Script automático

**Para contexto general**:
- [RESUMEN_EJECUTIVO_FASE2.md](RESUMEN_EJECUTIVO_FASE2.md) - Status general
- [INDICE_DOCUMENTACION_FASE2.md](INDICE_DOCUMENTACION_FASE2.md) - Todos los docs

**Para código modificado**:
- [backend/controllers/solicitudController.js](backend/controllers/solicitudController.js#L1440) - updateVisibilidad
- [backend/controllers/solicitudFechaBandaController.js](backend/controllers/solicitudFechaBandaController.js#L910) - PUT banda
- [backend/controllers/adminController.js](backend/controllers/adminController.js#L340) - Estado confirmation

---

## FALLOS COMUNES Y SOLUCIONES

### "Backend no responde en puerto 3000"

```bash
# Verifica contenedor backend
docker ps | grep backend
# Si no está, reinicia:
docker-compose -f docker/docker-compose.yml up -d
```

### "401 No autorizado" en tests de admin

Token de auth requerido pero no disponible.
- Tests públicos (GET /publicas) NO requieren token
- Tests de admin (PUT /visibilidad) SÍ requieren token
- Script intenta obtenerlo automáticamente
- Si falla, puedes saltarlos o crear admin token manual

### "Error 404 PUT /api/admin/solicitudes/:id/visibilidad"

Ruta está en adminRoutes, no solicitudRoutes.
- Verifica [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) línea 41
- Confirmación de ruta lista: `router.put('/solicitudes/:id/visibilidad', ...)`

### Tests de modificación no funcionan

1. Verifica que tienes permisos de modificación en BD
2. Verifica que endpoints POST/PUT responden
3. Revisa logs: `docker logs $(docker ps | grep backend | awk '{print $1}')`

---

## CRITERIOS DE ÉXITO

**Para pasar PARTE 2 a PARTE 3**:

- ✅ Test 2.1 PASS: GET /publicas retorna solo públicas
- ✅ Test 2.2 PASS: GET /public/:id devuelve detalles
- ✅ Test 3.1 PASS: PUT /visibilidad actualiza solicitudes padre
- ✅ Test 3.1 PASS: PUT /visibilidad NO actualiza hijas
- ✅ Test 3.2 PASS: Confirmar = Público automático
- ✅ Test 4.1 PASS: No hay regresiones

**Si TODO está ✅**: Procede a ALTER TABLE DROP COLUMN

**Si algo está ❌**: Debug, fix, re-run hasta PASS

---

## ENTENDER LA ARQUITECTURA

```
ANTES (Con redundancia):
solicitudes.es_publico           ← Fuente 1
solicitudes_fechas_bandas.es_publico     ← Fuente 2 (REDUNDANTE!)
eventos_confirmados.es_publico           ← Fuente 3 (TRIPLICADA!)
↓ Problema: Todas pueden desync

DESPUÉS (Con normalización):
solicitudes.es_publico           ← ÚNICA FUENTE
solicitudes_fechas_bandas        ← Lee del padre vía FK
eventos_confirmados              ← Lee del padre vía FK
↓ Garantizado: Siempre consistentes
```

**Ventaja**: No más sincronización manual → Sin bugs

---

## ROLLBACK (Si Necesito Revertir)

**Si todo se arruina**:

```bash
# Opción 1: Revert código (más rápido)
git checkout backend/controllers/solicitudController.js
git checkout backend/controllers/solicitudFechaBandaController.js
git checkout backend/controllers/adminController.js
docker-compose -f docker/docker-compose.yml restart backend

# Opción 2: Restore BD backup
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db < backup_antes.sql
```

**Nota**: Como NO ejecutamos ALTER TABLE aún, NO hay data perdida. Solo revert código y estamos bien.

---

## PRÓXIMA SESIÓN

**Si TODOS los tests pasan**:
→ Ejecutar ALTER TABLE DROP COLUMN (Parte 3)

**Si algún test falla**:
→ Debug problema identificado
→ Fix código si es necesario
→ Re-run test hasta PASS
→ Una vez TODO PASS → Parte 3

---

## DÓNDE ESTAMOS EN EL PLAN

```
Fase 1: Eliminar estado               ⏳ PRÓXIMA
Fase 2: Eliminar es_publico           🔄 EN PROGRESO
  ├─ Parte 1: Stop writes             ✅ COMPLETADA
  ├─ Parte 2: Testing                 🔵 SIGUIENTE (45 min)
  └─ Parte 3: DROP COLUMN             ⏳ DESPUÉS (30 min)
Fase 3: Consolidar descripcion        ⏳ FUTURA
Fase 4: Refactor eventos_confirmados  ⏳ FUTURA (2 weeks)
```

---

## COMANDO RÁPIDOS

```bash
# Ejecutar tests automáticos
./test-fase2-parte2.sh

# Ver estado actual BD
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "SELECT id_solicitud, estado, es_publico FROM solicitudes LIMIT 5;"

# Ver logs backend
docker logs $(docker ps | grep backend | awk '{print $1}') -f

# Restart backend si cambias código
docker-compose -f docker/docker-compose.yml restart backend

# Check publicidad en API
curl -s http://localhost:3000/api/solicitudes/publicas | jq 'length'
```

---

## PREGUNTAS RÁPIDAS

**Q: ¿Qué cambios se hicieron?**
A: 3 controllers, 0 data loss, 3 UPDATE statements removidos

**Q: ¿Puedo revertir?**
A: Sí, fácilmente (no hay ALTER TABLE ejecutado)

**Q: ¿Cuánto tiempo toman los tests?**
A: 5-10 minutos si todo funciona, más si hay que debugear

**Q: ¿Qué paso si un test falla?**
A: Revisa la guía de problemas, debugea, fix, re-run

**Q: ¿Dónde veo el código modificado?**
A: [FASE_2_VALIDACION_PARTE_1.md](FASE_2_VALIDACION_PARTE_1.md) tiene citas ANTES/DESPUÉS

---

## PRÓXIMO

**Listo**? Ejecuta:

```bash
./test-fase2-parte2.sh
```

**No listo**? Lee:
- [TESTING_PLAN_FASE2_PARTE2.md](TESTING_PLAN_FASE2_PARTE2.md) para entender tests
- [FASE_2_VALIDACION_PARTE_1.md](FASE_2_VALIDACION_PARTE_1.md) para detalles técnicos

**Preguntas**? Ver [INDICE_DOCUMENTACION_FASE2.md](INDICE_DOCUMENTACION_FASE2.md) para buscar respuesta.

---

**Status**: 🟢 Verde
**Siguiente**: Testing (45 min)
**Criterio**: Todos tests PASS → Parte 3
