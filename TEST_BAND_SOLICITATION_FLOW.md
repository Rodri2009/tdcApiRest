# Test de Flujo Completo: Solicitud de Fechas para Bandas

## Estado Actual del Sistema
- ✅ Frontend: `solicitud_fecha_bandas.html` completamente funcional
- ✅ Backend: `solicitudFechaBandaController.js` actualizado  
- ✅ Validación: Acepta `bandas_json` array como payload
- ✅ Emails: Funciones de notificación creadas
- ✅ Admin Panel: Corregido error FLYER-SYNC, endpoint `/api/admin/solicitudes` operativo

## Flujo de Prueba End-to-End

### Paso 1: Acceder al formulario
```
URL: http://localhost/solicitud_fecha_bandas.html
```
- Selecciona 2-3 bandas del catálogo
- Selecciona una fecha para el evento
- Ingresa comentarios (opcional)
- **Verificación**: Los botones de chevron funcionan, el listado es scrolleable

### Paso 2: Autenticación (Simulada)
El frontend obtiene el token JWT del `localStorage` bajo la clave `authToken`

Si no existe token:
```javascript
// En browser console:
localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

Token de prueba válido contiene campos:
- `id_cliente` 
- `nombre`
- `email`
- `telefono`

### Paso 3: Enviar solicitud (Frontend)
Presionar botón "Enviar Solicitud"

**Request esperado:**
```json
POST /api/solicitudes-fechas-bandas
Content-Type: application/json

{
  "fecha_evento": "2026-03-15",
  "bandas_json": [
    {"id_banda": 1, "nombre_banda": "Reite"},
    {"id_banda": 2, "nombre_banda": "Pateando Bares"}
  ],
  "comentarios": "Opcional",
  "id_cliente": 123,
  "nombre_cliente": "Juan Pérez",
  "email_cliente": "juan@example.com",
  "telefono_cliente": "+54911234567"
}
```

**Response esperado (HTTP 201):**
```json
{
  "success": true,
  "message": "Solicitud de fechas para bandas creada exitosamente",
  "solicitudId": 42,
  "comprobante": {
    "id": 42,
    "fecha_evento": "2026-03-15",
    "bandas_json": "[...]",
    "nombre_cliente": "Juan Pérez",
    "email_cliente": "juan@example.com",
    "telefono_cliente": "+54911234567"
  }
}
```

### Paso 4: Redirección a Comprobante
Frontend redirige automáticamente a:
```
URL: http://localhost/comprobante.html?id=42
```

**Verificación de comprobante:**
- ✅ Título: "SOLICITUD DE FECHAS PARA BANDAS"
- ✅ ID Solicitud: 42
- ✅ Fecha del evento: 15 de marzo de 2026
- ✅ Listado de bandas (numerado):
  - 1. Reite
  - 2. Pateando Bares
- ✅ Datos del cliente (obtenidos del servidor)
- ✅ Teléfono y email del cliente
- ✅ Comentarios (si tienen)
- ✅ Sección "Consultar" para presupuesto

### Paso 5: Verificar Almacenamiento en BD
```bash
# Acceder a la BD
docker-compose exec mariadb mysql -u root -p'tu_password' tdc_db

# Verificar tabla principal
SELECT id_solicitud, categoria, fecha_creacion, estado 
FROM solicitudes 
WHERE id_solicitud = 42;

# Verificar datos específicos de bandas
SELECT * FROM solicitudes_fechas_bandas 
WHERE id_solicitud = 42;

