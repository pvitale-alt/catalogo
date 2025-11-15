const express = require('express');
const router = express.Router();
const FuncionalidadModel = require('../models/FuncionalidadModel');
const ClienteModel = require('../models/ClienteModel');
const ScoreModel = require('../models/ScoreModel');
const MapaModel = require('../models/MapaModel');
const BacklogProyectosModel = require('../models/BacklogProyectosModel');
const ScoreBacklogModel = require('../models/ScoreBacklogModel');

/**
 * API de funcionalidades
 */
router.get('/funcionalidades', async (req, res) => {
    try {
        const filtros = {
            busqueda: req.query.busqueda || '',
            seccion: req.query.seccion || '',
            orden: req.query.orden || 'created_at',
            direccion: req.query.direccion || 'desc'
        };
        
        const funcionalidades = await FuncionalidadModel.obtenerTodas(filtros);
        
        res.json({
            success: true,
            funcionalidades
        });
    } catch (error) {
        console.error('Error en API funcionalidades:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener funcionalidades'
        });
    }
});

/**
 * API de sugerencias de búsqueda
 */
router.get('/funcionalidades/sugerencias', async (req, res) => {
    try {
        const query = req.query.q || '';
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                sugerencias: []
            });
        }
        
        const filtros = {
            busqueda: query
        };
        
        const funcionalidades = await FuncionalidadModel.obtenerTodas(filtros);
        
        // Limitar a 8 sugerencias
        const sugerencias = funcionalidades.slice(0, 8).map(func => ({
            id: func.redmine_id || func.id,
            titulo: func.titulo || 'Sin título',
            seccion: func.seccion || '',
            sponsor: func.sponsor || ''
        }));
        
        res.json({
            success: true,
            sugerencias
        });
    } catch (error) {
        console.error('Error en API sugerencias:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener sugerencias'
        });
    }
});

/**
 * API de clientes
 */
router.get('/clientes', async (req, res) => {
    try {
        const clientes = await ClienteModel.obtenerTodos();
        
        res.json({
            success: true,
            clientes
        });
    } catch (error) {
        console.error('Error en API clientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener clientes'
        });
    }
});

/**
 * API de ranking de scores
 */
router.get('/scores/ranking', async (req, res) => {
    try {
        const ranking = await ScoreModel.obtenerRanking();
        
        res.json({
            success: true,
            ranking
        });
    } catch (error) {
        console.error('Error en API ranking:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener ranking'
        });
    }
});

/**
 * API de estadísticas generales
 */
router.get('/estadisticas', async (req, res) => {
    try {
        const funcionalidades = await FuncionalidadModel.obtenerEstadisticas();
        const scores = await ScoreModel.obtenerEstadisticas();
        const mapa = await MapaModel.obtenerEstadisticas();
        
        res.json({
            success: true,
            estadisticas: {
                funcionalidades,
                scores,
                mapa
            }
        });
    } catch (error) {
        console.error('Error en API estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas'
        });
    }
});

/**
 * API de backlog proyectos
 */
router.get('/backlog-proyectos', async (req, res) => {
    try {
        const filtros = {
            busqueda: req.query.busqueda || '',
            seccion: req.query.seccion || '',
            orden: req.query.orden || 'created_at',
            direccion: req.query.direccion || 'desc'
        };
        
        const proyectos = await BacklogProyectosModel.obtenerTodas(filtros);
        
        res.json({
            success: true,
            proyectos
        });
    } catch (error) {
        console.error('Error en API backlog proyectos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener proyectos del backlog'
        });
    }
});

/**
 * API de sugerencias de búsqueda para backlog proyectos
 */
router.get('/backlog-proyectos/sugerencias', async (req, res) => {
    try {
        const query = req.query.q || '';
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                sugerencias: []
            });
        }
        
        const filtros = {
            busqueda: query
        };
        
        const proyectos = await BacklogProyectosModel.obtenerTodas(filtros);
        
        // Limitar a 8 sugerencias
        const sugerencias = proyectos.slice(0, 8).map(proyecto => ({
            id: proyecto.redmine_id || proyecto.id,
            titulo: proyecto.titulo || 'Sin título',
            seccion: proyecto.seccion || proyecto.proyecto_completo || ''
        }));
        
        res.json({
            success: true,
            sugerencias
        });
    } catch (error) {
        console.error('Error en API sugerencias backlog:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener sugerencias'
        });
    }
});

/**
 * API de ranking de scores de backlog
 */
router.get('/backlog-proyectos/ranking', async (req, res) => {
    try {
        const ranking = await ScoreBacklogModel.obtenerRanking();
        
        res.json({
            success: true,
            ranking
        });
    } catch (error) {
        console.error('Error en API ranking backlog:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener ranking'
        });
    }
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;

