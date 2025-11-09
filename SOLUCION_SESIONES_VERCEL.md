# 🔐 Solución: Problema de Sesiones en Vercel

## Problema

Al hacer deploy en Vercel, el login no funciona correctamente:
- La pantalla de login se muestra
- Al ingresar la contraseña correcta, vuelve a cargar la pantalla de login
- No permite acceder al catálogo
- **En localhost funciona correctamente**

## Causa

En Vercel (entorno serverless), las sesiones requieren configuración especial de cookies para funcionar correctamente con HTTPS.

## Solución Implementada

Se actualizó la configuración de sesiones en `src/app.js` para:
1. Detectar correctamente el entorno de Vercel
2. Configurar cookies con `secure: true` para HTTPS
3. Usar `sameSite: 'lax'` para compatibilidad
4. Guardar la sesión explícitamente antes de redirigir

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

1. **Generar SESSION_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Agregar en Vercel:**
   - Ve a tu proyecto en Vercel
   - Settings > Environment Variables
   - Agregar `SESSION_SECRET` con el valor generado
   - Guardar

3. **Redeploy:**
   - Vercel detectará el cambio automáticamente
   - O puedes hacer un nuevo push a GitHub para forzar redeploy

4. **Probar:**
   - Ir a la URL de tu app en Vercel
   - Intentar hacer login
   - Debería funcionar correctamente

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

- Las sesiones en Vercel funcionan en memoria dentro de la misma invocación
- Las cookies deben tener `secure: true` porque Vercel usa HTTPS
- `sameSite: 'lax'` es compatible con navegadores modernos y Vercel
- El nombre de la cookie es `catalogo.sid` para evitar conflictos

## Si Aún No Funciona

1. Verificar que `SESSION_SECRET` esté configurado correctamente
2. Verificar que las cookies no estén bloqueadas en el navegador
3. Probar en modo incógnito
4. Revisar la consola del navegador (F12) para errores de cookies
5. Revisar logs de Vercel para errores específicos

