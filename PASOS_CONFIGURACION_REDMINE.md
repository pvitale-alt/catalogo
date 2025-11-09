# ⚡ Guía Rápida: Configuración Redmine en 5 Pasos

## 🎯 Objetivo

Integrar la API de Redmine para sincronizar automáticamente los issues con el catálogo de funcionalidades.

---

## 📝 Paso 1: Obtener API Key de Redmine

1. Ingresa a: https://redmine.mercap.net
2. Click en **Mi cuenta** (esquina superior derecha)
3. Busca **"Clave de acceso a la API"**
4. Click en **"Mostrar"** o **"Resetear"**
5. **Copia la clave** (la necesitarás en el siguiente paso)

> ⚠️ **IMPORTANTE**: Esta clave es personal y secreta. NUNCA la compartas.

---

## 🔧 Paso 2: Configurar Variables de Entorno

### Opción A: Crear archivo `.env` manualmente

En la carpeta `Catalogo/`, crea un archivo llamado `.env` con este contenido:

```env
DATABASE_URL=tu_url_de_neon_aqui
PORT=3000
NODE_ENV=development
REDMINE_URL=https://redmine.mercap.net
REDMINE_TOKEN=tu_api_key_de_redmine_aqui

# ⚠️ IMPORTANTE: Para pruebas, limitar a 15 issues
REDMINE_SYNC_LIMIT=15
```

### Opción B: Copiar desde el ejemplo

```bash
cd Catalogo
cp .env.example .env
# Luego edita .env y reemplaza los valores
```

**Reemplaza:**
- `tu_url_de_neon_aqui` → URL de conexión de Neon
- `tu_api_key_de_redmine_aqui` → API Key que copiaste en el Paso 1

---

## 💾 Paso 3: Ejecutar Migración de Base de Datos

1. Ve a Neon: https://console.neon.tech/
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Abre el archivo `database-migration-redmine.sql` del proyecto
5. Copia **todo** el contenido
6. Pégalo en el SQL Editor
7. Click en **"Run"**

**Resultado esperado:**
```
✅ Migración completada exitosamente
   - Tabla redmine_issues creada
   - Columnas agregadas a funcionalidades
   - Índices creados
```

---

## 🧪 Paso 4: Probar Conexión

Ejecuta el script de prueba:

```bash
cd Catalogo
npm run test:redmine
```

**Resultado esperado:**

```
✅ Conexión exitosa con Redmine
✅ 3 issues obtenidos
🎉 TEST COMPLETADO EXITOSAMENTE
```

**Si hay error:**
- Verifica que `REDMINE_TOKEN` esté bien copiado en `.env`
- Verifica que tu usuario tenga permisos en el proyecto
- Verifica que `REDMINE_URL` sea correcto

---

## 🚀 Paso 5: Iniciar el Servidor

```bash
npm run dev
```

**La sincronización se ejecutará automáticamente:**

```
✅ Servidor corriendo en http://localhost:3000
🔄 Iniciando sincronización automática con Redmine...
📥 Obteniendo issues de Redmine...
✅ 150 issues obtenidos de Redmine
💾 Guardando issues en la base de datos...
✅ Issues guardados: 120 insertados, 30 actualizados
✅ Sincronización inicial completada
```

---

## ✅ Verificación

### 1. Verificar en la base de datos

En Neon SQL Editor:

```sql
-- Ver issues sincronizados
SELECT redmine_id, titulo, estado, sincronizado_en 
FROM redmine_issues 
LIMIT 10;

-- Ver funcionalidades vinculadas
SELECT id, titulo, redmine_id, estado_redmine
FROM funcionalidades 
WHERE redmine_id IS NOT NULL
LIMIT 10;
```

### 2. Verificar en la aplicación

Abre http://localhost:3000/funcionalidades

Deberías ver las funcionalidades sincronizadas desde Redmine.

---

## 🔄 Sincronizar Nuevamente

### Desde la terminal:

```bash
# Sincronizar todos los issues
curl -X POST http://localhost:3000/api/redmine/sincronizar \
  -H "Content-Type: application/json" \
  -d '{"project_id": "ut-bancor"}'

# Sincronizar solo 15 issues (para pruebas)
curl -X POST http://localhost:3000/api/redmine/sincronizar \
  -H "Content-Type: application/json" \
  -d '{"project_id": "ut-bancor", "max_total": 15}'
```

### Desde el navegador:

Puedes crear un botón en la UI que llame a `/api/redmine/sincronizar`.

---

## 📊 Cambiar Proyecto o Filtros

### Cambiar el proyecto a sincronizar

Edita `src/app.js`, línea ~75:

```javascript
// Cambiar 'ut-bancor' por otro proyecto
const resultado = await sincronizacionService.sincronizarRedmine('mi-proyecto', null);
```

### Sincronizar solo Epics (tracker_id = 10)

```javascript
const resultado = await sincronizacionService.sincronizarRedmine('ut-bancor', '10');
```

---

## 🚢 Deploy en Vercel

### Configurar variables de entorno en Vercel:

1. Ve a tu proyecto en Vercel
2. **Settings** > **Environment Variables**
3. Agrega:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | URL de Neon |
| `REDMINE_URL` | `https://redmine.mercap.net` |
| `REDMINE_TOKEN` | Tu API Key |
| `NODE_ENV` | `production` |

4. **Guarda** y haz **Redeploy**

### Sincronizar en producción:

```bash
curl -X POST https://tu-proyecto.vercel.app/api/redmine/sincronizar \
  -H "Content-Type: application/json" \
  -d '{"project_id": "ut-bancor"}'
```

---

## ⚙️ Configurar Límite de Sincronización

### Para Pruebas (recomendado)

En tu archivo `.env`, agrega:

```env
REDMINE_SYNC_LIMIT=15
```

Esto limitará la sincronización a solo 15 issues, evitando saturar Redmine durante las pruebas.

### Para Producción

Comenta o elimina la variable `REDMINE_SYNC_LIMIT` para sincronizar todos los issues:

```env
# REDMINE_SYNC_LIMIT=15  # Comentado para producción
```

O simplemente no la agregues.

### Sincronización Manual con Límite

También puedes especificar el límite al sincronizar manualmente:

```bash
curl -X POST http://localhost:3000/api/redmine/sincronizar \
  -H "Content-Type: application/json" \
  -d '{"project_id": "ut-bancor", "max_total": 15}'
```

## 🐛 ¿Problemas?

Consulta la guía detallada: [CONFIGURACION_REDMINE.md](./CONFIGURACION_REDMINE.md)

### Errores comunes:

| Error | Solución |
|-------|----------|
| `REDMINE_TOKEN no está configurado` | Verifica que `.env` existe y tiene el token |
| `Error HTTP 401` | API Key inválida, resetéala en Redmine |
| `Error HTTP 403` | Sin permisos en el proyecto |
| `Cannot find module` | Ejecuta `npm install` |

---

## 📚 Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `.env` | **CREAR MANUALMENTE** con tus credenciales |
| `database-migration-redmine.sql` | Ejecutar en Neon (paso 3) |
| `test-redmine.js` | Script de prueba (paso 4) |
| `src/app.js` | Configurar proyecto a sincronizar |
| `CONFIGURACION_REDMINE.md` | Guía detallada completa |

---

## ✨ ¡Listo!

Tu catálogo ahora está integrado con Redmine. Los issues se sincronizarán automáticamente cada vez que inicies el servidor (en desarrollo).

**Siguiente paso:** Ajustar los campos de scoring manualmente en cada funcionalidad según necesites.

