# Plan de Migración y Nueva Lógica de Negocio

## Objetivo

Optimizar la estructura de datos y la lógica de negocio para que:
- Toda solicitud comience en la tabla universal `solicitudes`.
- Al ser confirmada, se copie a una tabla especializada según la categoría.
- Las tablas especializadas sean fáciles de consultar y reportar.

---

## Nuevo Modelo de Tablas

### 1. Tabla universal: `solicitudes`
- id_solicitud (PK)
- tipo (ENUM: 'ALQUILER', 'BANDA', 'TALLER', 'SERVICIO')
- estado (Solicitado, Confirmado, Cancelado, etc.)
- datos comunes: fecha, nombre_cliente, contacto, etc.
- es_publico, fecha_creacion, etc.

### 2. Tablas especializadas para confirmados

- **alquileres_confirmados**
  - id_alquiler (PK)
  - id_solicitud (FK)
  - tipo_salon, cantidad_personas, duracion, ...

- **fecha_bandas_confirmadas**
  - id_evento (PK)
  - id_solicitud (FK)
  - nombre_banda, genero, precio_anticipada, precio_puerta, aforo, ...

- **talleres_confirmados**
  - id_taller (PK)
  - id_solicitud (FK)
  - nombre_taller, cupo, docente, ...

- **servicios_confirmados**
  - id_servicio (PK)
  - id_solicitud (FK)
  - tipo_servicio, detalles, ...

---

## Lógica de Negocio

1. **Alta:** Todo comienza en `solicitudes`.
2. **Confirmación:**
   - Al confirmar, se crea un registro en la tabla *_confirmados correspondiente, copiando los datos relevantes y guardando el `id_solicitud` como FK.
   - El estado de la solicitud se actualiza a "Confirmado".
3. **Cancelación:**
   - Si se cancela, se puede eliminar o marcar como cancelado en la tabla *_confirmados.

---

## Ejemplo de SQL para crear tablas

```sql
CREATE TABLE alquileres_confirmados (
  id_alquiler INT AUTO_INCREMENT PRIMARY KEY,
  id_solicitud INT NOT NULL,
  tipo_salon VARCHAR(100),
  cantidad_personas INT,
  duracion VARCHAR(50),
  -- otros campos específicos
  FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud)
);

CREATE TABLE fecha_bandas_confirmadas (
  id_evento INT AUTO_INCREMENT PRIMARY KEY,
  id_solicitud INT NOT NULL,
  nombre_banda VARCHAR(255),
  genero_musical VARCHAR(100),
  precio_anticipada DECIMAL(10,2),
  precio_puerta DECIMAL(10,2),
  aforo_maximo INT,
  -- otros campos específicos
  FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud)
);

-- Repetir para talleres_confirmados y servicios_confirmados
```

---

## Ejemplo de migración de datos (pseudo-código)

```js
// Para cada solicitud confirmada
for (const solicitud of solicitudes) {
  if (solicitud.tipo === 'ALQUILER') {
    // Insertar en alquileres_confirmados usando datos de solicitud
  }
  if (solicitud.tipo === 'BANDA') {
    // Insertar en fecha_bandas_confirmadas usando datos de solicitud
  }
  // etc.
}
```

---

## Consideraciones
- El backend debe actualizarse para manejar la creación y consulta de las tablas *_confirmados.
- Las vistas de administración y reportes deben consultar las tablas especializadas para mostrar los eventos confirmados.
- El flujo de solicitudes pendientes sigue centralizado en la tabla `solicitudes`.

---

**Esta migración permitirá un sistema más escalable, ordenado y fácil de mantener.**
