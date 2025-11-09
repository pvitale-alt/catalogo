// Servicio para consumir API de Redmine directamente
// ⚠️ SOLO PARA CONSULTAS (READ-ONLY) - NUNCA EDITAR/INSERTAR

const REDMINE_URL = process.env.REDMINE_URL || 'https://redmine.mercap.net';
const REDMINE_TOKEN = process.env.REDMINE_TOKEN; // API Key de Redmine

/**
 * Validar que las credenciales están configuradas
 */
function validarCredenciales() {
    if (!REDMINE_TOKEN) {
        throw new Error('❌ REDMINE_TOKEN no está configurado en las variables de entorno');
    }
    console.log('✅ Credenciales de Redmine configuradas');
}

/**
 * Obtener issues de Redmine por proyecto
 * @param {Object} options - Opciones de búsqueda
 * @param {string} options.project_id - ID del proyecto (ej: 'ut-bancor')
 * @param {string} options.status_id - ID del estado ('*' para todos, '8' para específico)
 * @param {number} options.limit - Límite de resultados (max recomendado: 100 por request)
 * @param {string} options.tracker_id - ID del tracker (opcional, ej: '10' para Epic)
 * @returns {Promise<Object>} - Datos de Redmine
 */
async function obtenerIssues(options = {}) {
    validarCredenciales();

    const {
        project_id = 'ut-bancor',
        status_id = '*',
        limit = 15,
        tracker_id = null, // Opcional: si no se especifica, no filtra por tracker
        offset = 0
    } = options;

    try {
        const params = new URLSearchParams({
            project_id,
            status_id,
            limit: limit.toString(),
            offset: offset.toString(),
            key: REDMINE_TOKEN
        });

        // Solo agregar tracker_id si se especifica explícitamente
        if (tracker_id) {
            params.set('tracker_id', tracker_id);
        }

        const url = `${REDMINE_URL}/issues.json?${params.toString()}`;
        
        // Log sin exponer el token (ocultar key)
        const urlLog = url.replace(/key=[^&]+/, 'key=***');
        console.log(`🔍 Consultando Redmine: ${urlLog}`);
        console.log(`   Proyecto: ${project_id}, Estado: ${status_id}, Límite: ${limit}${tracker_id ? `, Tracker: ${tracker_id}` : ''}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Catalogo-NodeJS/1.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status);
            console.error('📄 Respuesta:', errorText.substring(0, 500));
            
            // Si es error 500 y tenemos tracker_id, podría ser que el tracker no existe
            if (response.status === 500 && tracker_id) {
                console.error(`⚠️ Posible causa: tracker_id=${tracker_id} no existe o no es válido para este proyecto`);
            }
            
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log(`✅ Issues obtenidos: ${data.total_count || data.issues?.length || 0}`);
        
        return data;
    } catch (error) {
        console.error('❌ Error al obtener issues de Redmine:', error.message);
        throw error;
    }
}

/**
 * Obtener todos los issues de un proyecto (con paginación automática)
 * @param {string} project_id - ID del proyecto
 * @param {string} tracker_id - ID del tracker (opcional)
 * @param {number} maxTotal - Límite máximo de issues a obtener (null = sin límite)
 * @returns {Promise<Array>} - Array de todos los issues (limitado por maxTotal)
 */
async function obtenerTodosLosIssues(project_id = 'ut-bancor', tracker_id = null, maxTotal = null) {
    // Usar el límite por request desde la variable de entorno o default
    const limitPorRequest = parseInt(process.env.REDMINE_LIMIT_PER_REQUEST) || 100;
    let offset = 0;
    let allIssues = [];
    let hasMore = true;

    console.log(`📥 Obteniendo issues del proyecto: ${project_id}`);
    if (maxTotal) {
        console.log(`   ⚠️ Modo prueba: limitado a ${maxTotal} issues`);
    }

    while (hasMore) {
        // Si hay límite máximo y ya alcanzamos el límite, detener
        if (maxTotal && allIssues.length >= maxTotal) {
            console.log(`   ⚠️ Límite alcanzado: ${maxTotal} issues`);
            break;
        }

        // Calcular cuántos issues pedir en este request
        let limitActual = limitPorRequest;
        if (maxTotal) {
            const restantes = maxTotal - allIssues.length;
            if (restantes < limitPorRequest) {
                limitActual = restantes;
            }
        }

        const data = await obtenerIssues({
            project_id,
            status_id: '*',
            limit: limitActual,
            offset,
            tracker_id
        });

        const issues = data.issues || [];
        allIssues = allIssues.concat(issues);

        console.log(`   Página ${Math.floor(offset / limitPorRequest) + 1}: ${issues.length} issues (total: ${allIssues.length}${maxTotal ? `/${maxTotal}` : ''})`);

        // Verificar si hay más resultados
        hasMore = data.total_count > (offset + limitActual);
        offset += limitActual;

        // Si alcanzamos el límite máximo, detener
        if (maxTotal && allIssues.length >= maxTotal) {
            break;
        }

        // Pausa de 200ms entre requests para no saturar el servidor
        if (hasMore && (!maxTotal || allIssues.length < maxTotal)) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    // Limitar el array final por si acaso
    if (maxTotal && allIssues.length > maxTotal) {
        allIssues = allIssues.slice(0, maxTotal);
    }

    console.log(`✅ Total de issues obtenidos: ${allIssues.length}${maxTotal ? ` (limitado a ${maxTotal})` : ''}`);
    return allIssues;
}

/**
 * Extraer valor de custom field
 * @param {Array} customFields - Array de custom fields
 * @param {string} fieldName - Nombre del campo
 * @returns {string|null} - Valor del campo o null
 */
function extraerCustomField(customFields, fieldName) {
    if (!Array.isArray(customFields)) return null;
    const field = customFields.find(cf => cf.name === fieldName);
    return field?.value || null;
}

/**
 * Parsear sponsor: extraer solo la parte antes del "|"
 * Ejemplo: "UT Bancor | Mantenimiento" -> "Bancor"
 * @param {string} proyecto - Nombre completo del proyecto
 * @returns {string} - Sponsor parseado
 */
function parsearSponsor(proyecto) {
    if (!proyecto) return 'Sin proyecto';
    
    // Si contiene "|", tomar la parte antes del "|"
    if (proyecto.includes('|')) {
        const parte = proyecto.split('|')[0].trim();
        // Remover "UT " si existe al inicio
        return parte.replace(/^UT\s+/i, '').trim() || parte.trim();
    }
    
    // Si no contiene "|", remover "UT " si existe
    return proyecto.replace(/^UT\s+/i, '').trim() || proyecto.trim();
}

/**
 * Mapear issue de Redmine a formato SIMPLIFICADO (solo datos no editables)
 * @param {Object} issue - Issue de Redmine
 * @returns {Object} - Datos mapeados (solo lo esencial)
 */
function mapearIssue(issue) {
    const proyectoCompleto = issue.project?.name || 'Sin proyecto';
    
    return {
        // ID del issue (único e inmutable)
        redmine_id: issue.id,
        
        // Datos básicos de Redmine (no editables)
        titulo: issue.subject || 'Sin título',
        proyecto: parsearSponsor(proyectoCompleto), // Sponsor parseado
        fecha_creacion: issue.created_on || null
    };
}

/**
 * Obtener issues mapeados listos para insertar en la base de datos
 * @param {string} project_id - ID del proyecto
 * @param {string} tracker_id - ID del tracker (opcional, ej: '10' para Epic)
 * @param {number} maxTotal - Límite máximo de issues a obtener (null = sin límite)
 * @returns {Promise<Array>} - Array de issues mapeados
 */
async function obtenerIssuesMapeados(project_id = 'ut-bancor', tracker_id = null, maxTotal = null) {
    try {
        // Si hay variable de entorno REDMINE_SYNC_LIMIT, usarla
        const limitFromEnv = process.env.REDMINE_SYNC_LIMIT ? parseInt(process.env.REDMINE_SYNC_LIMIT) : null;
        const limitFinal = maxTotal || limitFromEnv;
        
        const issues = await obtenerTodosLosIssues(project_id, tracker_id, limitFinal);
        const issuesMapeados = issues.map(mapearIssue);
        
        console.log(`✅ Issues mapeados: ${issuesMapeados.length}`);
        
        return issuesMapeados;
    } catch (error) {
        console.error('❌ Error al mapear issues:', error.message);
        throw error;
    }
}

/**
 * Probar conexión con Redmine
 * @returns {Promise<boolean>} - true si la conexión es exitosa
 */
async function probarConexion() {
    try {
        validarCredenciales();
        
        console.log('🔄 Probando conexión con Redmine...');
        
        const data = await obtenerIssues({
            project_id: 'ut-bancor',
            limit: 1
        });
        
        console.log('✅ Conexión exitosa con Redmine');
        console.log(`   Total de issues en proyecto: ${data.total_count || 0}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error de conexión con Redmine:', error.message);
        return false;
    }
}

module.exports = {
    obtenerIssues,
    obtenerTodosLosIssues,
    obtenerIssuesMapeados,
    mapearIssue,
    probarConexion
};
