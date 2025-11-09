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
        res.redirect('/funcionalidades');
    } else {
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

