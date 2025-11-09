# 🔧 Configuración de Integración con Redmine

Esta guía te ayudará a configurar la integración directa con la API de Redmine para sincronizar automáticamente los issues con el catálogo de funcionalidades.

## 📋 Requisitos Previos

- ✅ Base de datos PostgreSQL (Neon) configurada
- ✅ API Key de Redmine con permisos de lectura
- ✅ Acceso a la instancia de Redmine (https://redmine.mercap.net)

---

## 🚀 Paso 1: Obtener tu API Key de Redmine

1. Ingresa a Redmine: https://redmine.mercap.net
2. Ve a **Mi cuenta** (esquina superior derecha)
3. En el menú lateral, busca **"Clave de acceso a la API"**
4. Si no tienes una clave, haz clic en **"Mostrar"** o **"Resetear"**
5. **Copia la clave** (la necesitarás en el siguiente paso)

> ⚠️ **IMPORTANTE**: Esta clave es personal y secreta. NUNCA la compartas públicamente ni la subas a Git.

---

## 🔑 Paso 2: Configurar Variables de Entorno

### En Desarrollo (Local)

1. Crea un archivo `.env` en la raíz del proyecto `Catalogo/`:

```bash
cd Catalogo
# Crear archivo .env (copiar desde .env.example)
```

2. Agrega las siguientes variables en el archivo `.env`:

```env
# Base de datos (Neon)
DATABASE_URL=postgresql://usuario:password@host/database?sslmode=require

# Puerto del servidor
PORT=3000
NODE_ENV=development

# ===== REDMINE API (OBLIGATORIO) =====
REDMINE_URL=https://redmine.mercap.net
REDMINE_TOKEN=tu_api_key_de_redmine_aqui
```

3. Reemplaza `tu_api_key_de_redmine_aqui` con la API Key que obtuviste en el Paso 1

### En Producción (Vercel)

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto del catálogo
3. Ve a **Settings** > **Environment Variables**
4. Agrega las siguientes variables:

| Variable | Valor | Entorno |
|----------|-------|---------|
| `DATABASE_URL` | URL de Neon | Production |
| `REDMINE_URL` | `https://redmine.mercap.net` | Production |
| `REDMINE_TOKEN` | Tu API Key de Redmine | Production |
| `NODE_ENV` | `production` | Production |

5. Guarda y **redeploy** el proyecto para que tome las nuevas variables

---

## 💾 Paso 3: Ejecutar Migración de Base de Datos

La migración creará la tabla `redmine_issues` y adaptará la estructura existente:

1. **Conéctate a tu base de datos Neon**:
   - Ve a https://console.neon.tech/
   - Selecciona tu proyecto
   - Ve a **SQL Editor**

2. **Ejecuta el script de migración**:
   - Abre el archivo `database-migration-redmine.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor de Neon
   - Haz clic en **"Run"**

3. **Verifica que se creó correctamente**:

```sql
-- Verificar que la tabla existe
SELECT COUNT(*) FROM redmine_issues;

-- Verificar que funcionalidades tiene las nuevas columnas
SELECT redmine_id, fecha, estado_redmine FROM funcionalidades LIMIT 1;
```

---

## 🧪 Paso 4: Probar la Conexión

### Opción A: Desde el código (automático)

1. Inicia el servidor:

```bash
cd Catalogo
npm run dev
```

2. El servidor **automáticamente** sincronizará los issues al iniciar (solo en desarrollo)

3. Verifica los logs en la consola:

```
✅ Servidor corriendo en http://localhost:3000
🚀 Iniciando sincronización automática con Redmine...
🔍 Consultando Redmine: https://redmine.mercap.net/issues.json
   Proyecto: ut-bancor, Estado: *, Límite: 100
✅ Issues obtenidos: 150
💾 Guardando issues en la base de datos...
✅ Issues guardados: 120 insertados, 30 actualizados
✅ Sincronización inicial completada
```

### Opción B: Desde la API (manual)

1. **Probar conexión**:

```bash
curl http://localhost:3000/api/redmine/test
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Conexión exitosa con Redmine"
}
```

2. **Ver issues de Redmine** (sin guardar en BD):

```bash
curl "http://localhost:3000/api/redmine/issues?project_id=ut-bancor&limit=5"
```

3. **Sincronizar manualmente**:

```bash
curl -X POST http://localhost:3000/api/redmine/sincronizar \
  -H "Content-Type: application/json" \
  -d '{"project_id": "ut-bancor"}'
```

4. **Ver estado de la sincronización**:

```bash
curl http://localhost:3000/api/redmine/estado
```

---

## 📊 Paso 5: Verificar los Datos

1. **Ver issues sincronizados en la base de datos**:

```sql
-- Issues de Redmine
SELECT redmine_id, titulo, proyecto, estado, sincronizado_en 
FROM redmine_issues 
LIMIT 10;

-- Funcionalidades vinculadas a Redmine
SELECT id, titulo, redmine_id, estado_redmine, fecha
FROM funcionalidades 
WHERE redmine_id IS NOT NULL
LIMIT 10;

