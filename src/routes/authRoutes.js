const express = require('express');
const router = express.Router();
const { generateToken, verifyToken } = require('../middleware/authJWT');

// Contraseña de login desde variable de entorno
// ⚠️ OBLIGATORIA en producción - Sin esto, el login fallará
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

// Validar que la contraseña esté configurada en producción
if (!LOGIN_PASSWORD) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
        console.error('❌ ERROR CRÍTICO: LOGIN_PASSWORD no está configurada en variables de entorno');
        console.error('   Configura LOGIN_PASSWORD en Vercel → Settings → Environment Variables');
        // En producción, no usar fallback - el login fallará hasta que se configure
        process.exit(1);
    } else {
        // Solo en desarrollo local, mostrar advertencia
        console.warn('⚠️ ADVERTENCIA: LOGIN_PASSWORD no está configurada');
        console.warn('   El login NO funcionará hasta que configures LOGIN_PASSWORD en tu archivo .env');
        console.warn('   Crea un archivo .env en la raíz del proyecto con: LOGIN_PASSWORD=tu_contraseña');
    }
}


/**
 * Renderizar página de login
 */
router.get('/', (req, res) => {
    // Verificar si ya está autenticado con JWT
    const cookieHeader = req.headers.cookie || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    
    if (token) {
        const verification = verifyToken(token);
        if (verification.valid) {
            return res.redirect('/funcionalidades');
        }
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
    
    // Validar que LOGIN_PASSWORD esté configurada antes de comparar
    if (!LOGIN_PASSWORD) {
        console.error('❌ LOGIN_PASSWORD no está configurada');
        return res.render('pages/login', {
            title: 'Login - Catálogo',
            error: 'Error de configuración del servidor. Contacte al administrador.'
        });
    }
    
    if (password === LOGIN_PASSWORD) {
        // Generar token JWT
        const token = generateToken();
        
        // Establecer cookie con el token
        const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
            path: '/'
        });
        
        if (process.env.DEBUG_SESSIONS === 'true' || process.env.NODE_ENV === 'production') {
            console.log('✅ Login exitoso - Token JWT generado y cookie establecida');
        }
        
        // Redirigir a funcionalidades
        res.redirect('/funcionalidades');
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
    // Limpiar cookie de autenticación
    res.clearCookie('auth_token');
    res.redirect('/login');
});

module.exports = router;

