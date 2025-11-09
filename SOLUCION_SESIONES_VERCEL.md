# 🔐 Solución: Problema de Sesiones en Vercel

## Problema

Al hacer deploy en Vercel, el login no funciona correctamente:
- La pantalla de login se muestra
- Al ingresar la contraseña correcta, vuelve a cargar la pantalla de login
- No permite acceder al catálogo
- **En localhost funciona correctamente**

## Causa

En Vercel (entorno serverless), **las sesiones en memoria NO funcionan** porque cada request puede ir a una instancia diferente del servidor. Las sesiones se pierden entre requests, causando que el usuario sea redirigido constantemente a `/login` (error 302).

**Solución:** Usar PostgreSQL como store de sesiones para que persistan entre requests.

## Solución Implementada

Se actualizó la configuración de sesiones en `src/app.js` para usar **PostgreSQL como store de sesiones**:

1. ✅ Instalado `connect-pg-simple` para almacenar sesiones en PostgreSQL
2. ✅ Configurado el store de sesiones para usar el pool de conexiones existente
3. ✅ La tabla `session` se crea automáticamente si no existe
4. ✅ Cookies configuradas correctamente para HTTPS (`secure: true`, `sameSite: 'lax'`)
5. ✅ Guardado explícito de sesión antes de redirigir

**Esto permite que las sesiones persistan entre requests en Vercel serverless.**

## Configuración en Vercel

### Variables de Entorno Requeridas

En el dashboard de Vercel, ve a **Settings > Environment Variables** y agrega:

#### 1. SESSION_SECRET (OBLIGATORIO)

```
Nombre: SESSION_SECRET
Valor: [genera una clave secreta aleatoria]
```

**Cómo generar una clave secreta:**
```bash
# En tu terminal local:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O usa un generador online: https://randomkeygen.com/

**⚠️ IMPORTANTE:** Esta clave debe ser:
- Única y aleatoria
- Al menos 32 caracteres
- No compartirla públicamente

#### 2. DEBUG_SESSIONS (OPCIONAL - Solo para debugging)

Si el problema persiste, habilita el debug temporalmente:

```
Nombre: DEBUG_SESSIONS
Valor: true
```

Esto mostrará logs detallados en la consola de Vercel para diagnosticar el problema.

### Variables de Entorno Completas

Asegúrate de tener todas estas variables configuradas en Vercel:

```env
# Base de datos
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Sesiones (OBLIGATORIO para que funcione el login)
SESSION_SECRET=tu_clave_secreta_generada_aqui

# Redmine API
REDMINE_URL=https://redmine.mercap.net
REDMINE_TOKEN=tu_api_key_de_redmine

# Opcional - Solo para debugging
DEBUG_SESSIONS=false
```

## Pasos para Solucionar

1. **Instalar dependencia (si no está instalada):**
   ```bash
   npm install connect-pg-simple
   ```
   O si ya hiciste push, Vercel la instalará automáticamente.

2. **Generar SESSION_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Agregar en Vercel:**
   - Ve a tu proyecto en Vercel
   - Settings > Environment Variables
   - Agregar `SESSION_SECRET` con el valor generado
   - **Asegúrate de que `DATABASE_URL` también esté configurada** (necesaria para el store de sesiones)
   - Guardar

4. **Redeploy:**
   - Vercel detectará el cambio automáticamente
   - O puedes hacer un nuevo push a GitHub para forzar redeploy
   - La tabla `session` se creará automáticamente en PostgreSQL

5. **Probar:**
   - Ir a la URL de tu app en Vercel
   - Intentar hacer login
   - Debería funcionar correctamente sin redirecciones 302

## Verificar que Funciona

1. Hacer login con la contraseña correcta
2. Debería redirigir a `/funcionalidades`
3. Si vuelve a `/login`, revisar los logs en Vercel:
   - Ve a Vercel Dashboard > Tu proyecto > Deployments > [último deploy] > Functions
   - Revisar los logs para ver mensajes de error

## Debug Avanzado

Si el problema persiste después de configurar `SESSION_SECRET`:

1. **Habilitar debug temporal:**
   - Agregar `DEBUG_SESSIONS=true` en Vercel
   - Hacer redeploy
   - Intentar login
   - Revisar logs en Vercel Dashboard

2. **Revisar logs:**
   Los logs mostrarán:
   - ✅ Si la sesión se crea correctamente
   - ❌ Si hay errores al guardar la sesión
   - 🔐 Si el middleware detecta la autenticación

3. **Deshabilitar debug:**
   - Una vez solucionado, cambiar `DEBUG_SESSIONS=false` o eliminarlo

## Notas Técnicas

- **PostgreSQL Store**: Las sesiones se almacenan en la tabla `session` de PostgreSQL
- **Auto-creación**: La tabla se crea automáticamente con `createTableIfMissing: true`
- **Pool de conexiones**: Usa el mismo pool de conexiones que el resto de la app
- **Cookies**: Deben tener `secure: true` porque Vercel usa HTTPS
- **sameSite**: `'lax'` es compatible con navegadores modernos y Vercel
- **Cookie name**: `catalogo.sid` para evitar conflictos
- **Limpieza**: Las sesiones expiradas se limpian automáticamente por `connect-pg-simple`

## Problema: "authenticated undefined" después de login exitoso

Si ves en los logs:
- ✅ Login exitoso (200)
- ❌ "authenticated undefined" en el siguiente request

**Causa:** La sesión se guarda pero no se está recuperando correctamente del store de PostgreSQL en el siguiente request.

**Soluciones:**

1. **Verificar que la tabla `session` existe en PostgreSQL:**
   - Ve a tu base de datos en Neon
   - Verifica que existe la tabla `session`
   - Si no existe, el store la creará automáticamente en el primer uso

2. **Verificar que `DATABASE_URL` está correctamente configurada:**
   - En Vercel, verifica que `DATABASE_URL` apunta a tu base de datos
   - Debe tener el formato: `postgresql://user:password@host/database?sslmode=require`

3. **Habilitar debug temporal:**
   - Agregar `DEBUG_SESSIONS=true` en Vercel
   - Hacer redeploy
   - Revisar logs para ver:
     - Si la sesión se guarda correctamente
     - Si la cookie se envía en el siguiente request
     - Si hay errores en el store

4. **Verificar logs de Vercel:**
   - Buscar errores relacionados con PostgreSQL
   - Verificar que no hay problemas de conexión a la base de datos
   - Revisar si hay errores en el store de sesiones

## Si Aún No Funciona

1. Verificar que `SESSION_SECRET` esté configurado correctamente
2. Verificar que `DATABASE_URL` esté configurada y sea accesible
3. Verificar que la tabla `session` existe en PostgreSQL
4. Verificar que las cookies no estén bloqueadas en el navegador
5. Probar en modo incógnito
6. Revisar la consola del navegador (F12) para errores de cookies
7. Revisar logs de Vercel para errores específicos del store
8. Verificar que `connect-pg-simple` esté instalado correctamente