-- Vista completa (funcionalidades + datos de Redmine)
SELECT * FROM v_funcionalidades_completas LIMIT 10;
```

2. **Ver en la aplicación web**:
   - Abre http://localhost:3000/funcionalidades
   - Deberías ver las funcionalidades sincronizadas desde Redmine

---

## 🔄 ¿Cómo Sincronizar Después?

### Sincronización Automática

Por defecto, la sincronización **solo ocurre al iniciar el servidor** (en desarrollo).

En **producción**, la sincronización automática está **deshabilitada** para evitar sobrecarga en cada request serverless de Vercel.

### Sincronización Manual

Puedes sincronizar manualmente cuando lo necesites:

```bash
# Desde la terminal
curl -X POST https://tu-proyecto.vercel.app/api/redmine/sincronizar \
  -H "Content-Type: application/json" \
  -d '{"project_id": "ut-bancor"}'
```

O puedes crear un botón en la UI para que los usuarios administradores puedan sincronizar.

### Sincronización Programada (Opcional)

Si quieres sincronizar periódicamente, puedes usar:

1. **Vercel Cron Jobs** (requiere plan Pro)
2. **GitHub Actions** con un workflow programado
3. **Servicio externo** como Zapier o Make que llame a `/api/redmine/sincronizar`

---

## 🎯 Proyectos y Filtros

Por defecto, se sincronizan todos los issues del proyecto `ut-bancor`.

### Cambiar el proyecto a sincronizar

Edita `src/app.js`, línea ~75:

```javascript
// Cambiar 'ut-bancor' por el ID de tu proyecto
const resultado = await sincronizacionService.sincronizarRedmine('ut-bancor', null);
```

### Filtrar por tipo de issue (Tracker)

Si solo quieres sincronizar Epics (tracker_id = 10):

```javascript
// Solo sincronizar Epics
const resultado = await sincronizacionService.sincronizarRedmine('ut-bancor', '10');
```

Para otros trackers, consulta los IDs en Redmine:
- Epic: 10
- Feature: (consultar en Redmine)
- Bug: (consultar en Redmine)

---

## 🔐 Seguridad

### ✅ Buenas Prácticas Implementadas

1. **Solo lectura**: El servicio solo hace GET requests (nunca POST/PUT/DELETE)
2. **Token seguro**: El token nunca se expone en logs ni se devuelve en la API
3. **Variables de entorno**: Credenciales almacenadas en `.env` (no en código)
4. **Validación**: Se valida que el token esté configurado antes de hacer requests

### ⚠️ Recomendaciones

1. **Nunca** subas el archivo `.env` a Git (ya está en `.gitignore`)
2. **Nunca** expongas tu API Key en código o logs
3. En Vercel, marca `REDMINE_TOKEN` como **sensible** (encrypted)
4. Si crees que tu token fue comprometido, resetéalo inmediatamente en Redmine

---

## 🐛 Troubleshooting

### Error: "REDMINE_TOKEN no está configurado"

**Causa**: No configuraste la variable de entorno.

**Solución**: Verifica que el archivo `.env` existe y tiene `REDMINE_TOKEN=...`

### Error: "Error HTTP 401: Unauthorized"

**Causa**: La API Key es inválida o fue revocada.

**Solución**: 
1. Ve a Redmine > Mi cuenta
2. Resetea tu API Key
3. Actualiza el valor en `.env`
4. Reinicia el servidor

### Error: "Error HTTP 403: Forbidden"

**Causa**: Tu usuario no tiene permisos para acceder al proyecto.

**Solución**: Solicita permisos de lectura al proyecto en Redmine.

### Error: "Cannot find module './services/sincronizacionService'"

**Causa**: Los archivos no se desplegaron correctamente.

**Solución**: 
1. Verifica que `src/services/sincronizacionService.js` existe
2. Haz commit y push a GitHub
3. Vercel redesplegará automáticamente

### La sincronización es muy lenta

**Causa**: El proyecto tiene muchos issues (>1000).

**Solución**: 
1. Filtra por tracker específico: `sincronizarRedmine('ut-bancor', '10')`
2. Filtra por estado: modifica `status_id` en el servicio
3. Aumenta el límite en `obtenerIssues` (max: 100 por request)

---

## 📝 Resumen de Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `src/services/redmineDirectService.js` | Servicio para consumir API de Redmine |
| `src/services/sincronizacionService.js` | Lógica de sincronización con BD |
| `src/routes/redmineRoutes.js` | Endpoints API para sincronización |
| `database-migration-redmine.sql` | Script de migración de BD |
| `.env` | Variables de entorno (crear manualmente) |

---

## ✅ Checklist de Configuración

- [ ] Obtuve mi API Key de Redmine
- [ ] Creé el archivo `.env` con las variables necesarias
- [ ] Ejecuté la migración `database-migration-redmine.sql` en Neon
- [ ] Inicié el servidor con `npm run dev`
- [ ] Verifiqué que la sincronización funcionó correctamente
- [ ] Configuré las variables de entorno en Vercel (para producción)
- [ ] Probé la sincronización manual con `/api/redmine/sincronizar`

---

¡Listo! La integración con Redmine está configurada. 🎉

Para cualquier duda, revisa los logs del servidor o consulta la documentación de la API de Redmine.

