const express = require('express');
const router = express.Router();

const HARDCODED_PASSWORD = 'MPmercap767';

/**
 * Renderizar página de login
 */
router.get('/', (req, res) => {
    // Si ya está autenticado, redirigir a la página principal
    if (req.session && req.session.authenticated) {
        return res.redirect('/funcionalidades');
    }
    
    res.render('pages/login', {
        title: 'Login - Catálogo'
    });
});

/**
 * Procesar login
 */
router.post('/', async (req, res) => {
    const { password } = req.body;
    
    if (password === HARDCODED_PASSWORD) {
        // Establecer autenticación en la sesión
        req.session.authenticated = true;
        
        // Log para debug
        if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SESSIONS === 'true') {
            console.log('✅ Login exitoso - Configurando sesión:', {
                sessionId: req.sessionID,
                authenticated: req.session.authenticated,
                cookie: req.headers.cookie
            });
        }
        
        // Guardar sesión explícitamente antes de redirigir
        // En Vercel serverless, es crítico esperar a que se guarde completamente
        try {
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Error en session.save:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            
            // CRÍTICO: En Vercel, express-session puede no establecer la cookie automáticamente
            // Necesitamos forzar que se establezca llamando a touch() o regenerando
            // Esto asegura que la cookie se establezca en la respuesta
            req.session.touch();
            
            // Verificar que la sesión se guardó correctamente
            if (process.env.DEBUG_SESSIONS === 'true' || process.env.NODE_ENV === 'production') {
                // Esperar un tick para que express-session procese la cookie
                await new Promise(resolve => setImmediate(resolve));
                
                const setCookieHeader = res.getHeader('Set-Cookie');
                console.log('✅ Sesión guardada exitosamente:', {
                    sessionId: req.sessionID,
                    authenticated: req.session.authenticated,
                    cookie: req.headers.cookie,
                    setCookieHeader: setCookieHeader,
                    hasSetCookie: !!setCookieHeader,
                    // Verificar si la cookie está en los headers de respuesta
                    responseHeaders: Object.keys(res.getHeaders())
                });
                
                // Si la cookie aún no está establecida, establecerla manualmente
                if (!setCookieHeader || (Array.isArray(setCookieHeader) && !setCookieHeader.some(c => c.includes('catalogo.sid')))) {
                    const cookieName = 'catalogo.sid';
                    const cookieValue = req.sessionID;
                    const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
                    
                    res.cookie(cookieName, cookieValue, {
                        httpOnly: true,
                        secure: isSecure,
                        sameSite: 'lax',
                        maxAge: 24 * 60 * 60 * 1000, // 24 horas
                        path: '/'
                    });
                    
                    console.log('🍪 Cookie establecida manualmente después de verificar:', {
                        cookieName,
                        cookieValue,
                        sessionID: req.sessionID
                    });
                }
            }
            
            // Redirigir después de guardar y establecer la cookie
            res.redirect('/funcionalidades');
        } catch (err) {
            console.error('❌ Error al guardar sesión:', err);
            res.render('pages/login', {
                title: 'Login - Catálogo',
                error: 'Error al iniciar sesión. Por favor, intente nuevamente.'
            });
        }
    } else {
        if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SESSIONS === 'true') {
            console.log('❌ Login fallido - Contraseña incorrecta');
        }
        res.render('pages/login', {
            title: 'Login - Catálogo',
            error: 'Contraseña incorrecta'
        });
    }
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.redirect('/login');
    });
});

module.exports = router;

