# 📋 Análisis de Integridad: Tabla `solicitudes_alquiler`

**Fecha:** 28 de febrero de 2026  
**Estado:** ✅ INTEGRIDAD REFERENCIAL OK | ⚠️ DISEÑO DE NORMALIZACIÓN CON PROBLEMAS

---

## 1. Verificación de Integridad Referencial

### 📊 Números Actuales
```
Solicitudes totales en tabla padre (solicitudes):              5
Solicitudes de tipo ALQUILER:                                 5
Registros en tabla hija (solicitudes_alquiler):               5
Registros HUÉRFANOS (ALQUILER sin alquiler específico):       0 ✅
Relación 1:1:                                                 ✓ CORRECTA
```

### ✅ Listado de Registros Verificados
| ID | Categoría | Estado | Existe en alquiler | Status |
|----|-----------|---------|--------------------|--------|
| 1  | ALQUILER | Solicitado | ✓ | OK |
| 2  | ALQUILER | Confirmado | ✓ | OK |
| 3  | ALQUILER | Solicitado | ✓ | OK |
| 9  | ALQUILER | Solicitado | ✓ | OK |
| 10 | ALQUILER | Solicitado | ✓ | OK |

**Conclusión:** Toda solicitud ALQUILER tiene su correspondiente registro en `solicitudes_alquiler`. No hay orfandad.

---

## 2. Análisis de Campos y Problemas de Diseño

### 2.1 Campos Críticos con PROBLEMAS ⚠️

#### A) `tipo_servicio` - ⚠️ PROBLEMA GRAVE
```
Tipo actual:  VARCHAR(255)
Valores encontrados:
  - "Cumpleaños infantil"
  - "Fiesta de 15 años"  
  - "Baby shower"
  - "ADOLESCENTES"
```

**Problemas:**
- ❌ Inconsistencia: mezcla descripciones con IDs
- ❌ Sin FK: no hay referencia a tabla de catálogo
- ❌ Redundancia: la descripción está también en `tipo_de_evento`
- ❌ Cambios peligrosos: si se edita nombre, datos se duplican/pierden

**Solución Recomendada:**
```sql
-- Crear tabla catálogo
CREATE TABLE IF NOT EXISTS opciones_alquiler (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    es_publico TINYINT(1) DEFAULT 1,
    activo TINYINT(1) DEFAULT 1
    INDEX idx_codigo (codigo)
);

-- Insertar valores
INSERT INTO opciones_alquiler (codigo, nombre, descripcion) VALUES
('INFANTILES', 'Cumpleaños infantil', 'Alquiler para fiestas infantiles'),
('BABY_SHOWERS', 'Baby shower', 'Alquiler para baby showers'),
('CON_SERVICIO_DE_MESA', 'Fiesta de 15 años', 'Evento con servicio de mesa'),
('ADOLESCENTES', 'Adolescentes', 'Alquiler para eventos adolescentes');

-- Alterar solicitudes_alquiler
ALTER TABLE solicitudes_alquiler 
  CHANGE tipo_servicio tipo_servicio INT,
  ADD CONSTRAINT fk_tipo_servicio FOREIGN KEY (tipo_servicio) 
    REFERENCES opciones_alquiler(id);
```

---

#### B) `cantidad_de_personas` - ⚠️ PROBLEMA GRAVE
```
Tipo actual:  VARCHAR(100)
Valores encontrados:
  - "50"
  - "60"  
  - "40"
  - "1"
```

**Problemas:**
- ❌ Sin FK: no referencia a tabla de rangos
- ❌ Almacena números como texto en un field de 100 caracteres
- ❌ Sin descripción de rango: ¿"40" significa 40 personas o rango "31-50"?
- ❌ Perderá precisión si se usan JOINs en GET

**Solución Recomendada:**
```sql
-- Crear tabla catálogo
CREATE TABLE IF NOT EXISTS opciones_cantidad_personas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cantidad_minima INT NOT NULL,
    cantidad_maxima INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    es_publico TINYINT(1) DEFAULT 1,
    UNIQUE KEY uk_rango (cantidad_minima, cantidad_maxima)
);

-- Insertar rangos
INSERT INTO opciones_cantidad_personas (cantidad_minima, cantidad_maxima, nombre) VALUES
(1, 40, 'de 1 a 40 personas'),
(41, 50, 'de 41 a 50 personas'),
(51, 75, 'de 51 a 75 personas'),
(76, 120, 'de 76 a 120 personas'),
(121, 999, 'más de 120 personas');

-- Alterar solicitudes_alquiler
ALTER TABLE solicitudes_alquiler 
  CHANGE cantidad_de_personas cantidad_de_personas INT,
  ADD CONSTRAINT fk_cantidad_personas FOREIGN KEY (cantidad_de_personas) 
    REFERENCES opciones_cantidad_personas(id);
```

---

