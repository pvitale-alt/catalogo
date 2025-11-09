// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'catalogo-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Configuración de vistas (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear JSON y form data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de autenticación
const requireAuth = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return next();
    }
    res.redirect('/login');
};

// Rutas
const indexRoutes = require('./routes/indexRoutes');
const funcionalidadesRoutes = require('./routes/funcionalidadesRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const mapaRoutes = require('./routes/mapaRoutes');
const apiRoutes = require('./routes/apiRoutes');
const redmineRoutes = require('./routes/redmineRoutes');
const desarrollosRoutes = require('./routes/desarrollosRoutes');
const authRoutes = require('./routes/authRoutes');

// Rutas públicas
app.use('/login', authRoutes);

// Rutas protegidas
app.use('/', requireAuth, indexRoutes);
app.use('/funcionalidades', requireAuth, funcionalidadesRoutes);
app.use('/score', requireAuth, scoreRoutes);
app.use('/mapa', requireAuth, mapaRoutes);
app.use('/desarrollos-internos', requireAuth, desarrollosRoutes);
app.use('/api', requireAuth, apiRoutes);
app.use('/api/redmine', requireAuth, redmineRoutes);

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('pages/404', {
        title: '404 - Página no encontrada'
    });
});

// Manejo de errores del servidor
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error'
    });
});

// Sincronización con Redmine al iniciar el servidor
// ⚠️ Solo se ejecuta UNA VEZ al levantar el servidor
async function inicializarApp() {
    // Solo sincronizar en desarrollo (comentar esta línea para sincronizar en producción también)
    if (process.env.NODE_ENV === 'production') {
        console.log('ℹ️ Sincronización automática deshabilitada en producción');
        console.log('   Para sincronizar, usar: POST /api/redmine/sincronizar');
        return;
    }

    // Verificar si las credenciales de Redmine están configuradas
    if (!process.env.REDMINE_TOKEN) {
        console.log('⚠️ REDMINE_TOKEN no configurado - sincronización omitida');
        console.log('   Configura REDMINE_TOKEN en .env para habilitar la sincronización');
        return;
    }

    try {
        const sincronizacionService = require('./services/sincronizacionService');
        
        console.log('\n🚀 Iniciando sincronización automática con Redmine...\n');
        
        // Obtener límite desde variable de entorno (útil para pruebas)
        const syncLimit = process.env.REDMINE_SYNC_LIMIT ? parseInt(process.env.REDMINE_SYNC_LIMIT) : null;
        
        // Sincronizar proyecto principal filtrando solo Epics (tracker_id = 19)
        // Si falla, intentará sin filtro
        let resultado;
        try {
            resultado = await sincronizacionService.sincronizarRedmine('ut-bancor', '19', syncLimit);
        } catch (error) {
            console.log('⚠️ Error al sincronizar con tracker_id=19, intentando sin filtro...');
            resultado = await sincronizacionService.sincronizarRedmine('ut-bancor', null, syncLimit);
        }
        
        if (resultado.success) {
            console.log('✅ Sincronización inicial completada');
        } else {
            console.log('⚠️ Sincronización inicial falló:', resultado.message);
        }
    } catch (error) {
        console.error('❌ Error en sincronización inicial:', error.message);
    }
}

// Iniciar servidor solo en desarrollo (Vercel maneja producción)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, async () => {
        console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📁 Entorno: ${process.env.NODE_ENV || 'development'}`);
        
        // Ejecutar sincronización inicial
        await inicializarApp();
    });
} else {
    // En producción (Vercel), ejecutar sincronización al cargar el módulo
    inicializarApp().catch(err => {
        console.error('❌ Error en inicialización:', err);
    });
}

// Exportar app para Vercel (serverless)
module.exports = app;

