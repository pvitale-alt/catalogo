// Servicio para consumir datos de Redmine vía Google Apps Script
// ⚠️ NOTA: Este servicio NO se está usando actualmente
// El sistema usa redmineDirectService.js que llama directamente a la API de Redmine
// Este archivo se mantiene por si se necesita en el futuro, pero no requiere configuración

const { OAuth2Client } = require('google-auth-library');

const REDMINE_API_URL = process.env.REDMINE_API_URL; // Opcional - solo necesario si se usa este servicio

let oauth2Client = null;
let accessToken = null;
let tokenExpiry = null;

/**
 * Inicializar cliente OAuth2
 */
function inicializarOAuth() {
    if (oauth2Client) return oauth2Client;
    
    oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    );
    
    // Si hay refresh token guardado, configurarlo
    if (process.env.GOOGLE_REFRESH_TOKEN) {
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
    }
    
    return oauth2Client;
}

/**
 * Obtener token de acceso (renovarlo si es necesario)
 */
async function obtenerAccessToken() {
    // Si hay access token válido, usarlo
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }
    
    const client = inicializarOAuth();
    
    // Si hay refresh token, usarlo para obtener nuevo access token
    if (process.env.GOOGLE_REFRESH_TOKEN) {
        try {
            const { credentials } = await client.refreshAccessToken();
            accessToken = credentials.access_token;
            // Los tokens de Google duran 1 hora, guardar expiración
            tokenExpiry = Date.now() + (credentials.expiry_date - Date.now() || 3600000);
            return accessToken;
        } catch (error) {
            console.error('❌ Error refrescando token:', error.message);
            throw new Error('Token expirado. Ve a /auth/google para re-autenticarte.');
        }
    }
    
    // Si hay access token en variable de entorno, usarlo
    if (process.env.GOOGLE_ACCESS_TOKEN) {
        accessToken = process.env.GOOGLE_ACCESS_TOKEN;
        // Asumir que expira en 1 hora
        tokenExpiry = Date.now() + 3600000;
        return accessToken;
    }
    
    throw new Error('No hay token de acceso. Autentícate en /auth/google');
}

/**
 * Obtener issues de Redmine por proyecto
 * @param {Object} options - Opciones de búsqueda
 * @param {string} options.project_id - ID del proyecto en Redmine
 * @param {string} options.status_id - ID del estado (* para todos)
 * @param {number} options.limit - Límite de resultados
 * @param {string} options.format - Formato de respuesta (json_full recomendado)
 * @returns {Promise<Object>} - Datos de Redmine
 */
async function obtenerIssues(options = {}) {
    // ⚠️ Este servicio NO se está usando actualmente
    if (!REDMINE_API_URL) {
        throw new Error('❌ REDMINE_API_URL no está configurado. Este servicio requiere Google Apps Script y actualmente NO se está usando. El sistema usa redmineDirectService.js en su lugar.');
    }
    
    const {
        project_id = process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor',
        status_id = '*',
        limit = 300,
        format = 'json_full'
    } = options;

    try {
        // Obtener token de acceso
        const token = await obtenerAccessToken();
        
        const params = new URLSearchParams({
            project_id,
            status_id,
            limit: limit.toString(),
            format
        });

        const url = `${REDMINE_API_URL}?${params.toString()}`;
        
        // Ocultar URL completa en logs por seguridad
        console.log('🔍 Consultando Redmine con OAuth');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'User-Agent': 'Catalogo-NodeJS/1.0'
            },
            redirect: 'follow'
        });

        const contentType = response.headers.get('content-type') || '';
        const isJSON = contentType.includes('application/json');

        if (!response.ok) {
            if (response.status === 401) {
                // Token inválido, limpiar y pedir re-autenticación
                accessToken = null;
                tokenExpiry = null;
                throw new Error('Token expirado o inválido. Ve a /auth/google para re-autenticarte.');
            }
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status);
            console.error('📄 Respuesta:', errorText.substring(0, 500));
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }

        if (!isJSON) {
            const htmlResponse = await response.text();
            console.error('⚠️ Se recibió HTML en lugar de JSON');
            console.error('📄 Respuesta:', htmlResponse.substring(0, 500));
            throw new Error('El Web App está devolviendo HTML. Verifica permisos y configuración.');
        }

        const data = await response.json();
        
        // Verificar si hay error en la respuesta JSON
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Verificar si el token fue rechazado
        if (!data.success && data.error && data.error.includes('Token')) {
            accessToken = null;
            tokenExpiry = null;
            throw new Error('Token de acceso inválido. Ve a /auth/google para re-autenticarte.');
        }
        
        console.log(`✅ Issues obtenidos: ${data.count || data.issues?.length || 0}`);
        
        return data;
    } catch (error) {
        console.error('❌ Error al obtener issues:', error.message);
        throw error;
    }
}

/**
 * Mapear issue de Redmine a funcionalidad del catálogo
 * @param {Object} issue - Issue de Redmine
 * @returns {Object} - Funcionalidad mapeada
 */
function mapearIssueAFuncionalidad(issue) {
    // Extraer custom fields
    const customFields = issue.custom_fields || [];
    const getCF = (name) => customFields.find(cf => cf.name === name)?.value || null;

    return {
        titulo: issue.subject || 'Sin título',
        descripcion: issue.description || '',
        epic_redmine: issue.id.toString(),
        seccion: issue.tracker?.name || 'Sin categoría',
        fecha: getCF('Fecha planificada de inicio') || null,
        sponsor: getCF('Cuenta') || null,
        estado_redmine: issue.status?.name || 'Desconocido',
        prioridad: issue.priority?.name || 'Normal',
        asignado_a: issue.assigned_to?.name || null,
        services_id: getCF('Services-ID') || null,
        fecha_fin: getCF('Fecha planificada de fin') || null,
        monto: null, // A definir manualmente o desde otro campo
        score_calculado: null // A calcular posteriormente
    };
}

/**
 * Sincronizar issues de Redmine con funcionalidades del catálogo
 * @param {string} project_id - ID del proyecto
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarConCatalogo(project_id = process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor') {
    try {
        const data = await obtenerIssues({ project_id, format: 'json_full' });
        const issues = data.issues || [];

        const funcionalidades = issues.map(mapearIssueAFuncionalidad);

        return {
            success: true,
            total: funcionalidades.length,
            funcionalidades
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Obtener lista de proyectos disponibles
 * (Esto requeriría otro endpoint en tu Google Apps Script)
 */
async function obtenerProyectos() {
    // TODO: Implementar endpoint en Google Apps Script para listar proyectos
    const defaultProject = process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor';
    return [
        { id: defaultProject, name: `Proyecto ${defaultProject}` },
        // Agregar más proyectos según necesidad
    ];
}

module.exports = {
    obtenerIssues,
    mapearIssueAFuncionalidad,
    sincronizarConCatalogo,
    obtenerProyectos
};

