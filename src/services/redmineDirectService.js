// Servicio para consumir API de Redmine directamente
// ⚠️ SOLO PARA CONSULTAS (READ-ONLY) - NUNCA EDITAR/INSERTAR

const REDMINE_URL = process.env.REDMINE_URL;
const REDMINE_TOKEN = process.env.REDMINE_TOKEN; // API Key de Redmine

// Configuración para sincronización de proyectos (catálogo)
const REDMINE_PROJECTS_MAX_LIMIT = 100;
const REDMINE_PROJECT_PRODUCT_FILTER = process.env.REDMINE_PROJECT_PRODUCT_FILTER || 'Unitrade';
const REDMINE_PROJECT_CATALOG_FILTER = process.env.REDMINE_PROJECT_CATALOG_FILTER || '1';
const REDMINE_CUSTOM_FIELD_CLIENTE_ID = parseInt(process.env.REDMINE_CUSTOM_FIELD_CLIENTE_ID || '20', 10);
const REDMINE_CUSTOM_FIELD_SPONSOR_ID = parseInt(process.env.REDMINE_CUSTOM_FIELD_SPONSOR_ID || '94', 10);
const REDMINE_CUSTOM_FIELD_REVENTA_ID = parseInt(process.env.REDMINE_CUSTOM_FIELD_REVENTA_ID || '93', 10);

/**
 * Validar que las credenciales están configuradas
 */
