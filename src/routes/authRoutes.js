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
router.post('/', (req, res) => {
    const { password } = req.body;
    
    if (password === HARDCODED_PASSWORD) {
        req.session.authenticated = true;
        
        // Log para debug (solo en desarrollo o si hay problemas)
        if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SESSIONS === 'true') {
            console.log('✅ Login exitoso - Sesión creada:', {
                sessionId: req.sessionID,
                authenticated: req.session.authenticated,
                cookie: req.headers.cookie
            });
        }
        
        // Guardar sesión antes de redirigir
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error al guardar sesión:', err);
                return res.render('pages/login', {
                    title: 'Login - Catálogo',
                    error: 'Error al iniciar sesión. Por favor, intente nuevamente.'
                });
            }
            res.redirect('/funcionalidades');
        });
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

