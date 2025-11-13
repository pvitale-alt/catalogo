const express = require('express');
const router = express.Router();
const { generateToken, verifyToken } = require('../middleware/authJWT');

// Contraseñas de login desde variables de entorno
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD; // Usuario normal
const LOGIN_PASSWORD_ADMIN = process.env.LOGIN_PASSWORD_ADMIN; // Admin

// Validar que la contraseña de usuario normal esté configurada
if (!LOGIN_PASSWORD) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
        console.error('❌ ERROR CRÍTICO: LOGIN_PASSWORD no está configurada en variables de entorno');
        console.error('   Configura LOGIN_PASSWORD en Vercel → Settings → Environment Variables');
        process.exit(1);
    } else {
        console.warn('⚠️ ADVERTENCIA: LOGIN_PASSWORD no está configurada');
        console.warn('   El login NO funcionará hasta que configures LOGIN_PASSWORD en tu archivo .env');
        console.warn('   Crea un archivo .env en la raíz del proyecto con: LOGIN_PASSWORD=tu_contraseña');
    }
}

// Validar que la contraseña de admin esté configurada
if (!LOGIN_PASSWORD_ADMIN) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
        console.error('❌ ERROR CRÍTICO: LOGIN_PASSWORD_ADMIN no está configurada en variables de entorno');
        console.error('   Configura LOGIN_PASSWORD_ADMIN en Vercel → Settings → Environment Variables');
        process.exit(1);
    } else {
        console.warn('⚠️ ADVERTENCIA: LOGIN_PASSWORD_ADMIN no está configurada');
        console.warn('   El login de admin NO funcionará hasta que configures LOGIN_PASSWORD_ADMIN en tu archivo .env');
        console.warn('   Agrega a tu archivo .env: LOGIN_PASSWORD_ADMIN=tu_contraseña_admin');
    }
}

// Log de inicialización
console.log('🔐 Sistema de autenticación iniciado:');
console.log('   - Usuario normal: LOGIN_PASSWORD configurada');
console.log('   - Usuario admin: LOGIN_PASSWORD_ADMIN configurada');


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
    
    // Verificar si es admin o usuario normal
    let isAdmin = false;
    let loginSuccess = false;
    
    // Validar que ambas contraseñas estén configuradas antes de comparar
    if (!LOGIN_PASSWORD_ADMIN) {
        console.error('❌ LOGIN_PASSWORD_ADMIN no está configurada');
        return res.render('pages/login', {
            title: 'Login - Catálogo',
            error: 'Error de configuración del servidor. Contacte al administrador.'
        });
    }
    
    if (password === LOGIN_PASSWORD_ADMIN) {
        // Login como admin
        isAdmin = true;
        loginSuccess = true;
        console.log('✅ Login exitoso como ADMIN');
    } else if (password === LOGIN_PASSWORD) {
        // Login como usuario normal
        isAdmin = false;
        loginSuccess = true;
        console.log('✅ Login exitoso como USUARIO');
    }
    
    if (loginSuccess) {
        // Generar token JWT con rol
        const token = generateToken(isAdmin);
        
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
            console.log(`✅ Token JWT generado y cookie establecida - Rol: ${isAdmin ? 'ADMIN' : 'USUARIO'}`);
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

