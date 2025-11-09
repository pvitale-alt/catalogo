# 📊 Catálogo de Funcionalidades

Sistema de gestión de funcionalidades con scoring automático, mapa de clientes e integración directa con Redmine.

## 🚀 Características

- ✅ **Gestión de Funcionalidades**: Catálogo completo con vistas de lista y tarjetas
- ✅ **Sistema de Scoring**: Cálculo automático basado en 8 criterios personalizables
- ✅ **Mapa de Clientes**: Visualización de qué clientes usan cada funcionalidad
- ✅ **Integración Redmine**: Sincronización automática de issues desde Redmine
- ✅ **Búsqueda y Filtros**: Búsqueda en tiempo real y filtros por sección/sponsor
- ✅ **UI Moderna**: Diseño Google Drive-like con Tailwind CSS
- ✅ **Responsive**: Adaptado para desktop y mobile

## 🛠️ Tecnologías

- **Backend**: Node.js + Express.js
- **Base de Datos**: PostgreSQL (Neon)
- **Templates**: EJS
- **Estilos**: CSS personalizado (Google Drive-like)
- **Hosting**: Vercel (Serverless)
- **Integración**: Redmine API

## 📋 Requisitos Previos

- Node.js >= 18.x
- Cuenta en [Neon](https://neon.tech/) (PostgreSQL)
- API Key de Redmine con permisos de lectura
- Cuenta en [Vercel](https://vercel.com/) (para deploy)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/producto-mercap/Catalogo.git
cd Catalogo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
```

Variables necesarias en `.env`:

```env
# Base de datos (Neon)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Servidor
PORT=3000
NODE_ENV=development

# Redmine API
REDMINE_URL=https://redmine.mercap.net
REDMINE_TOKEN=tu_api_key_aqui
```

**🔑 Obtener API Key de Redmine:**
1. Ir a Redmine > Mi cuenta
2. Buscar "Clave de acceso a la API"
3. Copiar la clave y agregarla en `.env`

### 4. Configurar base de datos

#### Crear base de datos en Neon

1. Ir a https://console.neon.tech/
2. Crear un nuevo proyecto
3. Copiar la `DATABASE_URL`
4. Agregarla en `.env`

#### Ejecutar scripts SQL

En el SQL Editor de Neon, ejecutar en orden:

1. **Estructura base**:
```bash
# Pegar contenido de: database.sql
```

2. **Migración Redmine**:
```bash
# Pegar contenido de: database-migration-redmine.sql
```

### 5. Probar conexión con Redmine

```bash
npm run test:redmine
```

Deberías ver:

```
✅ Conexión exitosa con Redmine
✅ 3 issues obtenidos
🎉 TEST COMPLETADO EXITOSAMENTE
```

### 6. Iniciar el servidor

```bash
npm run dev
```

El servidor iniciará en http://localhost:3000

**La sincronización con Redmine se ejecutará automáticamente al iniciar** (solo en desarrollo).

## 🔄 Sincronización con Redmine

### Automática (al iniciar servidor)

En **desarrollo**, la sincronización ocurre automáticamente al levantar el servidor:

```bash
npm run dev
# 🚀 Iniciando sincronización automática con Redmine...
# ✅ Issues obtenidos: 150
# ✅ Sincronización inicial completada
```

En **producción**, la sincronización automática está deshabilitada para evitar sobrecarga en Vercel.

### Manual (por demanda)

#### Desde la terminal:

```bash
# Sincronizar proyecto 'ut-bancor'
curl -X POST http://localhost:3000/api/redmine/sincronizar \
  -H "Content-Type: application/json" \
  -d '{"project_id": "ut-bancor"}'
```

#### Desde la aplicación:

Se puede crear un botón en la UI que llame al endpoint `/api/redmine/sincronizar`.

### API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/redmine/test` | GET | Probar conexión con Redmine |
| `/api/redmine/issues` | GET | Ver issues sin guardar en BD |
| `/api/redmine/sincronizar` | POST | Sincronizar issues con BD |
| `/api/redmine/estado` | GET | Estado de la sincronización |

### Ejemplos de uso:

```bash
# Ver issues de un proyecto
curl "http://localhost:3000/api/redmine/issues?project_id=ut-bancor&limit=10"

# Sincronizar solo Epics (tracker_id=10)
curl -X POST http://localhost:3000/api/redmine/sincronizar \
  -H "Content-Type: application/json" \
  -d '{"project_id": "ut-bancor", "tracker_id": "10"}'

# Ver estado actual
curl http://localhost:3000/api/redmine/estado
```

## 📁 Estructura del Proyecto

```
Catalogo/
├── src/
│   ├── app.js                    # Entrada principal + sincronización
│   ├── config/
│   │   └── database.js           # Pool de conexiones PostgreSQL
│   ├── controllers/
│   │   ├── funcionalidadesController.js
│   │   ├── scoreController.js
│   │   └── mapaController.js
│   ├── routes/
│   │   ├── funcionalidadesRoutes.js
│   │   ├── scoreRoutes.js
│   │   ├── mapaRoutes.js
│   │   └── redmineRoutes.js      # 🆕 Endpoints Redmine
│   ├── services/
│   │   ├── redmineDirectService.js    # 🆕 Cliente Redmine API
│   │   └── sincronizacionService.js   # 🆕 Lógica sincronización
│   ├── public/
│   │   ├── css/
│   │   │   └── main.css
│   │   ├── js/
│   │   │   └── main.js
│   │   └── images/
│   └── views/
│       ├── layouts/
│       ├── partials/
│       └── pages/
├── database.sql                   # Estructura base de datos
├── database-migration-redmine.sql # 🆕 Migración Redmine
├── test-redmine.js                # 🆕 Script de prueba
├── .env.example                   # Variables de entorno ejemplo
├── .gitignore
├── package.json
├── vercel.json
├── README.md
└── CONFIGURACION_REDMINE.md       # 🆕 Guía detallada Redmine
```

## 🎨 UI y Estilos

El proyecto utiliza un diseño inspirado en Google Drive con:

- Colores corporativos (`#0D5AA2`)
- Botones redondeados estilo píldora
- Sidebar colapsable
- Búsqueda con sugerencias en tiempo real
- Filtros por múltiples criterios
- Vista de lista y tarjetas
- Tabla con ordenamiento por columnas
- Ocultación de montos con toggle

## 🚢 Deploy en Vercel

### 1. Conectar repositorio

```bash
# Hacer push a GitHub
git add .
git commit -m "feat: integración con Redmine"
git push origin main
```

### 2. Importar proyecto en Vercel

1. Ir a https://vercel.com/new
2. Importar repositorio de GitHub
3. Framework: **Other**
4. Build Command: `npm run build` (opcional)
5. Output Directory: (dejar vacío)

### 3. Configurar variables de entorno

En Vercel > Settings > Environment Variables:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | URL de Neon |
| `REDMINE_URL` | `https://redmine.mercap.net` |
| `REDMINE_TOKEN` | Tu API Key |
| `NODE_ENV` | `production` |

### 4. Deploy

Vercel desplegará automáticamente en cada push a `main`.

### 5. Sincronizar en producción

La sincronización automática está **deshabilitada** en producción.

Para sincronizar:

```bash
curl -X POST https://tu-proyecto.vercel.app/api/redmine/sincronizar \
  -H "Content-Type: application/json" \
  -d '{"project_id": "ut-bancor"}'
```

## 🔐 Seguridad

### Implementado:

- ✅ **Solo lectura**: El servicio solo consulta, nunca modifica Redmine
- ✅ **Tokens seguros**: API Key almacenada en variables de entorno
- ✅ **Sin logs sensibles**: No se exponen tokens en logs
- ✅ **.gitignore**: `.env` nunca se sube a Git

### Recomendaciones:

1. **Rotar API Key** periódicamente en Redmine
2. **Marcar** `REDMINE_TOKEN` como sensible en Vercel
3. **No compartir** tu API Key públicamente
4. **Limitar permisos** de la cuenta de Redmine solo a lectura

## 📝 Datos Mapeados desde Redmine

| Campo Redmine | Campo Catálogo | Notas |
|---------------|----------------|-------|
| `issue.id` | `redmine_id` | ID único del issue |
| `issue.subject` | `titulo` | Título del issue |
| `issue.description` | `descripcion` | Descripción completa |
| `issue.project.name` | `sponsor` | Nombre del proyecto |
| `issue.tracker.name` | `seccion` | Tipo de issue (Epic, Feature, etc.) |
| `issue.status.name` | `estado_redmine` | Estado actual |
| `custom_field: Fecha planificada de inicio` | `fecha` | Fecha de inicio |
| `custom_field: Cuenta` | `sponsor` | Cliente sponsor |

Los campos `monto` y `score` **no vienen de Redmine** y se gestionan manualmente en el catálogo.

## 🐛 Troubleshooting

### Error: "REDMINE_TOKEN no está configurado"

Verifica que `.env` existe y tiene `REDMINE_TOKEN=...`

### Error: "Cannot connect to database"

1. Verifica `DATABASE_URL` en `.env`
2. Asegúrate que la base de datos existe en Neon
3. Ejecuta los scripts SQL: `database.sql` y `database-migration-redmine.sql`

### Error: "Error HTTP 401: Unauthorized"

Tu API Key es inválida. Resetéala en Redmine > Mi cuenta.

### La sincronización no se ejecuta

En producción, la sincronización automática está deshabilitada. Usa:

```bash
POST /api/redmine/sincronizar
```

## 📚 Documentación Adicional

- [CONFIGURACION_REDMINE.md](./CONFIGURACION_REDMINE.md) - Guía detallada de integración con Redmine
- [Documentación API Redmine](https://www.redmine.org/projects/redmine/wiki/Rest_api)
- [Documentación Neon](https://neon.tech/docs)
- [Documentación Vercel](https://vercel.com/docs)

## 🤝 Contribuir

Este proyecto está en desarrollo activo. Para contribuir:

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m "feat: agregar nueva funcionalidad"`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📄 Licencia

MIT

## 👥 Autor

**Producto Mercap**  
producto@mercapsoftware.com

---

**¿Necesitas ayuda?** Consulta [CONFIGURACION_REDMINE.md](./CONFIGURACION_REDMINE.md) para más detalles sobre la integración con Redmine.

