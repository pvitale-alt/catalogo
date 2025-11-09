# 🔗 Reconectar Vercel con GitHub

## 🐛 El Problema

Vercel está mostrando el código del **primer commit** en la solapa "Source", no los commits nuevos.

**Causas posibles:**
1. ✅ Repositorio privado sin permisos actualizados
2. ✅ Vercel "locked" a un commit específico  
3. ✅ Integración de GitHub desactualizada

---

## ✅ Solución: Reconectar GitHub con Vercel

### **Opción 1: Verificar y Actualizar Conexión (MÁS COMÚN)**

#### **Paso 1: Ve a Vercel Dashboard**
```
https://vercel.com/dashboard
```

#### **Paso 2: Ve a Settings del Proyecto**
1. Selecciona tu proyecto "catalogo"
2. Click en **"Settings"** (arriba)
3. Ve a la sección **"Git"** en el menú lateral izquierdo

#### **Paso 3: Verificar Repositorio Conectado**

Deberías ver:
```
Connected Git Repository
Repository: producto-mercap/catalogo
Branch: main
```

#### **Paso 4: Desconectar y Reconectar**

1. **Scroll hasta el final** de la página Git
2. Busca el botón **"Disconnect"** (puede estar en rojo)
3. Click en **"Disconnect"**
4. Confirma la desconexión

#### **Paso 5: Reconectar el Repositorio**

1. Click en **"Connect Git Repository"**
2. Selecciona **"GitHub"**
3. Si te pide permisos, **autoriza a Vercel**
4. Busca tu repositorio: `producto-mercap/catalogo`
5. Selecciónalo y click **"Connect"**
6. Asegúrate de seleccionar la rama **"main"**

#### **Paso 6: Configurar Production Branch**

1. En Settings → Git
2. Busca **"Production Branch"**
3. Asegúrate de que sea **"main"**

#### **Paso 7: Deploy Manual**

1. Ve a **"Deployments"**
2. Click en **"Create Deployment"**
3. Selecciona **Branch: main**
4. Click en **"Deploy"**

---

### **Opción 2: Reinstalar Integración de GitHub (SI LA OPCIÓN 1 NO FUNCIONA)**

#### **Paso 1: Ve a Configuración de GitHub App**
```
https://vercel.com/dashboard/integrations
```

#### **Paso 2: Buscar "GitHub" en las Integraciones**

1. Click en **"GitHub"** (debe estar instalada)
2. Click en **"Configure"**

#### **Paso 3: Configurar Acceso al Repositorio**

1. Se abrirá GitHub con la página de Vercel App
2. Scroll hasta **"Repository access"**
3. Verifica que tu repositorio `producto-mercap/catalogo` esté en la lista
4. Si no está:
   - Selecciona **"Select repositories"**
   - Busca y marca `producto-mercap/catalogo`
   - Click **"Save"**

#### **Paso 4: Volver a Vercel y Forzar Sync**

1. Vuelve a Vercel Dashboard
2. Ve a tu proyecto → Settings → Git
3. Busca **"Redeploy"** o **"Refresh"**
4. Click para sincronizar

---

### **Opción 3: Crear Nuevo Proyecto (SI NADA MÁS FUNCIONA)**

Si las opciones anteriores no funcionan, es más rápido crear un nuevo proyecto:

#### **Paso 1: Importar Repositorio Nuevo**

1. Ve a Vercel Dashboard
2. Click en **"Add New..."** → **"Project"**
3. Busca tu repositorio: `producto-mercap/catalogo`
4. Si no aparece, click en **"Adjust GitHub App Permissions"**

#### **Paso 2: Configurar el Proyecto**

```
Framework Preset: Other
Build Command: (dejar vacío o "npm run build")
Output Directory: (dejar vacío)
Install Command: npm install
Root Directory: ./
```

#### **Paso 3: Configurar Variables de Entorno**

Agrega estas variables antes de deploy:

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
NODE_ENV=production
```

**IMPORTANTE:** Copia el valor exacto de `DATABASE_URL` desde Neon.

#### **Paso 4: Deploy**

Click en **"Deploy"** y espera 1-2 minutos.

#### **Paso 5: (Opcional) Eliminar Proyecto Antiguo**

Si el nuevo proyecto funciona, puedes eliminar el antiguo:
1. Ve al proyecto antiguo → Settings → General
2. Scroll hasta el final
3. Click en **"Delete Project"**

---

## 🔍 Verificar Permisos de GitHub

### **Paso 1: Ve a GitHub Settings**
```
https://github.com/settings/installations
```

### **Paso 2: Busca "Vercel" en la Lista**

Click en **"Configure"** al lado de Vercel

### **Paso 3: Verificar Repository Access**

Deberías ver algo como:
```
✅ All repositories
o Only select repositories
  ☑ producto-mercap/catalogo
```

Si `catalogo` **NO** está marcado:
1. Marca el checkbox
2. Click **"Save"**

---

## 📋 Comandos para Verificar en Local

Verifica que todo está correcto en tu repositorio local:

```powershell
cd "C:\Users\pablo\Documentos\ProyectosCursor\Catalogo"

# Ver commits locales
git log --oneline -5

# Ver rama actual
git branch

# Ver commits en GitHub (remoto)
git ls-remote --heads origin

# Verificar que todo está pusheado
git status
```

**Todos los commits deben estar en GitHub.**

---

## 🎯 Resultado Esperado

Después de reconectar:

✅ Vercel muestra el commit más reciente (`e6c0a65`)  
✅ Source apunta al último commit en GitHub  
✅ Deploy usa el código actualizado  
✅ No más error `.toFixed is not a function`  

---

## ⚠️ Problemas Comunes

### **Problema 1: "Repository not found"**
**Causa:** Vercel no tiene acceso al repositorio privado

**Solución:**
1. Ve a GitHub → Settings → Integrations
2. Busca Vercel
3. Dale acceso al repositorio

### **Problema 2: "No commits found"**
**Causa:** La rama configurada en Vercel no es "main"

**Solución:**
1. Vercel Settings → Git
2. Cambia Production Branch a "main"
3. Redeploy

### **Problema 3: "Git connection lost"**
**Causa:** Token de GitHub expiró

**Solución:**
1. Desconecta GitHub de Vercel
2. Vuelve a conectar
3. Reautoriza los permisos

---

## 💡 Tip: Usar Vercel CLI

Si tienes la CLI de Vercel instalada:

```powershell
# Instalar Vercel CLI (si no la tienes)
npm install -g vercel

# Login
vercel login

# Ir al proyecto
cd "C:\Users\pablo\Documentos\ProyectosCursor\Catalogo"

# Link al proyecto existente
vercel link

# Deploy directo (bypasea GitHub)
vercel --prod
```

Esto hace deploy directo desde tu máquina, sin necesidad de GitHub.

---

## 🔄 Resumen de Pasos Recomendados

```
1. Vercel Dashboard → Tu Proyecto → Settings → Git
2. Disconnect Git Repository
3. Connect Git Repository → GitHub → producto-mercap/catalogo
4. Production Branch = "main"
5. Deployments → Create Deployment → Branch: main → Deploy
6. Esperar 1-2 minutos
7. Verificar en tu URL de Vercel
```

---

**Empieza con la Opción 1 (Desconectar y Reconectar). Es la solución más común y rápida.** ✅




