# ✅ Resumen Ejecutivo: Integración Redmine - Arquitectura Final

## 🎯 Objetivo Logrado

✅ Integración directa con API de Redmine  
✅ Sincronización automática al levantar el servidor  
✅ Separación clara: datos de Redmine vs datos editables  
✅ **Los datos editables SIEMPRE persisten** (nunca se sobrescriben)  
✅ Límite configurable para pruebas (15 issues)

---

## 📊 Arquitectura de Datos

### Tablas y Su Propósito

| Tabla | Datos | Se Actualiza | Gestión |
|-------|-------|--------------|---------|
| `redmine_issues` | Solo de Redmine (titulo, proyecto, fecha) | ✅ En cada sincronización | Automática |
| `funcionalidades` | Solo editables (descripcion, seccion, monto, score) | ❌ NUNCA | Manual (UI) |
| `clientes` | Clientes del catálogo | ❌ NUNCA | Manual (UI) |
| `cliente_funcionalidad` | Relaciones cliente-funcionalidad | ❌ NUNCA | Manual (UI) |
| `score` | Scores calculados | ❌ NUNCA | Manual (UI) |

---

## 🔄 Flujo de Sincronización

```
INICIO SERVIDOR
     ↓
Obtener issues de Redmine API (15 issues en prueba)
     ↓
Guardar en redmine_issues (titulo, proyecto, fecha)
     ↓
Crear funcionalidades VACÍAS (solo redmine_id)
     ↓
FIN ✅ (Datos editables NO se tocan)
```

---

## 📋 Respuesta a tus Preguntas

### 1. ¿Cómo es el proceso de sincronización?

**Al levantar el servidor:**

1. Se conecta a Redmine API con tu `REDMINE_TOKEN`
2. Obtiene issues del proyecto configurado (ej: `ut-bancor`)
3. Guarda en `redmine_issues` solo:
   - `redmine_id` (ID del issue)
   - `titulo` (sujeto del issue)
   - `proyecto` (nombre del proyecto = sponsor)
   - `fecha_creacion`
4. Crea funcionalidades vacías (solo `redmine_id`) si no existen
5. **NO toca funcionalidades existentes** (datos editables persisten)

**En logs verás:**

```
🚀 Iniciando sincronización automática con Redmine...
⚠️ Modo prueba: limitado a 15 issues
📥 Obteniendo issues del proyecto: ut-bancor
✅ Issues obtenidos: 15
💾 Guardando issues en la base de datos...
✅ Issues guardados: 15 insertados, 0 actualizados
✅ 15 funcionalidades nuevas creadas (vacías)
ℹ️ Funcionalidades existentes NO se actualizan (datos editables persisten)
✅ Sincronización inicial completada
```

### 2. ¿Los issues pueden variar al reiniciar?

**SÍ.** Cada vez que sincronizas:
- Issues nuevos → se insertan en `redmine_issues` y se crean funcionalidades vacías
- Issues existentes → se actualizan en `redmine_issues` (titulo, proyecto pueden cambiar)
- Issues eliminados en Redmine → permanecen en tu BD (no se eliminan automáticamente)

### 3. ¿Los datos editables persisten?

**SÍ, SIEMPRE.** ✅

Campos que **NUNCA** se sobrescriben:
- ✅ `funcionalidades.descripcion`
- ✅ `funcionalidades.seccion`
- ✅ `funcionalidades.monto`
- ✅ `funcionalidades.score_total`
- ✅ Todas las relaciones en `cliente_funcionalidad`
- ✅ Todos los scores en `score`

**Ejemplo:**

```
Sincronización 1:
  - Issue #53047 se sincroniza
  - Se crea funcionalidad vacía

Usuario edita:
  - Descripcion: "Optimización de queries"
  - Seccion: "Performance"
  - Monto: $25,000

Sincronización 2 (reinicio):
  - Issue #53047 se actualiza (titulo cambió en Redmine)
  - funcionalidades NO se toca
  - ✅ Descripcion, Seccion, Monto PERSISTEN
```

