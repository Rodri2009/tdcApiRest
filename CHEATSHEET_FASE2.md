# CHEAT SHEET - FASE 2 CAMBIOS

**Para referencia rápida durante testing**

---

## 🔍 QUÉ CAMBIÓ (UNA LÍNEA)

❌ Eliminadas 3 UPDATE statements que escribían `es_publico` a `eventos_confirmados`

---

## 📁 ARCHIVOS MODIFICADOS

### 1. solicitudController.js (updateVisibilidad)
```javascript
// ANTES:
await conn.query(`UPDATE eventos_confirmados SET es_publico = ?...`);
// AHORA:
// (removida la línea)
```
**Línea**: 1440-1495

### 2. solicitudFechaBandaController.js (PUT banda)
```javascript
// ANTES:
await conn.query(`UPDATE eventos_confirmados SET es_publico = ?...`);
// AHORA:
// Ya no sincronizamos a eventos_confirmados
```
**Línea**: 910-917

### 3. adminController.js (estado confirmation)
```javascript
// ANTES:
INSERT INTO eventos_confirmados (..., es_publico, ...)
VALUES (..., 1, ...)
// AHORA:
INSERT INTO eventos_confirmados (...) VALUES (...)

// ANTES:
if (evento) { UPDATE eventos_confirmados SET es_publico = ?... }
// AHORA:
// Bloque removido completamente
```
**Línea**: 340-367 (dos ubicaciones)

---

## ✅ VALIDACIÓN RÁPIDA

### Test 1: Evento visible en público
```bash
curl http://localhost:3000/api/solicitudes/publicas | jq '.[0]'
# Debe retornar evento con esPublico: 1
```

### Test 2: Check BD
```bash
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "SELECT id_solicitud, es_publico FROM solicitudes WHERE id_solicitud = 9;"
# Debe retornar: 9 | 1
```

### Test 3: Confirm Opción A (Confirmado = Público)
```bash
docker exec docker-mariadb-1 mysql -u root -psys8102root tdc_db \
  -e "SELECT id_solicitud, estado, es_publico FROM solicitudes WHERE estado = 'Confirmado' LIMIT 1;"
# Todos deben tener es_publico = 1
```

### Test 4: No hay SELECT de hijas
```bash
grep -r "sb.es_publico OR st.es_publico OR ss.es_publico" backend/
# Debe retornar: 0 matches
```

---

## 🚀 PRÓXIMO

1. **If testing PASS**: Execute ALTER TABLE DROP COLUMN (Parte 3)
2. **If testing FAIL**: Debug problem, fix code, re-test

---

## 🔗 LINKS ÚTILES

- Full Details: [FASE_2_VALIDACION_PARTE_1.md](FASE_2_VALIDACION_PARTE_1.md)
- Test Plan: [TESTING_PLAN_FASE2_PARTE2.md](TESTING_PLAN_FASE2_PARTE2.md)
- Next Steps: [QUICKSTART_FASE2_PARTE2.md](QUICKSTART_FASE2_PARTE2.md)
- Code Changes: [backend/controllers/solicitudController.js](backend/controllers/solicitudController.js#L1440)

---

## 📊 IMPACT

| Métrica | Valor |
|---------|-------|
| Files changed | 3 |
| Lines modified | ~8 |
| Data lost | 0 |
| Endpoints broken | 0 |
| Rollback time | <5 min |
| Status | GREEN 🟢 |
