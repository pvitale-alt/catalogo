##📋 Proceso de Sincronización y Persistencia de Datos

## 🎯 Concepto Clave

**Los datos de Redmine (no editables) y los datos del Catálogo (editables) están SEPARADOS:**

- `redmine_issues` → Datos de Redmine (se actualizan en cada sincronización)
- `funcionalidades` → Datos editables del Catálogo (SIEMPRE persisten)

---

## 🔄 Proceso de Sincronización al Levantar el Servidor

### Paso 1: Obtener Issues de Redmine

```
📥 Conectar a API de Redmine
   └─> Obtener issues del proyecto (ej: ut-bancor)
       └─> Mapear solo:
           - redmine_id
           - titulo
           - proyecto (sponsor)
           - fecha_creacion
```

### Paso 2: Guardar en `redmine_issues`

```sql
INSERT INTO redmine_issues (redmine_id, titulo, proyecto, fecha_creacion)
VALUES (53047, 'UT - Bloqueos en la BD...', 'UT Bancor', '2025-11-04')
ON CONFLICT (redmine_id) 
DO UPDATE SET 
    titulo = EXCLUDED.titulo,        -- Se actualiza si cambió en Redmine
    proyecto = EXCLUDED.proyecto,    -- Se actualiza si cambió en Redmine
    fecha_creacion = EXCLUDED.fecha_creacion;
```

**Resultado:**
- ✅ Issues nuevos → se insertan
- ✅ Issues existentes → se actualizan (titulo, proyecto pueden cambiar)

### Paso 3: Crear Funcionalidades Vacías (Solo si No Existen)

```sql
INSERT INTO funcionalidades (redmine_id)
SELECT r.redmine_id
FROM redmine_issues r
WHERE NOT EXISTS (
    SELECT 1 FROM funcionalidades f WHERE f.redmine_id = r.redmine_id
);
```

**Resultado:**
- ✅ Si el issue es nuevo → se crea una funcionalidad VACÍA
- ✅ Si la funcionalidad ya existe → NO SE TOCA

### Paso 4: ¿Qué Pasa con los Datos Editables?

**LOS DATOS EDITABLES SIEMPRE PERSISTEN** ✅

Campos que **NUNCA** se sobrescriben:
- ✅ `descripcion` (editable)
- ✅ `seccion` (editable)
- ✅ `monto` (editable)
- ✅ `score_total` (calculado, editable desde Score)

---

## 📊 Ejemplo Práctico

### Sincronización 1 (Primera vez)

**Redmine tiene:**
- Issue #53047: "UT - Bloqueos en la BD"
- Proyecto: "UT Bancor | Mantenimiento"

**Resultado en BD:**

`redmine_issues`:
| redmine_id | titulo | proyecto |
|---|---|---|
| 53047 | UT - Bloqueos en la BD | UT Bancor \| Mantenimiento |

`funcionalidades`:
| id | redmine_id | descripcion | seccion | monto | score_total |
|---|---|---|---|---|---|
| 1 | 53047 | NULL | NULL | NULL | 0 |

### Usuario Edita Desde la UI

Usuario va a `/funcionalidades/53047/editar` y completa:
- Descripción: "Optimización de queries"
- Sección: "Performance"
- Monto: $25,000

**Resultado en BD:**

`funcionalidades`:
| id | redmine_id | descripcion | seccion | monto | score_total |
|---|---|---|---|---|---|
| 1 | 53047 | Optimización de queries | Performance | 25000 | 0 |

### Sincronización 2 (Reinicio del servidor)

**Redmine cambió:**
- Título ahora es: "UT - Bloqueos en BD (RESUELTO)"

**Resultado en BD:**

`redmine_issues` (se actualiza):
| redmine_id | titulo | proyecto |
|---|---|---|
| 53047 | UT - Bloqueos en BD (RESUELTO) | UT Bancor \| Mantenimiento |

`funcionalidades` (NO se toca):
| id | redmine_id | descripcion | seccion | monto | score_total |
|---|---|---|---|---|---|
| 1 | 53047 | Optimización de queries | Performance | 25000 | 0 |

**🎉 Los datos editables PERSISTEN**

---

## 🗺️ Mapa de Clientes

### Cómo Funciona

1. **Vista usa la tabla `redmine_issues`** para mostrar todos los issues
2. **Usuario agrega clientes manualmente** desde la UI
3. **Usuario relaciona clientes con funcionalidades** (por redmine_id)

### Proceso

```
Usuario en Mapa de Clientes:
  └─> Ve lista de issues desde redmine_issues
      └─> Hace clic en "Agregar cliente"
          └─> Inserta en tabla clientes
              └─> Relaciona cliente con funcionalidad (por redmine_id)
                  └─> Inserta en cliente_funcionalidad
```

### Ejemplo

```sql
-- 1. Usuario agrega cliente
INSERT INTO clientes (nombre, descripcion) 
VALUES ('Banco Nación', 'Cliente principal');

-- 2. Usuario relaciona cliente con funcionalidad
INSERT INTO cliente_funcionalidad (cliente_id, funcionalidad_id, estado_comercial)
VALUES (1, 53047, 'Implementado');
```

