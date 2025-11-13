// Rutas para sincronización con Redmine
const express = require('express');
const router = express.Router();
const redmineService = require('../services/redmineDirectService');
const sincronizacionService = require('../services/sincronizacionService');
const { requireAdmin } = require('../middleware/authJWT');

/**
 * GET /api/redmine/test
 * Probar conexión con Redmine
 */
router.get('/test', async (req, res) => {
    try {
        const resultado = await redmineService.probarConexion();
        
        res.json({
            success: resultado,
            message: resultado ? 'Conexión exitosa con Redmine' : 'Error de conexión con Redmine'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/redmine/issues
 * Obtener issues de Redmine (sin guardar en BD)
 */
router.get('/issues', async (req, res) => {
    try {
        const { project_id = process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor', tracker_id = null, limit = 10 } = req.query;
        
        const data = await redmineService.obtenerIssues({
            project_id,
            tracker_id,
            limit: parseInt(limit)
        });
        
        res.json({
            success: true,
            ...data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/redmine/sincronizar
 * Sincronizar issues de Redmine con la base de datos
 * ⚠️ Requiere permisos de administrador
 */
router.post('/sincronizar', requireAdmin, async (req, res) => {
    try {
        const { project_id = process.env.REDMINE_DEFAULT_PROJECT || 'ut-bancor', tracker_id = '19', max_total = null } = req.body;
        
        // Convertir max_total a número si viene como string
        const maxTotal = max_total ? parseInt(max_total) : null;
        
        console.log(`\n🔄 Iniciando sincronización manual: proyecto=${project_id}, tracker=${tracker_id || 'todos'}, límite=${maxTotal || 'sin límite'}`);
        
        // Intentar con tracker_id='19' (Epics), si falla intentar sin filtro
        let resultado;
        try {
            resultado = await sincronizacionService.sincronizarRedmine(project_id, tracker_id || '19', maxTotal);
        } catch (error) {
            if (tracker_id === '19' || tracker_id === null) {
                console.log('⚠️ Error al sincronizar con tracker_id=19, intentando sin filtro...');
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

