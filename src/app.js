// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./config/database');

const app = express();

// Configuración de sesiones con PostgreSQL Store
// En Vercel (serverless), las sesiones en memoria NO funcionan porque cada request
// puede ir a una instancia diferente. Necesitamos usar PostgreSQL como store.
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// Configurar store de sesiones con manejo de errores
const sessionStore = new pgSession({
    pool: pool, // Usar el pool de conexiones existente
    tableName: 'session', // Nombre de la tabla en PostgreSQL
    createTableIfMissing: true, // Crear tabla automáticamente si no existe
    pruneSessionInterval: 60 // Limpiar sesiones expiradas cada 60 segundos
});

// Manejar errores del store
sessionStore.on('error', (error) => {
    console.error('❌ Error en store de sesiones:', error);
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'catalogo-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Renovar cookie en cada request
    cookie: {
        secure: isProduction || isVercel, // HTTPS en producción/Vercel
        httpOnly: true,
        sameSite: 'lax', // Compatible con Vercel y navegadores modernos
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        // En Vercel, no especificar dominio para que funcione en todos los subdominios
        // Dejar que Express lo maneje automáticamente
        path: '/' // Asegurar que la cookie esté disponible en todas las rutas
    },
    name: 'catalogo.sid' // Nombre personalizado para la cookie
    // NO usar genid personalizado - dejar que express-session lo maneje automáticamente
    // genid solo se usa cuando NO hay cookie, y puede interferir con la recuperación de sesiones
}));

// Configuración de vistas (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Deshabilitar cache de vistas en desarrollo
if (process.env.NODE_ENV !== 'production') {
    app.set('view cache', false);
}

// Middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear JSON y form data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de autenticación JWT (reemplaza el sistema de sesiones)
const { requireAuthJWT } = require('./middleware/authJWT');
const requireAuth = requireAuthJWT;

// Middleware de autenticación ANTIGUO (sesiones) - COMENTADO
/*
const requireAuth = (req, res, next) => {
    // Log detallado para debug
    if (process.env.DEBUG_SESSIONS === 'true' || process.env.NODE_ENV === 'production') {
        // Extraer la cookie de sesión del header
        const cookieHeader = req.headers.cookie || '';
        const sessionCookieMatch = cookieHeader.match(/catalogo\.sid=([^;]+)/);
        const sessionCookieValue = sessionCookieMatch ? sessionCookieMatch[1] : null;
        
        // Verificar si la cookie está presente
        const hasSessionCookie = !!sessionCookieValue;
        const cookieMatches = sessionCookieValue === req.sessionID;
        
        console.log('🔐 Verificando autenticación:', {
            path: req.path,
            hasSession: !!req.session,
            authenticated: req.session?.authenticated,
            sessionId: req.sessionID,
            cookieHeader: cookieHeader,
            sessionCookieValue: sessionCookieValue,
            hasSessionCookie: hasSessionCookie,
            cookieMatches: cookieMatches,
            sessionKeys: req.session ? Object.keys(req.session) : [],
            // Verificar si hay otros cookies
            allCookies: cookieHeader.split(';').map(c => c.trim())
        });
        
        // Si hay cookie pero no coincide con sessionID, hay un problema
        if (hasSessionCookie && !cookieMatches) {
            console.warn('⚠️ ADVERTENCIA: Cookie de sesión presente pero no coincide con sessionID', {
                cookieValue: sessionCookieValue,
                sessionID: req.sessionID
            });
            
            // Intentar recuperar la sesión manualmente desde el store
            if (sessionStore && sessionCookieValue) {
                sessionStore.get(sessionCookieValue, (err, sessionData) => {
                    if (err) {
                        console.error('❌ Error al recuperar sesión del store:', err);
                    } else if (sessionData) {
                        console.log('✅ Sesión encontrada en store:', {
                            sessionID: sessionCookieValue,
                            hasData: !!sessionData,
                            authenticated: sessionData.authenticated,
                            keys: Object.keys(sessionData)
                        });
                    } else {
                        console.warn('⚠️ Sesión NO encontrada en store para sessionID:', sessionCookieValue);
                    }
                });
            }
        }
        
        // Si no hay cookie pero hay sessionID, la sesión se creó sin cookie
        if (!hasSessionCookie && req.sessionID) {
            console.warn('⚠️ ADVERTENCIA: sessionID existe pero no hay cookie en el header', {
                sessionID: req.sessionID,
                cookieHeader: cookieHeader
            });
        }
    }
    
    // Verificar si la sesión existe y está autenticada
    if (req.session && req.session.authenticated === true) {
        if (process.env.DEBUG_SESSIONS === 'true') {
            console.log('✅ Autenticación válida - Continuando');
        }
        return next();
    }
    
    // Log si no está autenticado
    if (process.env.DEBUG_SESSIONS === 'true' || process.env.NODE_ENV === 'production') {
        console.log('❌ No autenticado - Redirigiendo a /login', {
            hasSession: !!req.session,
            authenticated: req.session?.authenticated,
            sessionId: req.sessionID
        });
    }
    
    res.redirect('/login');
};
*/

// Rutas
const indexRoutes = require('./routes/indexRoutes');
const funcionalidadesRoutes = require('./routes/funcionalidadesRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const mapaRoutes = require('./routes/mapaRoutes');
const apiRoutes = require('./routes/apiRoutes');
const redmineRoutes = require('./routes/redmineRoutes');
const proyectosInternosRoutes = require('./routes/proyectosInternosRoutes');
const ideasMejorasRoutes = require('./routes/ideasMejorasRoutes');
const reqClientesRoutes = require('./routes/reqClientesRoutes');
const authRoutes = require('./routes/authRoutes');

// Rutas públicas
app.use('/login', authRoutes);

// Rutas protegidas
app.use('/', requireAuth, indexRoutes);
app.use('/funcionalidades', requireAuth, funcionalidadesRoutes);
app.use('/score', requireAuth, scoreRoutes);
app.use('/mapa', requireAuth, mapaRoutes);
app.use('/proyectos-internos', requireAuth, proyectosInternosRoutes);
app.use('/backlog-proyectos', requireAuth, (req, res) => {
    const suffix = req.url === '/' ? '' : req.url;
    res.redirect(301, `/proyectos-internos${suffix}`);
});
app.use('/req-clientes', requireAuth, reqClientesRoutes);
app.use('/ideas-mejoras', requireAuth, ideasMejorasRoutes);
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

// Iniciar servidor solo en desarrollo (Vercel maneja producción)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📁 Entorno: ${process.env.NODE_ENV || 'development'}`);
        console.log(`ℹ️  La sincronización con Redmine debe hacerse manualmente desde la UI`);
    });
}

// Exportar app para Vercel (serverless)
module.exports = app;

