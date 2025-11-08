# 🔧 Configurar Git para Commits de Organización

## ✅ Configuración Aplicada

Se configuró Git para este repositorio con:

```
user.name = producto-mercap
user.email = noreply@producto-mercap.com
```

**Esto significa que:**
- ✅ Todos los commits **futuros** se harán con esta identidad
- ✅ Aparecerán en GitHub como "producto-mercap"
- ✅ Vercel podrá leerlos correctamente

---

## 📝 Cambiar el Email (Si Tienes Uno Específico)

Si tu organización tiene un email específico (ej: `pablo@producto-mercap.com`), puedes cambiarlo:

```powershell
cd "C:\Users\pablo\Documentos\ProyectosCursor\Catalogo"

# Cambiar el email
git config user.email "pablo@producto-mercap.com"

# Verificar
git config user.email
```

**O si prefieres usar tu email personal pero con el nombre de la org:**

```powershell
git config user.name "producto-mercap"
git config user.email "pablovitale96@gmail.com"
```

---

## 🔄 Modificar Commits Anteriores (OPCIONAL)

Si quieres que los commits **anteriores** también aparezcan con la identidad de la organización:

### **Opción 1: Modificar Solo el Último Commit**

```powershell
cd "C:\Users\pablo\Documentos\ProyectosCursor\Catalogo"

# Modificar el último commit
git commit --amend --author="producto-mercap <noreply@producto-mercap.com>" --no-edit

# Forzar push (CUIDADO: solo si nadie más está trabajando)
git push origin main --force
```

### **Opción 2: Modificar Todos los Commits (Rebase Interactivo)**

```powershell
# Ver cuántos commits hay
git log --oneline

# Modificar los últimos 5 commits (ajusta el número)
git rebase -i HEAD~5

# En el editor que se abre, cambia "pick" por "edit" en los commits que quieras modificar
# Guarda y cierra

# Para cada commit, ejecuta:
git commit --amend --author="producto-mercap <noreply@producto-mercap.com>" --no-edit
git rebase --continue

# Al final, fuerza el push
git push origin main --force
```

**⚠️ ADVERTENCIA:** Solo haz `--force` si:
- ✅ Eres el único trabajando en el repositorio
- ✅ O todos los colaboradores están de acuerdo
- ✅ O es un proyecto nuevo sin otros desarrolladores

---

## ✅ Verificar que Funciona

### **1. Hacer un Commit de Prueba**

```powershell
cd "C:\Users\pablo\Documentos\ProyectosCursor\Catalogo"

# Crear un archivo de prueba
echo "# Test commit" > test-commit.txt

# Agregar y commit
git add test-commit.txt
git commit -m "test: verificar identidad de commits"

# Ver el commit
git log -1 --pretty=format:"%an <%ae> - %s"
```

**Debe mostrar:**
```
producto-mercap <noreply@producto-mercap.com> - test: verificar identidad de commits
```

### **2. Push y Verificar en GitHub**

```powershell
git push origin main
```

Luego ve a GitHub:
```
https://github.com/producto-mercap/catalogo/commits/main
```

El commit debe aparecer con el autor **"producto-mercap"** ✅

### **3. Eliminar el Archivo de Prueba**

```powershell
git rm test-commit.txt
git commit -m "chore: eliminar archivo de prueba"
git push origin main
```

---

## 🎯 Configuración Global vs Local

### **Configuración Actual (Solo este Repositorio)**

```powershell
# Ver configuración local (solo este repo)
git config --local --list
```

**Ventaja:** Solo afecta este repositorio, otros proyectos siguen con tu identidad personal.

### **Si Quieres Cambiar Globalmente (Todos los Repositorios)**

```powershell
# Configuración global
git config --global user.name "producto-mercap"
git config --global user.email "noreply@producto-mercap.com"
```

**⚠️ No recomendado** si trabajas en proyectos personales también.

---

## 📋 Resumen de Comandos

```powershell
# Ver configuración actual
git config --local --list | Select-String "user"

# Cambiar nombre
git config user.name "producto-mercap"

# Cambiar email
git config user.email "tu-email@producto-mercap.com"

# Verificar
git config user.name
git config user.email

# Hacer commit de prueba
echo "test" > test.txt
git add test.txt
git commit -m "test: verificar autor"
git log -1 --pretty=format:"%an <%ae>"

# Eliminar prueba
git rm test.txt
git commit -m "chore: eliminar test"
```

---

## 🔍 Verificar Commits en GitHub

Después de hacer push, ve a:

```
https://github.com/producto-mercap/catalogo/commits/main
```

**Los commits nuevos deben mostrar:**
- 👤 Autor: **producto-mercap**
- 📧 Email: **noreply@producto-mercap.com** (o el que configuraste)

---

## ✅ Estado Actual

```
✅ Git configurado para este repositorio
✅ Nombre: producto-mercap
✅ Email: noreply@producto-mercap.com
✅ Próximos commits usarán esta identidad
```

**Siguiente paso:** Haz un commit de prueba para verificar que funciona, luego Vercel debería poder leer los commits correctamente.

---

## 💡 Tip: Ver Autor de Commits

```powershell
# Ver últimos 5 commits con autor
git log -5 --pretty=format:"%h - %an <%ae> - %s"

# Ver solo commits de producto-mercap
git log --author="producto-mercap" --oneline
```

---

**¡Listo! Los próximos commits se harán con la identidad de producto-mercap. 🎉**

