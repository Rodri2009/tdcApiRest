# PLAN DE TESTING - FASE 2 PARTE 2

**Objetivo**: Validar que todos los endpoints de visibilidad funcionan correctamente después de cambios es_publico.

**Duración Estimada**: 45 minutos

---

## 1. PREPARACIÓN

### 1.1 Ambiente

- [ ] Backend corriendo en puerto 3000
- [ ] MariaDB corriendo en puerto 3306
- [ ] BD cargada con datos de prueba
- [ ] Terminal con curl disponible

**Verificar**:
```bash
curl -s http://localhost:3000/api/solicitudes/1 >/dev/null && echo "Backend OK"
```

### 1.2 Usuarios de Prueba

Para endpoints /api/admin/* necesitamos JWT token de admin.

**Opción A** - Generar token:
```bash
# Usar endpoint de login si existe
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'
```

**Opción B** - Usar script de testing:
```bash
# Si existe create-admin.js
node backend/scripts/create-admin.js
```

---

## 2. TEST SUITE - LECTURA (GET)

### Test 2.1: GET /api/solicitudes/publicas

**Propósito**: Verificar que endpoint devuelve solo solicitudes públicas

```bash
# Test 2.1.1: Obtener todas las públicas
curl -s http://localhost:3000/api/solicitudes/publicas | jq 'length'
# Esperado: número > 0 (al menos evento 9 debe estar)

# Test 2.1.2: Verificar estructura
curl -s http://localhost:3000/api/solicitudes/publicas | jq '.[0] | keys'
# Esperado: contiene "esPublico", "nombreEvento", "fechaEvento"

# Test 2.1.3: Verificar evento 9 presente
curl -s http://localhost:3000/api/solicitudes/publicas | jq '.[] | select(.id == 9)'
# Esperado: Retorna objeto con esPublico: 1

# Test 2.1.4: Verificar no hay privadas
curl -s http://localhost:3000/api/solicitudes/publicas | jq '.[] | select(.esPublico == 0)'
# Esperado: Retorna null (no matches)
```

**Criterio de Paso**: ✅ Todos los eventos retornados tienen esPublico: 1

---

### Test 2.2: GET /api/solicitudes/public/:id

**Propósito**: Verificar que endpoint de lectura pública de detalles funciona

```bash
# Test 2.2.1: Obtener detalles solicitud pública (ID 9)
curl -s http://localhost:3000/api/solicitudes/public/9 | jq '.'
# Esperado: Objeto con campos solicitud, esPublico, etc.

# Test 2.2.2: Obtener detalles evento confirmado (ID ev_1)
curl -s http://localhost:3000/api/solicitudes/public/ev_1 | jq '.nombreEvento'
# Esperado: Retorna nombre_evento

# Test 2.2.3: Obtener detalles banda (ID bnd_1)
curl -s http://localhost:3000/api/solicitudes/public/bnd_1 | jq '.nombreEvento'
# Esperado: Retorna nombre banda o cliente

# Test 2.2.4: Solicitud privada - no debe retornar/error
curl -s http://localhost:3000/api/solicitudes/public/1 | jq '.error'
# Esperado: null (si es pública) o error si privada
```

**Criterio de Paso**: ✅ Endpoints retornan datos correctos, respetan privacidad

---

## 3. TEST SUITE - ESCRITURA (PUT/POST)

### Test 3.1: PUT /api/admin/solicitudes/:id/visibilidad

**Propósito**: Verificar que cambios de visibilidad ESCRIBEN EN TABLA PADRE ÚNICAMENTE

**Prerequisito**: Obtener JWT token de admin

```bash
# SETUP: Get admin token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}' | jq -r '.token')

echo "Token: $TOKEN"

# Test 3.1.1: Cambiar solicitud 9 a privada
curl -X PUT http://localhost:3000/api/admin/solicitudes/9/visibilidad \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"es_publico": 0}' | jq '.message'
# Esperado: "Visibilidad actualizada"

# Test 3.1.2: Verificar en BD (desde container)
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "SELECT id_solicitud, es_publico FROM solicitudes WHERE id_solicitud = 9;"
# Esperado: 9 | 0

# Test 3.1.3: Verificar NO está en tabla hija
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "SELECT id_solicitud, es_publico FROM solicitudes_fechas_bandas WHERE id_solicitud = 9;"
# Esperado: 9 | (cualquier valor, no fue actualizado por endpoint)

# Test 3.1.4: Verificar NO está en eventos_confirmados
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "SELECT id_solicitud, es_publico FROM eventos_confirmados WHERE id_solicitud = 9;"
# Esperado: Puede tener valor viejo, pero no fue actualizado por endpoint

# Test 3.1.5: GET /publicas NO incluye evento 9 ya
curl -s http://localhost:3000/api/solicitudes/publicas | jq '.[] | select(.id == 9)'
# Esperado: null (no matches porque es_publico = 0)

# Test 3.1.6: Cambiar solicitud 9 de vuelta a pública
curl -X PUT http://localhost:3000/api/admin/solicitudes/9/visibilidad \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"es_publico": 1}' | jq '.message'
# Esperado: "Visibilidad actualizada"

# Test 3.1.7: GET /publicas INCLUYE evento 9 de nuevo
curl -s http://localhost:3000/api/solicitudes/publicas | jq '.[] | select(.id == 9) | .id'
# Esperado: 9
```

**Criterio de Paso**: ✅ 
- Cambios en solicitudes tabla padre ÚNICAMENTE
- GET endpoints reflejan cambios inmediatamente
- Cambios son reversibles

---

### Test 3.2: Estado = Confirmado → Automático Público (Opción A)

**Propósito**: Verificar que confirmar solicitud automáticamente la hace pública

**Prerequisito**: 
- Tener solicitud con estado != 'Confirmado'
- ID disponible (ej: solicitud 10, 11, etc.)

```bash
# SETUP: Crear nueva solicitud de prueba
# O buscar una existente: 
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "SELECT id_solicitud, estado, es_publico FROM solicitudes WHERE estado != 'Confirmado' LIMIT 1;"
# Guardar ID en variable $TEST_ID

# Test 3.2.1: Verificar solicitud estado != Confirmado, es_publico = 0
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "SELECT id_solicitud, estado, es_publico FROM solicitudes WHERE id_solicitud = $TEST_ID;"
# Esperado: estado='Solicitado' (o similar), es_publico=0

# Test 3.2.2: Cambiar estado a Confirmado (via admin endpoint)
curl -X PUT http://localhost:3000/api/admin/solicitudes/$TEST_ID/estado \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"estado":"Confirmado"}' | jq '.message'
# Esperado: "Estado actualizado" (o similar)

# Test 3.2.3: Verificar BD - debe ser Confirmado Y público
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "SELECT id_solicitud, estado, es_publico FROM solicitudes WHERE id_solicitud = $TEST_ID;"
# Esperado: estado='Confirmado', es_publico=1 (AUTOMÁTICO)

# Test 3.2.4: Verificar aparece en /publicas
curl -s http://localhost:3000/api/solicitudes/publicas | jq ".[] | select(.id == $TEST_ID) | .id"
# Esperado: $TEST_ID (la única dato importante)
```

**Criterio de Paso**: ✅ Opción A funciona: Confirmado = Automático Público

---

## 4. TEST SUITE - REGRESIÓN

### Test 4.1: Endpoints POST/PUT no relacionados aún funcionan

**Propósito**: Asegurar que cambios no rompieron otra funcionalidad

```bash
# Test 4.1.1: Crear nueva solicitud (POST /api/solicitudes)
curl -X POST http://localhost:3000/api/solicitudes \
  -H "Content-Type: application/json" \
  -d '{
    "categoria": "BANDA",
    "tipo_evento": "Concierto",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com"
  }' | jq '.id'
# Esperado: Número (nueva solicitud creada)

# Test 4.1.2: Actualizar solicitud (PUT /api/solicitudes/:id)
SOLICITUD_ID=$(curl -s http://localhost:3000/api/solicitudes | jq '.[0].id')
curl -X PUT http://localhost:3000/api/solicitudes/$SOLICITUD_ID \
  -H "Content-Type: application/json" \
  -d '{"descripcion":"Test update"}' | jq '.message'
# Esperado: "Solicitud actualizada" (o similar)

# Test 4.1.3: Obtener detalles solicitud (GET /api/solicitudes/:id)
curl -s http://localhost:3000/api/solicitudes/$SOLICITUD_ID | jq '.id'
# Esperado: $SOLICITUD_ID
```

**Criterio de Paso**: ✅ Todos los endpoints funcionan sin regresiones

---

## 5. TEST SUITE - VERIFICACIÓN DE QUERY PATTERNS

### Test 5.1: Inspeccionar logs del servidor

**Propósito**: Verificar que queries van a tabla correcta

```bash
# Verificar logs (si está disponible en Docker)
docker logs $(docker ps | grep backend | awk '{print $1}') 2>&1 | grep "SELECT" | tail -20
# Buscar: WHERE solicitudes.es_publico = 1 (no WHERE sb.es_publico)
```

**Criterio de Paso**: ✅ Logs muestran queries usando tabla padre

---

## 6. MATRIZ DE RESULTADOS

Llenar después de ejecutar tests:

| Test | Resultado | Notas |
|------|-----------|-------|
| 2.1 GET /publicas | ✅ PASS / ❌ FAIL | |
| 2.2 GET /public/:id | ✅ PASS / ❌ FAIL | |
| 3.1 PUT /visibilidad | ✅ PASS / ❌ FAIL | |
| 3.2 Confirmar = Público | ✅ PASS / ❌ FAIL | |
| 4.1 Regresión POST/PUT | ✅ PASS / ❌ FAIL | |
| 5.1 Query patterns | ✅ PASS / ❌ FAIL | |

---

## 7. RESOLUCIÓN DE PROBLEMAS

### Problema: "401 No autorizado, no hay token"

**Solución**:
1. Asegurar endpoint requiere auth (es admin, espera Bearer token)
2. Obtener token de login endpoint primero
3. Usar: `Authorization: Bearer $TOKEN` header

### Problema: "Error 404 PUT /api/admin/solicitudes/:id/visibilidad"

**Solución**:
1. Ruta está en adminRoutes, no solicitudRoutes
2. Verificar: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js)
3. Confirmar ruta lista: `router.put('/solicitudes/:id/visibilidad', ...)`

### Problema: "esPublico no cambia en GET /publicas"

**Solución**:
1. Verificar BD directamente (puede haber cache)
2. Esperar 1-2 segundos (si hay polling)
3. Revisar query en solicitudController.js línea 1341

### Problema: "Evento 9 no aparece en /publicas"

**Solución**:
1. Verificar DB: estado='Confirmado' AND es_publico=1
2. Revisar fecha: `fecha_evento >= CURDATE()`
3. Si es histórico, cambiar filter en query temporally

---

## 8. CHECKLIST FINAL

**Antes de Pasar a Fase 2 Parte 3** (DROP COLUMN):

- [ ] Test 2.1 PASS: GET /publicas devuelve solo publicas
- [ ] Test 2.2 PASS: GET /public/:id devuelve detalles correcto
- [ ] Test 3.1 PASS: PUT /visibilidad actualiza solicitudes.es_publico
- [ ] Test 3.1 PASS: Put NO actualiza hijas o eventos_confirmados
- [ ] Test 3.2 PASS: Confirmar solicitud automáticamente la hace pública
- [ ] Test 4.1 PASS: No hay regresiones en otros endpoints
- [ ] DB verificado: Valores correctos en BD
- [ ] Logs revisados: Queries uso tabla padre
- [ ] Rollback plan listo: Conoces cómo revertir si hay problema

---

**Si TODOS los tests PASAN**: ✅ Proceed to Fase 2 Part 3 (ALTER TABLE)

**Si ALGÚN test FALLA**: ❌ Debug, fix code, re-run failing tests

---

**Time to Complete**: ~45 min
**Difficulty**: Moderate (requires curl + SQL)
**Recommended**: Run in order, don't skip tests