function validarCredenciales() {
    if (!REDMINE_URL) {
        throw new Error('❌ REDMINE_URL no está configurado en las variables de entorno');
    }
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

    // Si project_id es null o undefined, usar el valor por defecto
    const project_id = options.project_id || process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor';
    const status_id = options.status_id || '*';
    const limit = options.limit || 15;
    const tracker_id = options.tracker_id || null; // Opcional: si no se especifica, no filtra por tracker
    const offset = options.offset || 0;

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
async function obtenerTodosLosIssues(project_id = null, tracker_id = null, maxTotal = null) {
    // Si project_id es null o undefined, usar el valor por defecto
    project_id = project_id || process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor';
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
function extraerCustomField(customFields, fieldKey) {
    if (!Array.isArray(customFields)) return null;
    const field = customFields.find(cf => cf.name === fieldKey || cf.id === fieldKey);
    return field?.value ?? null;
}

/**
 * Mapear issue de Redmine a formato SIMPLIFICADO (solo datos no editables)
 * @param {Object} issue - Issue de Redmine
 * @returns {Object} - Datos mapeados (solo lo esencial)
 */
function mapearIssue(issue) {
    const proyectoCompleto = issue.project?.name || null;
    const titulo = issue.subject || 'Sin título';
    
    // Truncar cliente desde titulo (no desde proyecto_completo)
    // Ejemplos:
    // "UT BH | Liquidación automática" -> "UT BH"
    // "UT Petersen | Alta de cuentas comitentes vía APÍ- Sistema Nasdaq/Caja de Valores" -> "UT Petersen"
    let cliente = null;
    if (titulo && typeof titulo === 'string') {
        const tituloTrimmed = titulo.trim();
        if (tituloTrimmed.includes('|')) {
            const partes = tituloTrimmed.split('|');
            if (partes.length > 0 && partes[0].trim()) {
                cliente = partes[0].trim();
            }
        } else if (tituloTrimmed) {
            // Si no tiene "|", usar el título completo (limitado a 255 caracteres)
            cliente = tituloTrimmed.substring(0, 255);
        }
    }
    
    // Log para debug si el cliente sigue siendo null después del mapeo
    if (!cliente && titulo && titulo !== 'Sin título') {
        console.log(`⚠️ No se pudo extraer cliente del título: "${titulo}"`);
    }
    
    // Extraer custom fields
    const customFields = issue.custom_fields || [];
    const fechaRealFinalizacion = customFields.find(cf => cf.id === 15)?.value || null;
    
    return {
        // ID del issue (único e inmutable)
        redmine_id: issue.id,
        
        // Datos básicos de Redmine (no editables)
        titulo: titulo,
        descripcion: issue.description || null,
        proyecto_completo: proyectoCompleto,
        cliente: cliente, // Cliente truncado desde titulo
        fecha_creacion: issue.created_on || null,
        fecha_real_finalizacion: fechaRealFinalizacion,
        total_spent_hours: issue.total_spent_hours || null
    };
}

/**
 * Mapear issue de Redmine para Proyectos Internos
 * @param {Object} issue - Issue de Redmine
 * @returns {Object} - Datos mapeados para proyectos internos
 */
function mapearIssueProyectosInternos(issue) {
    const proyectoCompleto = issue.project?.name || null;
    
    // Extraer custom fields
    const customFields = issue.custom_fields || [];
    const fechaRealFinalizacion = customFields.find(cf => cf.id === 15)?.value || null;
    // Services-ID desde custom field 23
    const servicesId = customFields.find(cf => cf.id === 23)?.value || null;
    
    // Estado Redmine desde status.name
    const estadoRedmine = issue.status?.name || null;
    
    return {
        // ID del issue (único e inmutable)
        redmine_id: issue.id,
        
        // Datos básicos de Redmine (no editables)
        titulo: issue.subject || 'Sin título',
        proyecto_completo: proyectoCompleto,
        fecha_creacion: issue.created_on || null,
        fecha_real_finalizacion: fechaRealFinalizacion,
        total_spent_hours: issue.total_spent_hours || null,
        services_id: servicesId, // Custom field 23 (Services-ID)
        estado_redmine: estadoRedmine // Status.name
    };
}

/**
 * Mapear issue de Redmine para Requerimientos de Clientes
 * @param {Object} issue - Issue de Redmine
 * @returns {Object} - Datos mapeados para requerimientos de clientes
 */
function mapearIssueReqClientes(issue) {
    const proyectoCompleto = issue.project?.name || null;
    
    // Extraer custom fields
    const customFields = issue.custom_fields || [];
    const fechaRealFinalizacion = customFields.find(cf => cf.id === 15)?.value || null;
    
    // Extraer cf_91 (Es Reventa) - normalizar valores vacíos a null y convertir 0/1 a "No"/"Si"
    const cf91Raw = customFields.find(cf => cf.id === 91)?.value;
    let cf91 = null;
    if (cf91Raw !== undefined && cf91Raw !== null && cf91Raw !== '') {
        const valor = String(cf91Raw).trim();
        // Convertir 0/1 a "No"/"Si"
        if (valor === '0') {
            cf91 = 'No';
        } else if (valor === '1') {
            cf91 = 'Si';
        } else {
            cf91 = valor; // Mantener otros valores como están
        }
    }
    
    // Extraer cf_92 (Proyecto Sponsor) - normalizar valores vacíos a null
    const cf92Raw = customFields.find(cf => cf.id === 92)?.value;
    const cf92 = (cf92Raw !== undefined && cf92Raw !== null && cf92Raw !== '') ? String(cf92Raw) : null;
    
    // Log para depuración si hay valores
    if (cf91 || cf92) {
        console.log(`   📋 Issue ${issue.id}: cf_91="${cf91}", cf_92="${cf92}"`);
    }
    
    // Estado Redmine desde status.name
    const estadoRedmine = issue.status?.name || null;
    
    // Limpiar título: eliminar prefijos comunes si existen
    let titulo = issue.subject || 'Sin título';
    const prefijos = [
        'Análisis de alto nivel para: ',
        'Análisis de Factibilidad para: '
    ];
    for (const prefijo of prefijos) {
        if (titulo.startsWith(prefijo)) {
            titulo = titulo.substring(prefijo.length).trim();
            break; // Solo eliminar el primer prefijo que coincida
        }
    }
    
    // Truncar cliente desde proyecto_completo
    // Ejemplo: "UT Mercap | Mantenimiento" -> "UT Mercap"
    let cliente = null;
    if (proyectoCompleto) {
        const partes = proyectoCompleto.split('|');
        if (partes.length > 0) {
            cliente = partes[0].trim();
        } else {
            cliente = proyectoCompleto.substring(0, 255); // Limitar a 255 caracteres
        }
    }
    
    // Extraer ID del epic (parent)
    const idEpic = issue.parent?.id || null;
    
    return {
        // ID del issue (único e inmutable)
        redmine_id: issue.id,
        
        // Datos básicos de Redmine (no editables)
        titulo: titulo,
        descripcion: issue.description || null, // Descripción desde Redmine
        proyecto_completo: proyectoCompleto, // Proyecto completo (en lugar de Services ID)
        cliente: cliente, // Cliente truncado
        fecha_creacion: issue.created_on || null,
        fecha_real_finalizacion: fechaRealFinalizacion,
        total_spent_hours: issue.total_spent_hours || null,
        estado_redmine: estadoRedmine, // Status.name
        cf_91: cf91, // Es Reventa (normalizado a "No"/"Si")
        cf_92: cf92, // Proyecto Sponsor
        id_epic: idEpic // ID del epic (parent)
    };
}

/**
 * Normalizar valor de reventa (cf_93)
 */
function normalizarReventa(valor) {
    if (valor === null || typeof valor === 'undefined') return null;
    const texto = String(valor).trim();
    if (texto === '') return null;
    if (texto === '1' || texto.toLowerCase() === 'si') return 'Si';
    if (texto === '0' || texto.toLowerCase() === 'no') return 'No';
    return texto;
}

/**
 * Mapear proyecto Redmine -> registro redmine_funcionalidades (catálogo)
 */
function mapearProyecto(proyecto) {
    const customFields = proyecto.custom_fields || [];
    const reventa = extraerCustomField(customFields, REDMINE_CUSTOM_FIELD_REVENTA_ID) || extraerCustomField(customFields, 'Es Reventa');
    
    const titulo = proyecto.name || 'Sin título';
    
    // Truncar cliente desde titulo (nombre del proyecto)
    // Ejemplos:
    // "UT BH | Liquidación automática" -> "UT BH"
    // "UT Petersen | Alta de cuentas comitentes vía APÍ- Sistema Nasdaq/Caja de Valores" -> "UT Petersen"
    let cliente = null;
    if (titulo && typeof titulo === 'string') {
        const tituloTrimmed = titulo.trim();
        if (tituloTrimmed.includes('|')) {
            const partes = tituloTrimmed.split('|');
            if (partes.length > 0 && partes[0].trim()) {
                cliente = partes[0].trim();
            }
        } else if (tituloTrimmed) {
            // Si no tiene "|", usar el título completo (limitado a 255 caracteres)
            cliente = tituloTrimmed.substring(0, 255);
        }
    }

    return {
        redmine_id: proyecto.identifier || proyecto.id?.toString(),
        titulo: titulo,
        cliente: cliente, // Cliente truncado desde titulo (se usa como sponsor)
        fecha_creacion: proyecto.created_on || null,
        reventa: normalizarReventa(reventa),
        total_spent_hours: null // No aplica para proyectos
    };
}

/**
 * Obtener proyectos desde Redmine aplicando filtros por custom fields
 */
async function obtenerProyectos(options = {}) {
    validarCredenciales();

    const limitSolicitado = options.limit ? parseInt(options.limit, 10) : null;
    const limit = Math.min(limitSolicitado || REDMINE_PROJECTS_MAX_LIMIT, REDMINE_PROJECTS_MAX_LIMIT);
    const offset = options.offset ? Math.max(parseInt(options.offset, 10) || 0, 0) : 0;
    const producto = options.producto || REDMINE_PROJECT_PRODUCT_FILTER;
    const catalogo = options.catalogo || REDMINE_PROJECT_CATALOG_FILTER;

    const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        key: REDMINE_TOKEN
    });

    if (producto) {
        params.set('cf_19', producto);
    }
    if (catalogo) {
        params.set('cf_95', catalogo);
    }

    const baseUrl = REDMINE_URL.replace(/\/+$/, '');
    const url = `${baseUrl}/projects.json?${params.toString()}`;
    const urlLog = url.replace(/key=[^&]+/, 'key=***');
    console.log(`🔍 Consultando proyectos de Redmine: ${urlLog}`);

    try {
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
            console.error('❌ Error HTTP en proyectos:', response.status);
            console.error('📄 Respuesta:', errorText.substring(0, 500));
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Proyectos obtenidos: ${data.projects?.length || 0} (total Redmine: ${data.total_count || data.projects?.length || 0})`);
        return data;
    } catch (error) {
        console.error('❌ Error al obtener proyectos de Redmine:', error.message);
        throw error;
    }
}

/**
 * Obtener proyectos mapeados listos para sincronizar con redmine_funcionalidades
 */
async function obtenerProyectosMapeados(options = {}) {
    const maxTotalSolicitado = options.limit ? parseInt(options.limit, 10) : null;
    const tope = Math.min(maxTotalSolicitado || REDMINE_PROJECTS_MAX_LIMIT, REDMINE_PROJECTS_MAX_LIMIT);
    const proyectos = [];
    let offset = 0;
    let hasMore = true;

    console.log('📥 Obteniendo proyectos de Redmine (modo catálogo)...');

    while (hasMore && proyectos.length < tope) {
        const restantes = tope - proyectos.length;
        const limitActual = Math.min(restantes, REDMINE_PROJECTS_MAX_LIMIT);
        const data = await obtenerProyectos({
            ...options,
            limit: limitActual,
            offset
        });
        const items = data.projects || [];
        proyectos.push(...items);

        const totalCount = data.total_count || items.length;
        hasMore = totalCount > (offset + limitActual);
        offset += limitActual;

        if (!hasMore) {
            break;
        }
    }

    const proyectosLimitados = proyectos.slice(0, tope);
    console.log(`✅ Proyectos preparados: ${proyectosLimitados.length}`);
    return proyectosLimitados.map(mapearProyecto);
}

/**
 * Obtener issues mapeados listos para insertar en la base de datos
 * @param {string} project_id - ID del proyecto
 * @param {string} tracker_id - ID del tracker (opcional, ej: '10' para Epic)
 * @param {number} maxTotal - Límite máximo de issues a obtener (null = sin límite)
 * @returns {Promise<Array>} - Array de issues mapeados
 */
async function obtenerIssuesMapeados(project_id = null, tracker_id = null, maxTotal = null) {
    // Si project_id es null o undefined, usar el valor por defecto
    project_id = project_id || process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor';
    try {
        // Si hay variable de entorno REDMINE_SYNC_LIMIT, usarla
        const limitFromEnv = process.env.REDMINE_SYNC_LIMIT ? parseInt(process.env.REDMINE_SYNC_LIMIT) : null;
        const limitFinal = maxTotal || limitFromEnv;

        // Log de filtros utilizados
        console.log('📋 Filtros aplicados en la consulta a Redmine:');
        console.log(`   - Project ID: ${project_id}`);
        console.log(`   - Tracker ID: ${tracker_id || 'todos'}`);
        console.log(`   - Límite: ${limitFinal || 'sin límite'}`);
        
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
 * Obtener issues a partir de IDs específicos
 * @param {Array<string|number>} issueIds - Lista de IDs de Redmine
 * @param {string|null} tracker_id - Tracker opcional
 * @param {number|null} limit - Límite de resultados
 */
async function obtenerIssuesPorIds(issueIds = [], tracker_id = null, limit = 100) {
    validarCredenciales();

    const ids = Array.isArray(issueIds) ? issueIds.filter(Boolean) : [];
    if (ids.length === 0) {
        throw new Error('Debe proporcionar al menos un issue_id para sincronizar proyectos internos');
    }

    const limitSeguro = Math.min(limit || 100, 100);
    const params = new URLSearchParams({
        issue_id: ids.join(','),
        limit: limitSeguro.toString(),
        key: REDMINE_TOKEN
    });

    if (tracker_id) {
        params.set('tracker_id', tracker_id);
    }

    const baseUrl = REDMINE_URL.replace(/\/+$/, '');
    const url = `${baseUrl}/issues.json?${params.toString()}`;
    const urlLog = url.replace(/key=[^&]+/, 'key=***');
    console.log(`🔍 Consultando Redmine por issue_id: ${urlLog}`);

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
        console.error('❌ Error HTTP en issues por ID:', response.status);
        console.error('📄 Respuesta:', errorText.substring(0, 500));
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const issues = data.issues || [];
    console.log(`✅ Issues obtenidos por ID: ${issues.length}`);
    return issues.map(mapearIssue);
}

/**
 * Obtener issues filtrando por proyecto y custom field (Proyectos Internos)
 * @param {Object} options
 * @param {string} options.project_id - ID o identifier del proyecto (default ut-mercap)
 * @param {string} options.tracker_id - Tracker ID (default 19)
 * @param {string} options.cf_23 - Valor del custom field 23 (default *)
 * @param {number} options.limit - Límite (max 100)
 * @param {string} options.status_id - Estado (default *)
 */
async function obtenerIssuesProyectosInternos(options = {}) {
    validarCredenciales();

    const projectId = options.project_id || process.env.REDMINE_INTERNAL_PROJECT || 'ut-mercap';
    const trackerId = options.tracker_id || process.env.REDMINE_INTERNAL_TRACKER || process.env.REDMINE_DEFAULT_TRACKER || '19';
    const cf23 = typeof options.cf_23 !== 'undefined' ? options.cf_23 : (process.env.REDMINE_INTERNAL_CF23 || '*');
    const limit = Math.min(options.limit || 100, 100);
    const statusId = options.status_id || '*';

    const params = new URLSearchParams({
        project_id: projectId,
        tracker_id: trackerId,
        status_id: statusId,
        limit: limit.toString(),
        key: REDMINE_TOKEN
    });

    if (cf23 !== null && typeof cf23 !== 'undefined') {
        params.set('cf_23', cf23);
    }

    const baseUrl = REDMINE_URL.replace(/\/+$/, '');
    const url = `${baseUrl}/issues.json?${params.toString()}`;
    const urlLog = url.replace(/key=[^&]+/, 'key=***');
    console.log(`🔍 Consultando Redmine (proyectos internos): ${urlLog}`);

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
        console.error('❌ Error HTTP en proyectos internos:', response.status);
        console.error('📄 Respuesta:', errorText.substring(0, 500));
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const issues = data.issues || [];
    console.log(`✅ Issues obtenidos (proyectos internos): ${issues.length}`);
    return issues.map(mapearIssueProyectosInternos);
}

/**
 * Obtener issues filtrando por proyecto y tracker (Requerimientos de Clientes)
 * ⚠️ SOLO PARA CONSULTAS (READ-ONLY)
 * @param {Object} options
 * @param {string} options.project_id - ID o identifier del proyecto (default 'ut')
 * @param {string} options.tracker_id - Tracker ID (default 29)
 * @param {string} options.status_id - Estado (default '*')
 * @param {number} options.limit - Límite (max 100)
 */
async function obtenerIssuesReqClientes(options = {}) {
    validarCredenciales();

    const projectId = options.project_id || 'ut';
    const trackerId = options.tracker_id || '29';
    const statusId = options.status_id || '*';
    const limit = Math.min(options.limit || 100, 100);

    const params = new URLSearchParams({
        project_id: projectId,
        tracker_id: trackerId,
        status_id: statusId,
        limit: limit.toString(),
        key: REDMINE_TOKEN
    });

    const baseUrl = REDMINE_URL.replace(/\/+$/, '');
    const url = `${baseUrl}/issues.json?${params.toString()}`;
    const urlLog = url.replace(/key=[^&]+/, 'key=***');
    console.log(`🔍 Consultando Redmine (requerimientos clientes): ${urlLog}`);
    console.log(`   Parámetros: project_id=${projectId}, tracker_id=${trackerId}, status_id=${statusId || 'todos'}, limit=${limit}`);
    console.log(`   ⚠️ SOLO CONSULTA - No se realizan modificaciones`);

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
        console.error('❌ Error HTTP en requerimientos clientes:', response.status);
        console.error('📄 Respuesta:', errorText.substring(0, 500));
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const issues = data.issues || [];
    console.log(`✅ Issues obtenidos (requerimientos clientes): ${issues.length}`);
    return issues.map(mapearIssueReqClientes);
}

/**
 * Obtener project_id de Redmine por nombre del proyecto
 * @param {string} projectName - Nombre del proyecto (ej: "UT Mercap | Proyecto Genérico")
 * @returns {Promise<string|null>} - ID del proyecto (identifier) o null si no se encuentra
 */
async function obtenerProjectIdPorNombre(projectName) {
    validarCredenciales();
    
    try {
        const limitPorRequest = 100;
        let offset = 0;
        let allProjects = [];
        let hasMore = true;
        
        console.log(`🔍 Buscando proyecto por nombre: "${projectName}"`);
        
        // Buscar en todas las páginas si es necesario
        while (hasMore) {
            const params = new URLSearchParams({
                limit: limitPorRequest.toString(),
                offset: offset.toString(),
                key: REDMINE_TOKEN
            });
            
            const url = `${REDMINE_URL}/projects.json?${params.toString()}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Catalogo-NodeJS/1.0'
                }
            });
            
            if (!response.ok) {
                console.error(`❌ Error al buscar proyecto: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            const projects = data.projects || [];
            allProjects = allProjects.concat(projects);
            
            console.log(`   Página ${Math.floor(offset / limitPorRequest) + 1}: ${projects.length} proyectos (total: ${allProjects.length})`);
            
            // Buscar coincidencia exacta por nombre
            const projectExacto = projects.find(p => p.name === projectName);
            if (projectExacto) {
                console.log(`✅ Proyecto encontrado (coincidencia exacta): ${projectExacto.identifier} (ID: ${projectExacto.id}, Name: ${projectExacto.name})`);
                return projectExacto.identifier;
            }
            
            // Buscar coincidencia parcial (case-insensitive, contiene el texto)
            const projectParcial = projects.find(p => 
                p.name.toLowerCase().includes(projectName.toLowerCase()) ||
                projectName.toLowerCase().includes(p.name.toLowerCase())
            );
            if (projectParcial) {
                console.log(`✅ Proyecto encontrado (coincidencia parcial): ${projectParcial.identifier} (ID: ${projectParcial.id}, Name: ${projectParcial.name})`);
                console.log(`   ⚠️ Coincidencia parcial - verifica que sea el proyecto correcto`);
                return projectParcial.identifier;
            }
            
            hasMore = data.total_count > (offset + limitPorRequest);
            offset += limitPorRequest;
            
            // Pausa entre requests
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        // Si no se encontró, mostrar algunos proyectos similares para debugging
        console.log(`⚠️ Proyecto "${projectName}" no encontrado en ${allProjects.length} proyectos`);
        
        // Buscar proyectos que contengan palabras clave
        const palabrasClave = projectName.toLowerCase().split(/\s+/).filter(p => p.length > 2);
        const proyectosSimilares = allProjects.filter(p => {
            const nombreLower = p.name.toLowerCase();
            return palabrasClave.some(palabra => nombreLower.includes(palabra));
        });
        
        if (proyectosSimilares.length > 0) {
            console.log(`\n💡 Proyectos similares encontrados (${proyectosSimilares.length}):`);
            proyectosSimilares.slice(0, 10).forEach(p => {
                console.log(`   - "${p.name}" (identifier: ${p.identifier}, id: ${p.id})`);
            });
        }
        
        return null;
    } catch (error) {
        console.error('❌ Error al buscar proyecto por nombre:', error.message);
        return null;
    }
}

/**
 * Obtener issues de un proyecto por nombre (filtrando por project.name en la respuesta)
 * Útil cuando no se conoce el project_id pero sí el nombre del proyecto
 * @param {string} projectName - Nombre del proyecto (ej: "UT Mercap | Proyecto Genérico")
 * @param {string} tracker_id - ID del tracker (opcional)
 * @param {number} maxTotal - Límite máximo de issues (null = sin límite)
 * @returns {Promise<Array>} - Array de issues del proyecto
 */
async function obtenerIssuesPorNombreProyecto(projectName, tracker_id = null, maxTotal = null) {
    validarCredenciales();
    
    // Primero intentar obtener el project_id
    const projectId = await obtenerProjectIdPorNombre(projectName);
    
    if (!projectId) {
        // Si no se encuentra por identifier, obtener todos y filtrar por nombre
        console.log(`⚠️ No se encontró project_id, filtrando issues por project.name...`);
        
        const limitPorRequest = parseInt(process.env.REDMINE_LIMIT_PER_REQUEST) || 100;
        let offset = 0;
        let allIssues = [];
        let hasMore = true;
        
        // Obtener issues sin filtro de proyecto (o con un proyecto amplio)
        // Nota: Esto puede ser ineficiente si hay muchos proyectos
        while (hasMore && (!maxTotal || allIssues.length < maxTotal)) {
            const limitActual = maxTotal ? Math.min(limitPorRequest, maxTotal - allIssues.length) : limitPorRequest;
            
            const params = new URLSearchParams({
                status_id: '*',
                limit: limitActual.toString(),
                offset: offset.toString(),
                key: REDMINE_TOKEN
            });
            
            if (tracker_id) {
                params.set('tracker_id', tracker_id);
            }
            
            const url = `${REDMINE_URL}/issues.json?${params.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Catalogo-NodeJS/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const issues = data.issues || [];
            
            // Filtrar por nombre del proyecto
            const filteredIssues = issues.filter(issue => 
                issue.project?.name === projectName
            );
            
            allIssues = allIssues.concat(filteredIssues);
            
            console.log(`   Página ${Math.floor(offset / limitPorRequest) + 1}: ${filteredIssues.length} issues del proyecto "${projectName}" (total: ${allIssues.length}${maxTotal ? `/${maxTotal}` : ''})`);
            
            hasMore = data.total_count > (offset + limitActual);
            offset += limitActual;
            
            if (maxTotal && allIssues.length >= maxTotal) {
                break;
            }
            
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        if (maxTotal && allIssues.length > maxTotal) {
            allIssues = allIssues.slice(0, maxTotal);
        }
        
        console.log(`✅ Total de issues obtenidos del proyecto "${projectName}": ${allIssues.length}`);
        return allIssues;
    }
    
    // Si se encontró el project_id, usar el método normal
    const issues = await obtenerTodosLosIssues(projectId, tracker_id, maxTotal);
    
    return issues;
}

/**
 * Obtener issues mapeados de un proyecto por nombre
 * @param {string} projectName - Nombre del proyecto (ej: "UT Mercap | Proyecto Genérico")
 * @param {string} tracker_id - ID del tracker (opcional)
 * @param {number} maxTotal - Límite máximo de issues (null = sin límite)
 * @returns {Promise<Array>} - Array de issues mapeados
 */
async function obtenerIssuesMapeadosPorNombreProyecto(projectName, tracker_id = null, maxTotal = null) {
    try {
        const limitFromEnv = process.env.REDMINE_SYNC_LIMIT ? parseInt(process.env.REDMINE_SYNC_LIMIT) : null;
        const limitFinal = maxTotal || limitFromEnv;
        
        const issues = await obtenerIssuesPorNombreProyecto(projectName, tracker_id, limitFinal);
        const issuesMapeados = issues.map(mapearIssue);
        
        console.log(`✅ Issues mapeados del proyecto "${projectName}": ${issuesMapeados.length}`);
        
        return issuesMapeados;
    } catch (error) {
        console.error(`❌ Error al mapear issues del proyecto "${projectName}":`, error.message);
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
            project_id: process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor',
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

/**
 * Listar todos los proyectos disponibles en Redmine
 * Útil para encontrar el nombre exacto o identifier de un proyecto
 * @param {number} limit - Límite de proyectos a obtener (null = todos)
 * @returns {Promise<Array>} - Array de proyectos con {id, identifier, name}
 */
async function listarProyectos(limit = null) {
    validarCredenciales();
    
    try {
        const limitPorRequest = 100;
        let offset = 0;
        let allProjects = [];
        let hasMore = true;
        
        console.log('📋 Listando proyectos de Redmine...');
        
        while (hasMore && (!limit || allProjects.length < limit)) {
            const params = new URLSearchParams({
                limit: limitPorRequest.toString(),
                offset: offset.toString(),
                key: REDMINE_TOKEN
            });
            
            const url = `${REDMINE_URL}/projects.json?${params.toString()}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Catalogo-NodeJS/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const projects = data.projects || [];
            allProjects = allProjects.concat(projects);
            
            hasMore = data.total_count > (offset + limitPorRequest);
            offset += limitPorRequest;
            
            if (hasMore && (!limit || allProjects.length < limit)) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        if (limit && allProjects.length > limit) {
            allProjects = allProjects.slice(0, limit);
        }
        
        console.log(`✅ ${allProjects.length} proyectos encontrados`);
        return allProjects.map(p => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name
        }));
    } catch (error) {
        console.error('❌ Error al listar proyectos:', error.message);
        throw error;
    }
}

module.exports = {
    obtenerIssues,
    obtenerTodosLosIssues,
    obtenerIssuesMapeados,
    obtenerIssuesPorIds,
    obtenerIssuesProyectosInternos,
    obtenerIssuesReqClientes,
    obtenerProjectIdPorNombre,
    obtenerIssuesPorNombreProyecto,
    obtenerIssuesMapeadosPorNombreProyecto,
    listarProyectos,
    mapearIssue,
    mapearIssueProyectosInternos,
    mapearIssueReqClientes,
    probarConexion,
    obtenerProyectos,
    obtenerProyectosMapeados,
    mapearProyecto
};