---

## 📈 Score

### Cómo Funciona

1. **Vista usa `redmine_issues`** para mostrar todos los issues
2. **Usuario calcula score** para funcionalidades específicas
3. **Score se guarda en tabla `score`** (relacionado por redmine_id)
4. **Score calculado se actualiza en `funcionalidades.score_total`**

### Proceso

```
Usuario en Score:
  └─> Ve lista de issues desde redmine_issues
      └─> Selecciona un issue para calcular score
          └─> Completa criterios (1-5)
              └─> Sistema calcula score
                  └─> Inserta en tabla score
                      └─> Actualiza funcionalidades.score_total
```

### Ejemplo

```sql
-- Usuario calcula score para issue #53047
INSERT INTO score (funcionalidad_id, origen, facturacion, urgencia, ...)
VALUES (53047, 4, 5, 3, ...);

-- Trigger automático actualiza funcionalidades
UPDATE funcionalidades 
SET score_total = 8.5
WHERE redmine_id = 53047;
```

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si elimino un issue en Redmine?

**NO pasa nada.** La tabla `redmine_issues` tiene el issue antiguo. En la próxima sincronización:
- El issue no viene de Redmine
- Permanece en `redmine_issues` (no se elimina)
- Los datos editables en `funcionalidades` persisten

Si quieres eliminarlo, debes hacerlo manualmente desde la UI.

### ¿Qué pasa si cambio el título del issue en Redmine?

**Se actualiza automáticamente** en `redmine_issues`. Los datos editables no se tocan.

### ¿Qué pasa si agrego un nuevo issue en Redmine?

En la próxima sincronización:
1. Se inserta en `redmine_issues`
2. Se crea una funcionalidad vacía en `funcionalidades`
3. Usuario puede editar los datos desde la UI

### ¿Los datos editables se pierden al sincronizar?

**NO.** Los datos editables SIEMPRE persisten:
- ✅ Descripción
- ✅ Sección
- ✅ Monto
- ✅ Score
- ✅ Relaciones con clientes

### ¿Cómo se muestra la información en la UI?

Se usa la vista `v_funcionalidades_completas` que combina:
- Datos de `redmine_issues` (titulo, proyecto)
- Datos de `funcionalidades` (descripcion, seccion, monto, score)

```sql
SELECT * FROM v_funcionalidades_completas;
```

Resultado:
| redmine_id | titulo | sponsor | descripcion | seccion | monto | score_total | epic_redmine |
|---|---|---|---|---|---|---|---|
| 53047 | UT - Bloqueos... | UT Bancor | Optimización... | Performance | 25000 | 8.5 | https://redmine.mercap.net/issues/53047 |

---

## 🔄 Resumen del Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│  1. SERVIDOR SE INICIA                                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. SINCRONIZACIÓN CON REDMINE                              │
│     - Obtener issues de Redmine API                         │
│     - Guardar en redmine_issues (titulo, proyecto, fecha)   │
│     - Crear funcionalidades vacías si no existen            │
│     - NO tocar datos editables existentes                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. USUARIO USA LA APLICACIÓN                               │
│                                                             │
│  📋 Funcionalidades:                                        │
│     - Ve issues desde redmine_issues                        │
│     - Edita descripcion, seccion, monto                     │
│     - Datos se guardan en funcionalidades                   │
│                                                             │
│  🗺️ Mapa de Clientes:                                      │
│     - Agrega clientes manualmente                           │
│     - Relaciona clientes con issues (por redmine_id)        │
│     - Datos se guardan en cliente_funcionalidad             │
│                                                             │
│  📈 Score:                                                  │
│     - Ve issues desde redmine_issues                        │
│     - Calcula score para issues específicos                 │
│     - Datos se guardan en score                             │
│     - Se actualiza funcionalidades.score_total              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  4. SERVIDOR SE REINICIA (o nueva sincronización)           │
│     - Issues de Redmine pueden cambiar                      │
│     - redmine_issues se actualiza                           │
│     - ✅ DATOS EDITABLES PERSISTEN (NO se tocan)            │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Ventajas de Esta Arquitectura

1. **Separación clara** entre datos de Redmine y datos del Catálogo
2. **Datos editables SIEMPRE persisten** (no se pierden)
3. **Sincronización no destructiva** (solo actualiza lo necesario)
4. **Flexibilidad** para editar sin perder datos
5. **Auditoría** clara de qué viene de Redmine y qué es del Catálogo

---

## 🚀 Próximos Pasos

1. **Ejecutar migración**: `database-restructure-final.sql` en Neon
2. **Reiniciar servidor**: `npm run dev`
3. **Verificar sincronización**: Ver logs del servidor
4. **Agregar clientes**: Desde Mapa de Clientes
5. **Calcular scores**: Desde la calculadora de Score
6. **Editar funcionalidades**: Desde la vista de detalle

---

**Nota**: Esta arquitectura garantiza que **NUNCA perderás datos editables** al sincronizar con Redmine.

