# 🚀 Guía de Deployment en Vercel

## ✅ Correcciones Implementadas

Todos los errores `.toFixed is not a function` han sido corregidos en:

- ✅ `src/views/pages/funcionalidades.ejs` (2 instancias)
- ✅ `src/views/pages/score.ejs` (1 instancia)
- ✅ `src/views/pages/funcionalidad-detalle.ejs` (5 instancias)
- ✅ `src/views/pages/mapa.ejs` (ya corregido previamente)
- ✅ `src/views/pages/score-calculadora.ejs` (ya corregido previamente)

**Solución aplicada:**
```javascript
// ANTES (causaba error si score es null/undefined)
const score = parseFloat(func.score_total || 0);

// DESPUÉS (siempre devuelve número válido)
let score = func.score_total || 0;
score = parseFloat(score) || 0;
```

---

## 📋 Pasos para Deploy en Vercel

### **Paso 1: Subir cambios a GitHub**

```powershell
cd "C:\Users\pablo\Documentos\ProyectosCursor\Catalogo"

git add .
git commit -m "fix: corregir error .toFixed en todas las vistas"
git push origin main
```

### **Paso 2: Variables de Entorno en Vercel**

Vercel debe tener **SOLO** estas variables de entorno:

#### **Variables REQUERIDAS:**
```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
NODE_ENV=production
```

#### **⚠️ IMPORTANTE: Eliminar variables duplicadas**

Si Vercel creó múltiples variables al conectar con Neon (ej: `POSTGRES_URL`, `POSTGRES_HOST`, etc.), puedes:

**Opción A: Mantener todas (recomendado)**
- Deja todas las variables que creó Vercel automáticamente
- Son variables estándar de Neon y no causan problemas
- Solo asegúrate de que `DATABASE_URL` tenga el valor correcto

**Opción B: Usar solo DATABASE_URL**
- Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
- Mantén solo `DATABASE_URL` con tu connection string de Neon
- Elimina las demás si prefieres simplicidad

### **Paso 3: Verificar `vercel.json`**

Tu archivo `vercel.json` debe verse así:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/app.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

✅ **Ya está correcto en tu proyecto**

### **Paso 4: Verificar `package.json`**

Asegúrate de tener estos scripts:

```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "engines": {
    "node": ">=16.x"
  }
}
```

### **Paso 5: Deploy**

Haz commit de los cambios y push a GitHub. Vercel detectará automáticamente los cambios y hará el deploy.

```powershell
git add .
git commit -m "fix: manejar scores nulos en todas las vistas"
git push origin main
```

Vercel mostrará el progreso del build. Espera a que termine (1-2 minutos).

---

## 🐛 Solución de Problemas

### **Error: "score.toFixed is not a function"**
✅ **YA CORREGIDO** - Todos los archivos han sido actualizados

### **Error: "Cannot connect to database"**

**Causa:** `DATABASE_URL` incorrecta o no configurada

**Solución:**
1. Ve a Neon Dashboard
2. Copia tu Connection String (debe verse así):
   ```
   postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. En Vercel: Settings → Environment Variables
4. Edita `DATABASE_URL` y pega tu connection string
5. Importante: Aplica a **Production**, **Preview** y **Development**
6. Redeploy desde Vercel Dashboard

### **Error 500 después de deploy**

**Verificar logs:**
1. Ve a Vercel Dashboard → Tu Proyecto → Deployments
2. Click en el deployment más reciente
3. Click en "Functions" o "Runtime Logs"
4. Busca el error específico

**Errores comunes:**

#### **Error: "Cannot find module"**
```bash
Error: Cannot find module 'dotenv'
```
**Solución:** Asegúrate de que todas las dependencias estén en `dependencies` (no en `devDependencies`)

```json
{
  "dependencies": {
    "dotenv": "^16.4.5",
    "ejs": "^3.1.10",
    "express": "^4.19.2",
    "pg": "^8.12.0"
  }
}
```

#### **Error: "Address already in use"**
Vercel maneja el puerto automáticamente. Asegúrate de que tu `src/app.js` tenga:

```javascript
const PORT = process.env.PORT || 3000;

// Solo escuchar en desarrollo
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });
}

module.exports = app;
```

---

## 📊 Verificación Post-Deploy

Después del deploy exitoso:

### **1. Probar la página principal**
```
https://tu-proyecto.vercel.app/
```
Debería redirigir a `/funcionalidades`

### **2. Probar funcionalidades**
```
https://tu-proyecto.vercel.app/funcionalidades
```
- ✅ Debe mostrar el listado
- ✅ Scores deben mostrarse correctamente
- ✅ No debe haber errores en la consola

### **3. Probar otras páginas**
- `/score` - Ranking de funcionalidades
- `/score/calculadora/:id` - Calculadora de score
- `/mapa` - Mapa de clientes
- `/funcionalidades/:id` - Detalle de funcionalidad

### **4. Verificar conexión a base de datos**

Si ves datos en las funcionalidades, la conexión está OK. Si no:

```javascript
// Añade esto temporalmente en src/app.js para debug
app.get('/test-db', async (req, res) => {
    try {
        const pool = require('./config/database');
        const result = await pool.query('SELECT NOW()');
        res.json({ success: true, time: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
```

Luego visita: `https://tu-proyecto.vercel.app/test-db`

---

## 🔄 Comandos Útiles

### **Ver logs en tiempo real:**
```powershell
vercel logs --follow
```

### **Deploy manual desde CLI:**
```powershell
vercel --prod
```

### **Ver información del proyecto:**
```powershell
vercel inspect
```

---

## 📝 Checklist Final

Antes de hacer deploy, verifica:

- [ ] Todos los cambios están commiteados
- [ ] Push a GitHub realizado
- [ ] `DATABASE_URL` configurada en Vercel
- [ ] Variables de entorno aplicadas a Production
- [ ] `vercel.json` está en la raíz del proyecto
- [ ] `package.json` tiene `"start": "node src/app.js"`
- [ ] Código funciona localmente (`npm run dev`)

---

## 🎯 Resultado Esperado

Después de seguir estos pasos:

✅ Deploy exitoso sin errores  
✅ Aplicación funciona en Vercel  
✅ No más errores `.toFixed is not a function`  
✅ Conexión a Neon funcional  
✅ Todas las páginas cargan correctamente  

---

## 💡 Consejos Adicionales

### **Variables de Entorno de Neon**

Cuando conectas Neon con Vercel automáticamente, puede crear estas variables:

```
POSTGRES_URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
DATABASE_URL
```

**No hay problema en tenerlas todas**. Tu aplicación usa `DATABASE_URL`, las demás son para referencia.

### **Optimización de Build**

Si el build tarda mucho, puedes optimizar:

```json
{
  "devDependencies": {
    "nodemon": "^3.1.0",
    "tailwindcss": "^3.4.3",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38"
  }
}
```

Asegúrate de que herramientas de desarrollo estén en `devDependencies`.

### **Cache de Vercel**

Si los cambios no se ven después del deploy:
1. Ve a Settings → General
2. Scroll hasta "Build & Development Settings"
3. Desactiva "Automatically expose System Environment Variables"
4. Redeploy

---

## 🆘 ¿Necesitas Ayuda?

Si después de todo esto sigue sin funcionar:

1. **Copia los logs de error** desde Vercel Dashboard
2. **Verifica las variables de entorno** están correctas
3. **Prueba el endpoint de test** (`/test-db`)
4. **Revisa que el código funcione localmente** primero

---

**¡Tu aplicación ahora debería funcionar perfectamente en Vercel! 🎉**




