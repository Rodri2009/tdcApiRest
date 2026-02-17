# Lógica de Negocio - TDC App

## Tipos de Clientes y Eventos

La aplicación maneja **4 tipos principales de clientes**, cada uno con su propio flujo:

---

### 1. ALQUILER_SALON (Cliente que alquila el salón)
- **Página de entrada:** `page.html`
- **Genera:** Solicitud de evento
- **Es público en index.html:** NO (solo se muestra cuando está confirmado como evento privado)

#### Subtipos:
| ID | Nombre | Descripción |
|----|--------|-------------|
| `SIN_SERVICIO_DE_MESA` | Fiestas sin servicio de mesa (ALQUILER) | Alquiler básico sin personal de servicio |
| `CON_SERVICIO_DE_MESA` | Fiestas de 15/18/casamientos (SERVICIO COMPLETO) | Incluye meseras y servicio completo |
| `INFORMALES` | Juntadas familiares/amigos (SERVICIO ECONÓMICO) | Eventos simples con parrilla |
| `INFANTILES` | Cumpleaños infantiles hasta 12 años | Incluye inflable y juegos |
| `ADOLESCENTES` | Cumpleaños de 13-17 años | Sin inflable, con cancha |
| `BABY_SHOWERS` | Baby showers/Bautismos/Comuniones | Eventos familiares tranquilos |

#### Flujo:
```
page.html → Solicitud → Admin confirma → Evento privado
```

---

### 2. FECHA_BANDAS (Cliente que viene a ver bandas o quiere tocar)
- **Página de entrada (espectador):** `agenda_de_bandas.html`
- **Página de entrada (banda):** `solicitud_banda.html`
- **Genera:** Solicitud de fecha para banda
- **Es público en index.html:** SÍ (botón "Sacar entrada")

#### Subtipos:
- No tiene subtipos (el tipo principal ES el subtipo)

#### Flujo espectador:
```
index.html (agenda) → agenda_de_bandas.html → Comprar entrada
```

#### Flujo banda:
```
solicitud_banda.html → Solicitud → Admin confirma → Evento público en agenda
```

---

### 3. TALLERES (Cliente que participa o da talleres) - FUTURO
- **Página de entrada (participante):** Por crear
- **Página de entrada (instructor):** Por crear
- **Genera:** Registro o solicitud de taller
- **Es público en index.html:** SÍ (botón "Registrarse")

#### Subtipos (posibles):
| ID | Nombre |
|----|--------|
| `TALLER` | Taller (aprendizaje) |
| `ACTIVIDAD` | Actividad (participación) |

---

### 4. SERVICIO (Cliente que usa servicios del local) - FUTURO
- **Página de entrada:** Por crear
- **Genera:** Reserva de turno
- **Es público en index.html:** SÍ (botón "Sacar turno")

#### Subtipos:
| ID | Nombre |
|----|--------|
| `DEPILACION_DEFINITIVA` | Depilación definitiva |

---

## Estructura de Base de Datos

### Tabla: `opciones_tipos`
```sql
CREATE TABLE opciones_tipos (
    id_evento VARCHAR(50) PRIMARY KEY,        -- Ej: 'INFANTILES', 'FECHA_BANDAS'
    nombre_para_mostrar VARCHAR(255),
    descripcion TEXT,
    monto_sena DECIMAL(10,2),
    deposito DECIMAL(10,2),
    es_publico TINYINT(1),                    -- 1 = aparece en agenda pública
    categoria VARCHAR(50)                      -- 'ALQUILER_SALON', 'FECHA_BANDAS', 'TALLERES', 'SERVICIO'
);
```

### Relación Categoría ↔ Subtipos:
| Categoría | Subtipos |
|-----------|----------|
| `ALQUILER_SALON` | SIN_SERVICIO_DE_MESA, CON_SERVICIO_DE_MESA, INFORMALES, INFANTILES, ADOLESCENTES, BABY_SHOWERS |
| `FECHA_BANDAS` | FECHA_BANDAS (sin subtipos, es_publico=1) |
| `TALLERES` | TALLER, ACTIVIDAD (futuro) |
| `SERVICIO` | DEPILACION_DEFINITIVA (futuro) |

---

## Flujo General de Solicitudes

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SOLICITUD     │ --> │  CONFIRMACIÓN   │ --> │     EVENTO      │
│   (pending)     │     │  (por admin)    │     │   (activo)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **Solicitud:** Cliente llena formulario, se guarda en `solicitudes`
2. **Confirmación:** Admin revisa y aprueba en `admin_solicitudes.html`
3. **Evento:** Se crea registro en `eventos` y aparece en agenda si es público

---

## Visibilidad en index.html (Agenda)

Solo los eventos con `es_publico = 1` aparecen en la agenda pública:
- ✅ FECHA_BANDAS → Botón "Sacar entrada"
- ✅ TALLERES → Botón "Registrarse" (futuro)
- ✅ SERVICIO → Botón "Sacar turno" (futuro)
- ❌ ALQUILER_SALON → NO aparece (eventos privados)

---

## Prioridad de Desarrollo

### Fase 1 (Actual):
- [x] ALQUILER_SALON con todos sus subtipos
- [x] FECHA_BANDAS

### Fase 2 (Futuro):
- [ ] TALLERES
- [ ] SERVICIO (DEPILACION_DEFINITIVA)
