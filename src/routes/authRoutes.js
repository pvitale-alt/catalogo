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
        // Usar promesa para asegurar que se guarde completamente
        try {
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            // Verificar que la sesión se guardó correctamente
            if (process.env.DEBUG_SESSIONS === 'true' || process.env.NODE_ENV === 'production') {
                console.log('✅ Sesión guardada exitosamente:', {
                    sessionId: req.sessionID,
                    authenticated: req.session.authenticated,
                    cookie: req.headers.cookie,
                    setCookieHeader: res.getHeader('Set-Cookie')
                });
            }
            
            // Redirigir después de guardar
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

