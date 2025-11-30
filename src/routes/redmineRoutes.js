// Rutas para sincronización con Redmine
const express = require('express');
const router = express.Router();
const redmineService = require('../services/redmineDirectService');
const sincronizacionService = require('../services/sincronizacionService');
const { requireAdmin } = require('../middleware/authJWT');

/**
 * POST /api/redmine/sincronizar
 * Sincronizar issues de Redmine con la base de datos
 * ⚠️ Requiere permisos de administrador
 */
router.post('/sincronizar', requireAdmin, async (req, res) => {
    try {
        // Si project_id es null o undefined, usar el valor por defecto de la variable de entorno
        const project_id = req.body.project_id || process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor';
        // Si tracker_id es null o undefined, usar el valor por defecto
        const tracker_id = req.body.tracker_id || process.env.REDMINE_DEFAULT_TRACKER || '19';
        const max_total = req.body.max_total;
        
        // Convertir max_total a número si viene como string
        const maxTotal = max_total ? parseInt(max_total) : null;
        
        // Considerar también REDMINE_SYNC_LIMIT de la variable de entorno para el log
        const limitFromEnv = process.env.REDMINE_SYNC_LIMIT ? parseInt(process.env.REDMINE_SYNC_LIMIT) : null;
        const limitFinal = maxTotal || limitFromEnv;
        
        console.log(`\n🔄 Iniciando sincronización manual: proyecto=${project_id}, tracker=${tracker_id || 'todos'}, límite=${limitFinal || 'sin límite'}`);
        
        // Intentar con tracker_id por defecto (Epics), si falla intentar sin filtro
        const defaultTracker = process.env.REDMINE_DEFAULT_TRACKER || '19';
        let resultado;
        try {
            resultado = await sincronizacionService.sincronizarRedmine(project_id, tracker_id || defaultTracker, maxTotal);
        } catch (error) {
            if (tracker_id === defaultTracker || !tracker_id) {
                console.log(`⚠️ Error al sincronizar con tracker_id=${defaultTracker}, intentando sin filtro...`);
                resultado = await sincronizacionService.sincronizarRedmine(project_id, null, maxTotal);
            } else {
                throw error;
            }
        }
        
        res.json(resultado);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/redmine/sincronizar-backlog
 * Alias para mantener compatibilidad (sincroniza proyectos internos)
 * ⚠️ Requiere permisos de administrador
 */
router.post('/sincronizar-backlog', requireAdmin, async (req, res) => {
    try {
        const { tracker_id = null, max_total = null, cf_23 = null } = req.body;
        
        // Convertir max_total a número si viene como string
        const maxTotal = max_total ? parseInt(max_total) : null;
        const cf23Filter = typeof cf_23 === 'string' && cf_23.length > 0 ? cf_23 : null;
        
        console.log(`\n🔄 Iniciando sincronización proyectos internos (alias backlog): tracker=${tracker_id || 'todos'}, límite=${maxTotal || '100'}, cf_23=${cf23Filter || '*'}`);
        
        const resultado = await sincronizacionService.sincronizarProyectosInternos(tracker_id, maxTotal, cf23Filter);
        
        res.json(resultado);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/redmine/sincronizar-proyectos-internos
 * Nueva ruta oficial para sincronizar proyectos internos
 * ⚠️ Requiere permisos de administrador
 */
router.post('/sincronizar-proyectos-internos', requireAdmin, async (req, res) => {
    try {
        const { tracker_id = null, max_total = null, cf_23 = null } = req.body;
        const maxTotal = max_total ? parseInt(max_total) : null;
        const cf23Filter = typeof cf_23 === 'string' && cf_23.length > 0 ? cf_23 : null;
        
        console.log(`\n🔄 Iniciando sincronización proyectos internos: tracker=${tracker_id || 'todos'}, límite=${maxTotal || '100'}, cf_23=${cf23Filter || '*'}`);
        
        const resultado = await sincronizacionService.sincronizarProyectosInternos(tracker_id, maxTotal, cf23Filter);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/redmine/sincronizar-req-clientes
 * Sincronizar requerimientos de clientes desde Redmine
 * ⚠️ Requiere permisos de administrador
 * ⚠️ SOLO CONSULTAS - No se realizan modificaciones en Redmine
 */
router.post('/sincronizar-req-clientes', requireAdmin, async (req, res) => {
    try {
        const { tracker_id = null, max_total = null } = req.body;
        const maxTotal = max_total ? parseInt(max_total) : null;
        
        console.log(`\n🔄 Iniciando sincronización requerimientos clientes: tracker=${tracker_id || '29'}, límite=${maxTotal || '100'}`);
        console.log(`   ⚠️ SOLO CONSULTA - No se realizan modificaciones en Redmine`);
        
        const resultado = await sincronizacionService.sincronizarReqClientes(tracker_id, maxTotal);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/redmine/estado
 * Obtener estado de la sincronización
 */
router.get('/estado', async (req, res) => {
    try {
        const estado = await sincronizacionService.obtenerEstadoSincronizacion();
        res.json(estado);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;