#### C) `tipo_de_evento` - ⚠️ PROBLEMA GRAVE
```
Tipo actual:  VARCHAR(50) NOT NULL
Valores encontrados:
  - "INFANTILES"
  - "CON_SERVICIO_DE_MESA"
  - "BABY_SHOWERS"
  - "ADOLESCENTES"
```

**Problemas:**
- ❌ Sin FK: almacena ID pero sin referencia a catálogo
- ❌ Duplica información de `tipo_servicio`
- ❌ Confusión semántica: ¿es tipo de evento o tipo de sala?
- ❌ No permite JOINs para obtener descripción amigable

**Solución Recomendada:**
```sql
-- Crear tabla catálogo (O reutilizar opciones_tipos existente)
CREATE TABLE IF NOT EXISTS opciones_tipo_evento (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    es_publico TINYINT(1) DEFAULT 1,
    activo TINYINT(1) DEFAULT 1
);

-- Insertar valores
INSERT INTO opciones_tipo_evento (codigo, nombre, descripcion) VALUES
('INFANTILES', 'Infantiles', 'Eventos para niños'),
('ADOLESCENTES', 'Adolescentes', 'Eventos para adolescentes'),
('CON_SERVICIO_DE_MESA', 'Con servicio de mesa', 'Eventos que incluyen servicio'),
('BABY_SHOWERS', 'Baby showers', 'Eventos especiales baby showers');

-- Alterar solicitudes_alquiler
ALTER TABLE solicitudes_alquiler 
  CHANGE tipo_de_evento tipo_de_evento INT NOT NULL,
  ADD CONSTRAINT fk_tipo_evento FOREIGN KEY (tipo_de_evento) 
    REFERENCES opciones_tipo_evento(id);
```

---

### 2.2 Campos con INCOHERENCIA DE TIPO ⚠️

#### D) `hora_evento` - Tipo inconsistente
```
Tipo actual:  VARCHAR(20)
Debería ser:  TIME
Ejemplo: "14:30" debería ser TIME '14:30:00'
```

**Recomendación:**
```sql
ALTER TABLE solicitudes_alquiler 
  MODIFY hora_evento TIME COMMENT 'Hora de inicio del evento';
```

---

#### E) `duracion` - Tipo y almacenamiento incorrecto
```
Tipo actual:  VARCHAR(100)
Debería ser:  INT (minutos)
Ejemplo: "360" (minutos) = 6 horas
Actualmente: ¿"6 horas"? ¿"360"? ¿"6h"?
```

**Recomendación:**
```sql
-- Si almacena duración en horas:
ALTER TABLE solicitudes_alquiler 
  MODIFY duracion INT COMMENT 'Duración en minutos del evento (ej: 360 = 6 horas)',
  ADD INDEX idx_duracion (duracion);

-- Alternativamente, crear tabla de opciones
CREATE TABLE IF NOT EXISTS opciones_duracion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100),
    minutos INT NOT NULL UNIQUE,
    horas_display VARCHAR(50)
);
```

---

### 2.3 Campos Correctos ✅

| Campo | Tipo | Status | Notas |
|-------|------|--------|-------|
| `id_solicitud_alquiler` | INT AUTO_INCREMENT | ✅ OK | PK apropiada |
| `id_solicitud` | INT NOT NULL | ✅ OK | FK correcta con CASCADE |
| `fecha_evento` | DATE | ✅ OK | Tipo correcto |
| `precio_basico` | DECIMAL(10,2) | ✅ OK | Información histórica capturada |
| `estado` | VARCHAR(50) | ✅ OK | Control de flujo correcto |
| `descripcion` | TEXT | ✅ OK | Comentarios de cliente |

---

### 2.4 Campo NULLABLE Sin Lógica Clara ⚠️

#### F) `precio_final` - DECIMAL(10,2), Nullable
```
Problema: ¿Cuándo se calcula? ¿Cuándo se hace NULL?
Referencia en código: finalizarSolicitud() método
```

**Recomendación:**
- Agregar triggers para calcular automáticamente
- O hacer obligatorio en finalize
- O documentar cuándo se calcula

---

## 3. Mapa de Cambios Propuesto (Prioridad)

### FASES DE REFACTOR

#### ✏️ FASE 1: CRÍTICA (Corregir normalización)
1. Crear tabla `opciones_alquiler` con catálogo de tipos de salones
2. Crear tabla `opciones_cantidad_personas` con rangos
3. Crear tabla `opciones_tipo_evento` (o reutilizar `opciones_tipos`)
4. Crear tabla `opciones_duracion` para duración estándar
5. Migrar datos en `solicitudes_alquiler` a IDs (FK)
6. Actualizar controlador `solicitudController.js` para usar JOINs

#### ✏️ FASE 2: IMPORTANTE (Corregir tipos de dato)
1. Cambiar `hora_evento` de VARCHAR(20) a TIME
2. Cambiar `duracion` de VARCHAR(100) a INT
3. Actualizar API para devolver tipos correctos

