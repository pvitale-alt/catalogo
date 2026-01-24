# Catálogo de Funcionalidades

> Sistema de gestión de funcionalidades, scoring y mapa de clientes integrado con Redmine

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Variables de Entorno](#variables-de-entorno)
4. [Módulos Funcionales](#módulos-funcionales)
   - [Catálogo de Funcionalidades](#catálogo-de-funcionalidades-1)
   - [Proyectos Internos](#proyectos-internos)
   - [Requerimientos de Clientes](#requerimientos-de-clientes)
   - [Ideas y Mejoras](#ideas-y-mejoras)
   - [Sistema de Scoring](#sistema-de-scoring)
   - [Mapa de Clientes](#mapa-de-clientes)
5. [API Reference](#api-reference)
6. [Sincronización con Redmine](#sincronización-con-redmine)
7. [Autenticación y Roles](#autenticación-y-roles)
8. [Base de Datos](#base-de-datos)
9. [Consideraciones Técnicas](#consideraciones-técnicas)

---

## Introducción

El **Catálogo de Funcionalidades** es una aplicación web diseñada para gestionar y priorizar funcionalidades de software mediante un sistema de scoring ponderado. La aplicación se integra con Redmine para sincronizar proyectos, issues y mantener la trazabilidad con el sistema de gestión de proyectos.

### Funcionalidades Principales

- **Gestión de Funcionalidades**: Catálogo de funcionalidades sincronizadas desde Redmine
- **Sistema de Scoring**: Priorización mediante criterios ponderados
- **Mapa de Clientes**: Matriz de clientes vs funcionalidades con estados comerciales
- **Proyectos Internos**: Gestión de proyectos de desarrollo interno
- **Requerimientos de Clientes**: Seguimiento de solicitudes de clientes
- **Ideas y Mejoras**: Registro de propuestas de mejora

---

## Arquitectura del Sistema

### Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Backend | Node.js + Express |
| Frontend | EJS (templates) |
| Base de Datos | PostgreSQL (Neon) |
| Autenticación | JWT (JSON Web Tokens) |
| Hosting | Vercel (Serverless) |
| Integración | API REST de Redmine |

### Estructura del Proyecto

```
catalogo/
├── src/
│   ├── app.js                 # Entrada principal
│   ├── config/
│   │   └── database.js        # Configuración PostgreSQL
│   ├── controllers/           # Lógica de negocio
│   ├── middleware/
│   │   └── authJWT.js         # Autenticación JWT
│   ├── models/                # Modelos de datos
│   ├── routes/                # Definición de rutas
│   ├── services/              # Servicios (Redmine, sincronización)
│   ├── public/                # Archivos estáticos
│   └── views/                 # Templates EJS
├── package.json
└── vercel.json
```

---

## Variables de Entorno

### ⚙️ Configuración Requerida

Crear un archivo `.env` con las siguientes variables:

```env
# Base de Datos
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Servidor
PORT=3000
NODE_ENV=development

# Autenticación
LOGIN_PASSWORD=tu_contraseña_usuario
LOGIN_PASSWORD_ADMIN=tu_contraseña_admin
JWT_SECRET=tu_clave_secreta_jwt
SESSION_SECRET=tu_clave_secreta_sesion

# Redmine
REDMINE_URL=https://tu-redmine.com
REDMINE_TOKEN=tu_api_key_de_redmine

# Configuración de Sincronización
REDMINE_DEFAULT_PROJECT=ut-bancor
REDMINE_DEFAULT_TRACKER=19
REDMINE_INTERNAL_PROJECT=ut-mercap
REDMINE_INTERNAL_TRACKER=19
REDMINE_INTERNAL_CF23=*
REDMINE_SYNC_LIMIT=100
REDMINE_LIMIT_PER_REQUEST=100

# Filtros de Proyectos (Catálogo)
REDMINE_PROJECT_PRODUCT_FILTER=Unitrade
REDMINE_PROJECT_CATALOG_FILTER=1

# Custom Fields de Redmine
REDMINE_CUSTOM_FIELD_CLIENTE_ID=20
REDMINE_CUSTOM_FIELD_SPONSOR_ID=94
REDMINE_CUSTOM_FIELD_REVENTA_ID=93

# Debug (opcional)
DEBUG_SESSIONS=false
```

### 📝 Descripción de Variables

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | URL de conexión a PostgreSQL (Neon) | ✅ |
| `LOGIN_PASSWORD` | Contraseña para usuarios normales | ✅ |
| `LOGIN_PASSWORD_ADMIN` | Contraseña para administradores | ✅ |
| `JWT_SECRET` | Clave secreta para tokens JWT | ✅ |
| `REDMINE_URL` | URL base de la instancia Redmine | ✅ |
| `REDMINE_TOKEN` | API Key de Redmine | ✅ |
| `REDMINE_DEFAULT_PROJECT` | Proyecto por defecto para sincronización | ❌ |
| `REDMINE_DEFAULT_TRACKER` | ID del tracker Epic (default: 19) | ❌ |
| `REDMINE_SYNC_LIMIT` | Límite de issues a sincronizar | ❌ |

---

## Módulos Funcionales

### Catálogo de Funcionalidades

El catálogo contiene las funcionalidades de producto sincronizadas desde Redmine.

#### Casos de Uso

**1. Listar Funcionalidades**
```
URL: GET /funcionalidades
Vista: Lista de funcionalidades con filtros y ordenamiento
```

**2. Ver Detalle de Funcionalidad**
```
URL: GET /funcionalidades/:id
Vista: Detalle completo con score, clientes productivos y epics relacionadas
```

**3. Editar Funcionalidad**
```
URL: GET /funcionalidades/:id/editar
Vista: Formulario de edición (campos editables: descripción, sección, monto, título personalizado)
```

**4. Actualizar Funcionalidad**
```
URL: PUT /funcionalidades/:id
Body: {
  "descripcion": "string",
  "seccion": "string",
  "monto": number,
  "titulo_personalizado": "string"
}
```

#### Filtros Disponibles

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `busqueda` | Búsqueda por texto | `?busqueda=liquidacion` |
| `seccion` | Filtrar por sección | `?seccion=Operatorias` |
| `secciones` | Filtrar por múltiples secciones | `?secciones[]=Operatorias&secciones[]=Comisiones` |
| `sponsor` | Filtrar por sponsor (cliente) | `?sponsor=UT%20BH` |
| `orden` | Campo de ordenamiento | `?orden=score_total` |
| `direccion` | Dirección del orden | `?direccion=desc` |

#### Campos de Ordenamiento
- `titulo`, `score_total`, `monto`, `fecha_creacion`, `created_at`, `epic_redmine`, `sponsor`, `seccion`, `cliente`

---

### Proyectos Internos

Gestión de proyectos de desarrollo interno sincronizados desde Redmine.

#### Casos de Uso

**1. Listar Proyectos Internos**
```
URL: GET /proyectos-internos
Vista: Lista de proyectos con filtros
```

**2. Ver Detalle**
```
URL: GET /proyectos-internos/:id
Vista: Detalle del proyecto con score
```

**3. Actualizar Proyecto**
```
URL: PUT /proyectos-internos/:id
Body: {
  "descripcion": "string",
  "seccion": "string",
  "monto": number
}
```

#### Datos Sincronizados desde Redmine
- `redmine_id`: ID del issue
- `titulo`: Subject del issue
- `proyecto_completo`: Nombre del proyecto
- `fecha_creacion`: Fecha de creación
- `fecha_real_finalizacion`: CF 15 (Fecha Real Finalización)
- `total_spent_hours`: Horas dedicadas
- `services_id`: CF 23 (Services ID)
- `estado_redmine`: Status del issue

---

### Requerimientos de Clientes

Seguimiento de solicitudes de clientes sincronizadas desde Redmine (tracker 29).

#### Casos de Uso

**1. Listar Requerimientos**
```
URL: GET /req-clientes
Vista: Lista de requerimientos (oculta requerimientos marcados como ocultos por defecto)
```

**2. Ver Detalle**
```
URL: GET /req-clientes/:id
Vista: Detalle del requerimiento con epic asociada
```

**3. Ocultar/Mostrar Requerimiento**
```
URL: PUT /req-clientes/:id/ocultar
Body: {
  "oculto": true/false
}
```

**4. Actualizar Epic Asociada**
```
URL: POST /req-clientes/:id/actualizar-epic
Body: {
  "id_epic": number
}
```

#### Campos Especiales
- `cf_91`: "Es Reventa" (Si/No) - Indica si el requerimiento puede ser revendido
- `cf_92`: "Proyecto Sponsor" - Referencia al proyecto que patrocina
- `id_epic`: ID del epic padre en Redmine

---

### Ideas y Mejoras

Registro de propuestas de mejora internas (no sincronizadas con Redmine).

#### Casos de Uso

**1. Listar Ideas**
```
URL: GET /ideas-mejoras
Vista: Lista de ideas con filtros
```

**2. Crear Nueva Idea**
```
URL: POST /ideas-mejoras
Body: {
  "titulo": "string",
  "descripcion": "string",
  "seccion": "string"
}
```

**3. Ver Detalle y Calculadora de Score**
```
URL: GET /ideas-mejoras/:id/score
Vista: Calculadora de score para la idea
```

**4. Actualizar Score**
```
URL: PUT /ideas-mejoras/:id/score
Body: {
  "facturacion": 0-10,
  "facturacion_potencial": 0-10,
  "impacto_cliente": 0-10,
  "esfuerzo": 0-10,
  "incertidumbre": 0-10,
  "riesgo": 0-10
}
```

---

### Sistema de Scoring

El sistema de scoring permite priorizar funcionalidades mediante criterios ponderados.

#### Fórmula de Cálculo

```
Score = Promedio Ponderado Positivos - (Promedio Ponderado Negativos × 0.25)
```

#### Criterios Positivos (Suman)
| Criterio | Peso Default | Descripción |
|----------|--------------|-------------|
| Facturación | 40% | Impacto en facturación actual |
| Facturación Potencial | 20% | Potencial de nuevos ingresos |
| Impacto Cliente | 40% | Valor percibido por el cliente |

#### Criterios Negativos (Restan)
| Criterio | Peso Default | Descripción |
|----------|--------------|-------------|
| Esfuerzo | 40% | Complejidad de implementación |
| Incertidumbre | 30% | Nivel de incertidumbre técnica |
| Riesgo | 30% | Riesgo del proyecto |

#### API de Score

**Calculadora de Score**
```
URL: GET /score/calculadora/:id
Vista: Calculadora interactiva para la funcionalidad
```

**Actualizar Criterios**
```
URL: PUT /score/:id
Body: {
  "facturacion": 0-10,
  "facturacion_potencial": 0-10,
  "impacto_cliente": 0-10,
  "esfuerzo": 0-10,
  "incertidumbre": 0-10,
  "riesgo": 0-10
}
```

**Actualizar Pesos**
```
URL: PUT /score/:id/pesos
Body: {
  "peso_facturacion": 40,
  "peso_facturacion_potencial": 20,
  "peso_impacto_cliente": 40,
  "peso_esfuerzo": 40,
  "peso_incertidumbre": 30,
  "peso_riesgo": 30
}
```

**Preview de Cálculo**
```
URL: POST /score/calcular-preview
Body: {
  "criterios": { ... },
  "pesos": { ... }
}
Response: {
  "score": number
}
```

---

### Mapa de Clientes

Matriz que relaciona clientes con funcionalidades y sus estados comerciales.

#### Estados Comerciales
- `productivo`: La funcionalidad está activa para el cliente
- `interesado`: El cliente ha mostrado interés
- `rechazado`: El cliente rechazó la funcionalidad
- `null`: Sin estado definido

#### Casos de Uso

**1. Ver Mapa**
```
URL: GET /mapa
Vista: Matriz interactiva clientes x funcionalidades
```

**2. Obtener Datos del Mapa**
```
URL: GET /mapa/datos
Response: {
  "clientes": [...],
  "funcionalidades": [...],
  "relaciones": { "clienteId-funcionalidadId": { "estado": "productivo" } }
}
```

**3. Actualizar Estado Comercial**
```
URL: PUT /mapa/estado/:clienteId/:funcionalidadId
Body: {
  "estado_comercial": "productivo" | "interesado" | "rechazado" | null
}
```

**4. Crear Cliente**
```
URL: POST /mapa/clientes
Body: {
  "nombre": "string",
  "color": "#HEX"
}
```

**5. Asociar Cliente Redmine**
```
URL: PUT /mapa/clientes/:clienteId/cliente-redmine
Body: {
  "clientes_redmine": ["UT BH", "UT Bancor"]
}
⚠️ Requiere permisos de administrador
```

#### Relaciones Automáticas

El sistema crea automáticamente relaciones con estado "interesado" cuando:
- Un requerimiento de cliente tiene `cf_91 = "Si"` (Es Reventa)
- El `cf_92` (Proyecto Sponsor) coincide con una funcionalidad existente
- El cliente del requerimiento está mapeado a un cliente de la web

---

## API Reference

### Endpoints Generales

#### Health Check
```http
GET /api/health
Response: {
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Estadísticas
```http
GET /api/estadisticas
Response: {
  "success": true,
  "estadisticas": {
    "funcionalidades": { "total_funcionalidades": 50, "score_promedio": 7.5 },
    "scores": { "promedio": 7.5, "maximo": 9.8, "minimo": 2.1 },
    "mapa": { "por_estado": [...], "total": 150 }
  }
}
```

### API de Funcionalidades

```http
# Listar funcionalidades
GET /api/funcionalidades?busqueda=&seccion=&orden=score_total&direccion=desc

# Sugerencias de búsqueda
GET /api/funcionalidades/sugerencias?q=texto

# Obtener clientes de funcionalidad
GET /funcionalidades/:id/clientes
```

### API de Proyectos Internos

```http
# Listar proyectos
GET /api/proyectos-internos?busqueda=&orden=score_total&direccion=desc

# Sugerencias de búsqueda
GET /api/proyectos-internos/sugerencias?q=texto

# Ranking por score
GET /api/proyectos-internos/ranking
```

### API de Requerimientos de Clientes

```http
# Sugerencias de búsqueda
GET /api/req-clientes/sugerencias?q=texto
```

### API de Clientes

```http
# Listar todos los clientes
GET /api/clientes

# Obtener clientes Redmine disponibles
GET /mapa/clientes-redmine

# Obtener clientes Redmine asociados a un cliente
GET /mapa/clientes/:clienteId/cliente-redmine
```

---

## Sincronización con Redmine

### Sincronización de Funcionalidades (Catálogo)

```http
POST /api/redmine/sincronizar
Headers: Authorization (Admin requerido)
Body: {
  "project_id": "ut-bancor",      // Opcional, default: REDMINE_DEFAULT_PROJECT
  "tracker_id": "19",              // Opcional, default: REDMINE_DEFAULT_TRACKER
  "max_total": 100                 // Opcional, default: 100 (máx: 100)
}
```

**Proceso:**
1. Obtiene proyectos de Redmine filtrados por `cf_19` (Producto) y `cf_95` (En Catálogo)
2. Inserta/actualiza en tabla `redmine_funcionalidades`
3. Crea funcionalidades vacías en tabla `funcionalidades` para nuevos registros
4. Los datos editables (descripción, sección, monto, score) **NO se sobrescriben**

### Sincronización de Proyectos Internos

```http
POST /api/redmine/sincronizar-proyectos-internos
Headers: Authorization (Admin requerido)
Body: {
  "tracker_id": "19",              // Opcional, default: REDMINE_INTERNAL_TRACKER
  "max_total": 100,                // Opcional, default: 100 (máx: 100)
  "cf_23": "*"                     // Opcional, filtro por Services ID
}
```

**Filtros aplicados:**
- Proyecto: `ut-mercap` (configurable via `REDMINE_INTERNAL_PROJECT`)
- Tracker: Epic (ID 19)
- Custom Field 23: Services ID

### Sincronización de Requerimientos de Clientes

```http
POST /api/redmine/sincronizar-req-clientes
Headers: Authorization (Admin requerido)
Body: {
  "tracker_id": "29",              // Opcional, default: 29
  "max_total": 100                 // Opcional, default: 100 (máx: 100)
}
```

**Validaciones:**
- Omite proyectos "UT Mercap | Mantenimiento"
- Omite issues cuyo `proyecto_completo` ya existe en `redmine_funcionalidades`
- Extrae y normaliza `cf_91` (Es Reventa) y `cf_92` (Proyecto Sponsor)

### Estado de Sincronización

```http
GET /api/redmine/estado
Response: {
  "success": true,
  "redmine_funcionalidades": {
    "total_issues": 150,
    "ultima_sincronizacion": "2024-01-01T12:00:00Z",
    "issues_abiertos": 120,
    "issues_cerrados": 30
  },
  "funcionalidades": {
    "total_funcionalidades": 150,
    "con_redmine": 145,
    "sin_redmine": 5
  }
}
```

---

## Autenticación y Roles

### Sistema JWT

La aplicación utiliza JSON Web Tokens para autenticación stateless.

#### Login
```http
POST /login
Body: { "password": "contraseña" }

Response:
- Éxito: Cookie `auth_token` con JWT (24h de expiración)
- Error: Renderiza página de login con mensaje de error
```

#### Logout
```http
POST /login/logout
Response: Elimina cookie y redirige a /login
```

### Roles de Usuario

| Rol | Acceso |
|-----|--------|
| Usuario | Lectura y edición de funcionalidades, scores, etc. |
| Admin | Todo lo anterior + Sincronización + Gestión de clientes Redmine |

### Rutas Protegidas

Todas las rutas excepto `/login` requieren autenticación.

Las siguientes acciones requieren rol **Admin**:
- `POST /api/redmine/sincronizar`
- `POST /api/redmine/sincronizar-proyectos-internos`
- `POST /api/redmine/sincronizar-req-clientes`
- `PUT /mapa/clientes/:clienteId/cliente-redmine`

---

## Base de Datos

### Tablas Principales

#### `redmine_funcionalidades`
Datos sincronizados desde Redmine (catálogo).
```sql
- redmine_id (PK)
- titulo
- cliente (sponsor truncado del título)
- fecha_creacion
- reventa (Si/No)
- total_spent_hours
- sincronizado_en
```

#### `funcionalidades`
Datos editables de funcionalidades.
```sql
- id (PK)
- redmine_id (FK → redmine_funcionalidades)
- titulo
- descripcion
- seccion
- monto
- titulo_personalizado
- created_at
- updated_at
```

#### `score`
Criterios de scoring para funcionalidades.
```sql
- id (PK)
- funcionalidad_id (FK → redmine_funcionalidades.redmine_id)
- facturacion, facturacion_potencial, impacto_cliente
- esfuerzo, incertidumbre, riesgo
- peso_facturacion, peso_facturacion_potencial, peso_impacto_cliente
- peso_esfuerzo, peso_incertidumbre, peso_riesgo
- score_calculado
```

#### `clientes`
Catálogo de clientes de la aplicación.
```sql
- id (PK)
- nombre
- codigo
- color
- activo
```

#### `cliente_cliente_redmine`
Mapeo entre clientes de la app y clientes de Redmine.
```sql
- id (PK)
- cliente_id (FK → clientes)
- cliente_redmine (varchar)
```

#### `cliente_funcionalidad`
Relación muchos a muchos clientes-funcionalidades.
```sql
- id (PK)
- cliente_id (FK → clientes)
- funcionalidad_id (FK → redmine_funcionalidades.redmine_id)
- estado_comercial (productivo/interesado/rechazado/null)
```

### Vistas

#### `v_funcionalidades_completas`
Combina datos de Redmine con datos editables.

#### `v_proyectos_internos_completos`
Combina datos de proyectos internos de Redmine.

#### `v_req_clientes_completos`
Combina datos de requerimientos de clientes.

---

## Consideraciones Técnicas

### Despliegue en Vercel

1. **Serverless**: Cada request puede ir a una instancia diferente
2. **Sesiones**: Se usa PostgreSQL como store para sesiones
3. **Límite de tiempo**: 10s (free) / 60s (pro) por función
4. **Sistema de archivos**: Read-only

### Límites de Sincronización

- Máximo 100 registros por request de sincronización
- Pausa de 200ms entre requests a Redmine para evitar rate limiting
- Los datos editables **nunca se sobrescriben** en sincronizaciones

### Mapeo de Custom Fields de Redmine

| CF ID | Nombre | Uso |
|-------|--------|-----|
| 15 | Fecha Real Finalización | Proyectos internos y req. clientes |
| 19 | Producto | Filtro de proyectos (catálogo) |
| 20 | Cliente | Identificador de cliente |
| 23 | Services ID | Proyectos internos |
| 91 | Es Reventa | Req. clientes (Si/No) |
| 92 | Proyecto Sponsor | Req. clientes |
| 93 | Es Reventa | Funcionalidades |
| 94 | Sponsor | Funcionalidades |
| 95 | En Catálogo | Filtro de proyectos |

### Extracción de Cliente (Sponsor)

El cliente se extrae del título del proyecto:
```
"UT BH | Liquidación automática" → "UT BH"
"UT Petersen | Alta de cuentas" → "UT Petersen"
```

Si no hay `|`, se usa el título completo (máximo 255 caracteres).

### Orden de Clientes en Mapa

Orden predefinido:
```javascript
['Macro', 'BH', 'GPET', 'Bancor', 'BST', 'VOII', 'Formosa', 'BMR', 'Naranja', 'Tarjeta', 'BLP', 'Chaco', 'Chubut']
```
Los clientes no listados se ordenan alfabéticamente después.

---

## Evolución Futura

### Mejoras Sugeridas

1. **Notificaciones**: Sistema de alertas para cambios en scores o estados
2. **Reportes**: Dashboard con métricas y gráficos
3. **Workflow**: Estados de desarrollo para funcionalidades
4. **Comentarios**: Historial de comentarios en funcionalidades
5. **Auditoría**: Log de cambios con usuario y timestamp

### Integraciones Posibles

- **Slack/Teams**: Notificaciones automáticas
- **Jira**: Sincronización bidireccional
- **Google Sheets**: Exportación de reportes
- **Power BI**: Conexión para dashboards

---

## Soporte

Para reportar bugs o solicitar mejoras, contactar al equipo de desarrollo.

---

*Última actualización: Enero 2026*
