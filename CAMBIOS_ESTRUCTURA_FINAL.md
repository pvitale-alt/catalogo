# 🔄 Cambios en la Estructura de la Base de Datos

## 📋 Resumen de Cambios

Se reestructuró completamente la base de datos para **separar datos de Redmine (no editables) de datos del Catálogo (editables)**.

---

## 🗂️ Nueva Estructura de Tablas

### 1. `redmine_issues` (Solo datos de Redmine)

**Antes:**
- 17 columnas con muchos datos mezclados

**Ahora:**
```sql
CREATE TABLE redmine_issues (
    id SERIAL PRIMARY KEY,
    redmine_id INTEGER UNIQUE NOT NULL,
    titulo VARCHAR(500) NOT NULL,
    proyecto VARCHAR(255),          -- Es el "sponsor"
    fecha_creacion TIMESTAMP,
    sincronizado_en TIMESTAMP
);
```

**Propósito:** Almacenar SOLO los datos que vienen de Redmine. Se actualizan en cada sincronización.

---

### 2. `funcionalidades` (Solo datos editables)

**Antes:**
- Muchos campos mezclados (algunos de Redmine, otros editables)

**Ahora:**
```sql
CREATE TABLE funcionalidades (
    id SERIAL PRIMARY KEY,
    redmine_id INTEGER UNIQUE NOT NULL,  -- Referencia a redmine_issues
    -- Campos EDITABLES del catálogo
    descripcion TEXT,                    -- Editable desde UI
    seccion VARCHAR(100),                -- Editable desde UI
    monto DECIMAL(12, 2),                -- Editable desde UI
    score_total DECIMAL(5, 2),           -- Calculado desde Score
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Propósito:** Almacenar SOLO los datos editables del catálogo. **NUNCA se sobrescriben en sincronización**.

---

### 3. `clientes` (Gestión manual)

**Cambios:**
- Se vació completamente
- Se eliminó columna `codigo`
- Se agregó columna `descripcion`
- Se agregó columna `color` (para UI)
- Se agregó columna `activo`

```sql
ALTER TABLE clientes 
ADD COLUMN descripcion TEXT,
ADD COLUMN color VARCHAR(7) DEFAULT '#0D5AA2',
ADD COLUMN activo BOOLEAN DEFAULT true;
```

**Propósito:** Gestionar clientes manualmente desde "Mapa de Clientes".

---

### 4. `cliente_funcionalidad` (Relación simplificada)

**Antes:**
- Muchos campos innecesarios

**Ahora:**
```sql
CREATE TABLE cliente_funcionalidad (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    funcionalidad_id INTEGER NOT NULL,   -- redmine_id
    estado_comercial VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Propósito:** Relacionar clientes con funcionalidades. Se gestiona desde "Mapa de Clientes".

---

### 5. `score` (Simplificada)

**Cambios:**
- `funcionalidad_id` ahora es `redmine_id` (no el ID de funcionalidades)
- Se vació para empezar desde cero

```sql
CREATE TABLE score (
    id SERIAL PRIMARY KEY,
    funcionalidad_id INTEGER NOT NULL,   -- redmine_id
    origen INTEGER,
    facturacion INTEGER,
    -- ... otros criterios ...
    score_calculado DECIMAL(5, 2),
    UNIQUE(funcionalidad_id)
);
```

**Propósito:** Almacenar scores calculados. Se gestiona desde "Calculadora de Score".

---

## 🔄 Proceso de Sincronización

### Antes:
1. Sincronizar issues
2. Insertar/actualizar funcionalidades (sobrescribía datos editables ❌)

### Ahora:
1. Sincronizar issues → `redmine_issues` (actualiza titulo, proyecto)
2. Crear funcionalidades VACÍAS si no existen
3. **NUNCA tocar datos editables existentes** ✅

---

## 📊 Vista Combinada

Se creó una vista para combinar datos de ambas tablas:

```sql
CREATE VIEW v_funcionalidades_completas AS
SELECT 
    f.id,
    f.redmine_id,
    r.titulo,                    -- De Redmine
    r.proyecto AS sponsor,       -- De Redmine
    f.descripcion,               -- Del Catálogo (editable)
    CONCAT('https://redmine.mercap.net/issues/', f.redmine_id) AS epic_redmine,
    f.seccion,                   -- Del Catálogo (editable)
    f.monto,                     -- Del Catálogo (editable)
    f.score_total,               -- Del Catálogo (calculado)
    r.fecha_creacion,
    f.updated_at
FROM funcionalidades f
INNER JOIN redmine_issues r ON f.redmine_id = r.redmine_id;
```

---

## ✅ Ventajas

1. **Datos editables SIEMPRE persisten** ✅
2. **Separación clara** entre Redmine y Catálogo
3. **Sincronización no destructiva**
4. **Estructura más simple y clara**
5. **Menos redundancia de datos**

---

## 🚀 Cómo Migrar

### Paso 1: Hacer backup

```bash
# En Neon SQL Editor
-- Exportar datos actuales (opcional)
COPY funcionalidades TO '/tmp/funcionalidades_backup.csv' CSV HEADER;
```

### Paso 2: Ejecutar migración

1. Abre `database-restructure-final.sql`
2. Copia todo el contenido
3. Pega en Neon SQL Editor
4. Ejecuta

### Paso 3: Reiniciar servidor

```bash
npm run dev
```

Verás en los logs:

```
✅ Servidor corriendo en http://localhost:3000
🚀 Iniciando sincronización automática con Redmine...
📥 Obteniendo issues del proyecto: ut-bancor
✅ Issues obtenidos: 15
💾 Guardando issues en la base de datos...
✅ Issues guardados: 15 insertados, 0 actualizados
✅ 15 funcionalidades nuevas creadas (vacías)
ℹ️ Funcionalidades existentes NO se actualizan (datos editables persisten)
✅ Sincronización inicial completada
```

### Paso 4: Verificar

```sql
-- Ver issues sincronizados
SELECT * FROM redmine_issues LIMIT 10;

-- Ver funcionalidades (deberían estar vacías)
SELECT * FROM funcionalidades LIMIT 10;

-- Ver vista combinada
SELECT * FROM v_funcionalidades_completas LIMIT 10;
```

---

## 📝 Pasos Siguientes

1. ✅ Migración ejecutada
2. ⬜ Agregar clientes desde "Mapa de Clientes"
3. ⬜ Editar funcionalidades (descripcion, seccion, monto)
4. ⬜ Calcular scores desde "Calculadora de Score"
5. ⬜ Relacionar clientes con funcionalidades

---

## ❓ Preguntas Frecuentes

### ¿Se perderán mis datos editables?

**NO.** Si ejecutas la migración en una base nueva (vacía), no hay datos que perder. Si ejecutas en una base existente, el script hace `TRUNCATE` para empezar desde cero.

### ¿Tengo que volver a cargar todo manualmente?

**Sí**, pero solo una vez. Después, los datos persistirán siempre.

### ¿Qué pasa si ya tengo datos?

La migración hace `TRUNCATE` en clientes, cliente_funcionalidad y score. Si quieres conservarlos, haz backup antes.

### ¿Los issues de Redmine se sincronizarán siempre?

**Sí.** En cada inicio del servidor (o sincronización manual), los issues se actualizan desde Redmine. Solo se actualiza `titulo` y `proyecto`, nunca los datos editables.

---

**✅ Listo para ejecutar la migración.**