#### ✏️ FASE 3: MANTENIMIENTO (Documentación)
1. Agregar triggers para precio_final
2. Documentar cálculos de precios
3. Agregar índices en FKs

---

## 4. Script SQL para Crear Tablas Faltantes

```sql
-- =============================================================================
-- TABLAS CATÁLOGO PARA SOLICITUDES_ALQUILER
-- Agregar después de opciones_adicionales en 01_schema.sql
-- =============================================================================

-- Opciones de tipo de sala/servicio
CREATE TABLE IF NOT EXISTS opciones_alquiler (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE COMMENT 'ID único: INFANTILES, BABY_SHOWERS, etc.',
    nombre VARCHAR(255) NOT NULL COMMENT 'Nombre amigable para mostrar',
    descripcion TEXT COMMENT 'Descripción detallada del tipo',
    es_publico TINYINT(1) DEFAULT 1 COMMENT '1=Visible en formularios públicos',
    activo TINYINT(1) DEFAULT 1 COMMENT '1=Disponible, 0=Descontinuado',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
  COMMENT='Catálogo de tipos de salones/servicios para alquiler';

-- Opciones de rango de cantidad de personas
CREATE TABLE IF NOT EXISTS opciones_cantidad_personas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cantidad_minima INT NOT NULL COMMENT 'Límite inferior del rango',
    cantidad_maxima INT NOT NULL COMMENT 'Límite superior del rango',
    nombre VARCHAR(255) NOT NULL COMMENT 'Descripción: "de 1 a 40 personas"',
    es_publico TINYINT(1) DEFAULT 1 COMMENT '1=Visible para clientes',
    activo TINYINT(1) DEFAULT 1 COMMENT '1=Disponible',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_rango (cantidad_minima, cantidad_maxima),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
  COMMENT='Catálogo de rangos de cantidad de personas';

-- Opciones de tipo de evento
CREATE TABLE IF NOT EXISTS opciones_tipo_evento (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE COMMENT 'ID: INFANTILES, ADOLESCENTES, etc.',
    nombre VARCHAR(255) NOT NULL COMMENT 'Nombre para UI',
    descripcion TEXT COMMENT 'Descripción detallada',
    es_publico TINYINT(1) DEFAULT 1 COMMENT '1=Visible',
    activo TINYINT(1) DEFAULT 1 COMMENT '1=Disponible',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
  COMMENT='Catálogo de tipos de eventos';

-- Datos de ejemplo (agregar a 02_seed.sql)
INSERT INTO opciones_alquiler (codigo, nombre, descripcion) VALUES
('INFANTILES', 'Cumpleaños infantil', 'Alquiler de salón para fiestas de niños'),
('ADOLESCENTES', 'Adolescentes', 'Alquiler para eventos adolescentes'),
('CON_SERVICIO_DE_MESA', 'Fiesta de 15 años', 'Evento con servicio de mesa'),
('BABY_SHOWERS', 'Baby shower', 'Alquiler para baby showers y eventos especiales');

INSERT INTO opciones_cantidad_personas (cantidad_minima, cantidad_maxima, nombre) VALUES
(1, 40, 'de 1 a 40 personas'),
(41, 50, 'de 41 a 50 personas'),
(51, 75, 'de 51 a 75 personas'),
(76, 120, 'de 76 a 120 personas'),
(121, 999, 'más de 120 personas');

INSERT INTO opciones_tipo_evento (codigo, nombre, descripcion) VALUES
('INFANTILES', 'Infantiles', 'Cumpleaños y eventos para niños'),
('ADOLESCENTES', 'Adolescentes', 'Eventos para adolescentes'),
('CON_SERVICIO_DE_MESA', 'Con servicio de mesa', 'Eventos formales con servicio'),
('BABY_SHOWERS', 'Baby showers', 'Celebraciones especiales');
```

---

## 5. Resumen Ejecutivo

| Aspecto | Estado | Acción |
|--------|--------|--------|
| **Integridad Referencial** | ✅ CORRECTA | Ninguna (1:1 perfecto) |
| **Normalización** | ⚠️ PROBLEMAS | Crear tablas opciones_* y migrar FKs |
| **Tipos de Dato** | ⚠️ INCONSISTENTES | Cambiar VARCHAR a TIME/INT |
| **Documentación** | ⚠️ DEFICIENTE | Agregar comentarios (HECHO ✓) |
| **Constraint de FK** | ✅ PRESENTE | FK a solicitudes está OK |

**Recomendación:** Implementar FASE 1 en próxima iteración de desarrollo.

---

## 6. Contacto y Referencias

**Análisis realizado:** 28/02/2026  
**Base de datos:** tdc_db (MariaDB 10.6)  
**Versión schema:** 01_schema.sql v2  

Consultar commit: [solicitudController.js - getSolicitudWithAutoDetect()](https://github.com/tu-repo)