# Verificar evento confirmado (si se crea)
SELECT id, nombre_evento, tipo_evento 
FROM eventos_confirmados 
WHERE id_solicitud = 42;
```

### Paso 6: Verificar Notificaciones por Email
**Email al Admin:**
- Destinatario: Variable de entorno `EMAIL_ADMIN` (default: temploclaypole@gmail.com)
- Asunto: "Nueva Solicitud de Fechas para Bandas - ID: 42"
- Contenido:
  - ID de solicitud
  - Fecha del evento
  - Bandas solicitadas
  - Información del cliente
  - Comentarios

**Email al Cliente (Comprobante):**
- Destinatario: Email del cliente (juan@example.com)
- Asunto: "Comprobante de Solicitud - ID: 42"
- Contenido: HTML con detalles de la solicitud

### Paso 7: Verificar Panel Admin
```bash
# Obtener JWT válido del cliente o admin
# Luego:
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost/api/admin/solicitudes
```

**Respuesta esperada (HTTP 200):**
```json
{
  "solicitudes": [
    {
      "id": 42,
      "categoria": "BANDA",
      "estado": "Solicitado",
      "nombre_cliente": "Juan Pérez",
      "email": "juan@example.com",
      "fecha_evento": "2026-03-15",
      "tipo_evento": "FECHA_BANDAS",
      ...
    }
  ]
}
```

## Checklist de Validación

### Frontend
- [ ] Formulario carga correctamente
- [ ] Selección de bandas funciona (máx 3)
- [ ] Botones de reordenamiento funcionan
- [ ] Picker de fecha funciona
- [ ] Comentarios son opcionales
- [ ] Botón "Enviar Solicitud" submite correctamente
- [ ] Loading overlay muestra durante envío
- [ ] Redirección a comprobante automática on success

### Backend
- [ ] Validación acepta `bandas_json` array
- [ ] Crea registro en tabla `solicitudes`
- [ ] Crea registro en tabla `solicitudes_fechas_bandas`
- [ ] Obtiene datos completos para email
- [ ] Email al admin se envía exitosamente
- [ ] Email al cliente se envía exitosamente
- [ ] Retorna solicitudId correcto

### Email Service
- [ ] `sendAdminNotification()` funciona
- [ ] `sendComprobanteEmail()` procesa band solicitations
- [ ] Errores en email no bloquean flujo principal
- [ ] Template admite múltiples bandas

### Admin Panel
- [ ] Endpoint `/api/admin/solicitudes` devuelve HTTP 200
- [ ] Query UNION retorna todas las categorías
- [ ] Solicitudes de bandas aparecen en lista
- [ ] Campos requeridos presentes en respuesta

### Database
- [ ] Tabla `solicitudes` tiene registro
- [ ] Tabla `solicitudes_fechas_bandas` tiene datos
- [ ] Foreign keys integrados correctamente
- [ ] Auditoría timestamps funciona

## Troubleshooting

### Error: "No autorizado"
- Verificar que existe `authToken` en localStorage
- Verificar que JWT es válido (no expirado)
- Usar JWT con campos: `id_cliente`, `nombre`, `email`, `telefono`

### Error 500 en `/api/admin/solicitudes`
- Revisar logs: `docker-compose logs backend | grep -i error`
- Verificar que tables existen: `SHOW TABLES IN tdc_db;`
- Revisar la query UNION en `adminController.js`

### Emails no se envían
- Verificar variables de entorno (EMAIL_USER, EMAIL_PASS, EMAIL_ADMIN)
- Revisar logs del backend para errores de Nodemailer
- Verificar que la cuenta de Gmail permite "Less secure apps"

### Comprobante en blanco
- Verificar que solicitudId es correcto en URL
- Revisar logs de backend para errores en GET `/api/solicitudes-fechas-bandas/:id`
- Verificar que tabla `solicitudes_fechas_bandas` tiene datos

## Archivos Modificados en este Session

1. **Frontend**
   - `solicitud_fecha_bandas.html` - Botón y handler para enviar directamente a API
   - `comprobante.html` - Soporte para visualización de solicitudes de bandas

2. **Backend**
   - `sollicitudFechaBandaController.js` - Validación para `bandas_json`, lógica de email
   - `bandaController.js` - Corrección SQL (id_solicitud vs id)
   - `server.js` - Manejo de FLYER-SYNC error

3. **Database**
   - Schema intacto, ningún cambio necesario

## Notas de Desarrollo

- La función `performSyncFlyers()` estaba fallando porque usaba `id` en lugar de `id_solicitud`
- Se corrigió el error y ahora el admin panel funciona
- El flujo mantiene compatibilidad con solicitudes existentes (alquiler, servicios, etc.)
- Emails se envían en background sin bloquear el flujo principal