### 4. ¿Cómo funciona Mapa de Clientes y Score?

**Mapa de Clientes:**
1. Lee issues desde `redmine_issues` (para mostrar la lista)
2. Usuario agrega clientes manualmente
3. Usuario relaciona clientes con issues (por `redmine_id`)
4. Se guarda en `cliente_funcionalidad`

**Score:**
1. Lee issues desde `redmine_issues` (para mostrar la lista)
2. Usuario selecciona un issue para calcular score
3. Completa criterios (1-5)
4. Se calcula el score y se guarda en `score`
5. Se actualiza `funcionalidades.score_total` automáticamente

---

## 🔧 Variables de Entorno

### Para Pruebas (recomendado ahora)

```env
DATABASE_URL=postgresql://...
REDMINE_URL=https://redmine.mercap.net
REDMINE_TOKEN=tu_api_key_aqui

# Limitar a 15 issues para pruebas
REDMINE_SYNC_LIMIT=15
```

### Para Producción (después)

```env
DATABASE_URL=postgresql://...
REDMINE_URL=https://redmine.mercap.net
REDMINE_TOKEN=tu_api_key_aqui

# Comentar o eliminar para sincronizar todos
# REDMINE_SYNC_LIMIT=15
```

---

## 🚀 Próximos Pasos

### 1. Ejecutar Migración en Neon

1. Ve a Neon SQL Editor
2. Abre `database-restructure-final.sql`
3. Copia y pega todo el contenido
4. Ejecuta (botón "Run")

### 2. Configurar .env

```bash
cd Catalogo
# Editar .env
REDMINE_SYNC_LIMIT=15
```

### 3. Reiniciar Servidor

```bash
npm run dev
```

Verás la sincronización automática en los logs.

### 4. Verificar en Neon

```sql
-- Ver issues sincronizados
SELECT * FROM redmine_issues ORDER BY redmine_id DESC LIMIT 10;

-- Ver funcionalidades (deberían estar vacías)
SELECT * FROM funcionalidades ORDER BY redmine_id DESC LIMIT 10;

-- Ver vista combinada
SELECT * FROM v_funcionalidades_completas ORDER BY redmine_id DESC LIMIT 10;
```

### 5. Usar la Aplicación

1. Ve a http://localhost:3000/funcionalidades
2. Verás los issues sincronizados
3. Edita descripcion, seccion, monto
4. Ve a http://localhost:3000/mapa para agregar clientes
5. Ve a http://localhost:3000/score para calcular scores

---

## 📚 Documentación Creada

1. **`PROCESO_SINCRONIZACION.md`** ← Explicación detallada del flujo
2. **`CAMBIOS_ESTRUCTURA_FINAL.md`** ← Cambios en la BD
3. **`database-restructure-final.sql`** ← Script de migración
4. **`PASOS_CONFIGURACION_REDMINE.md`** ← Guía de configuración
5. **`README.md`** ← Documentación completa del proyecto

---

## ✅ Checklist

- [ ] Ejecutar `database-restructure-final.sql` en Neon
- [ ] Configurar `REDMINE_SYNC_LIMIT=15` en `.env`
- [ ] Reiniciar servidor: `npm run dev`
- [ ] Verificar sincronización en logs
- [ ] Verificar datos en Neon
- [ ] Probar la aplicación
- [ ] Agregar clientes desde Mapa
- [ ] Calcular scores desde Score
- [ ] Editar funcionalidades desde Funcionalidades

---

## 🎉 Resultado Final

✅ **Integración completa con Redmine**  
✅ **Datos editables persisten siempre**  
✅ **Sincronización no destructiva**  
✅ **Arquitectura clara y mantenible**  
✅ **Listo para producción**

---

¿Dudas? Consulta `PROCESO_SINCRONIZACION.md` para más detalles.

