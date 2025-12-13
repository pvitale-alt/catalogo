const IdeasMejorasModel = require('../models/IdeasMejorasModel');
const ScoreIdeasModel = require('../models/ScoreIdeasModel');

/**
 * Renderizar página de Ideas/Mejoras
 */
exports.index = async (req, res) => {
    try {
        const filtros = {
            busqueda: req.query.busqueda || '',
            seccion: req.query.seccion || '',
            secciones: req.query.secciones ? (Array.isArray(req.query.secciones) ? req.query.secciones : [req.query.secciones]) : [],
            orden: req.query.orden || 'score_total',
            direccion: req.query.direccion || 'desc'
        };
        
        const vista = req.query.vista || 'lista';
        
        const ideas = await IdeasMejorasModel.obtenerTodas(filtros);
        const secciones = await IdeasMejorasModel.obtenerSecciones();
        const estadisticas = await IdeasMejorasModel.obtenerEstadisticas();
        
        // Agregar secciones por defecto si no hay ninguna
        const seccionesDisponibles = secciones.length > 0 ? secciones : [
            'Operatorias',
            'Reportes e interfaces',
            'Backoffice',
            'Mercados',
            'Contabilidad',
            'Valuacion'
        ];
        
        res.render('pages/ideas-mejoras', {
            title: 'Ideas/Mejoras',
            ideas,
            secciones: seccionesDisponibles,
            estadisticas,
            filtros,
            vista,
            activeMenu: 'ideas-mejoras',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error al cargar Ideas/Mejoras:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar Ideas/Mejoras'
        });
    }
};

/**
 * Renderizar detalle de idea/mejora
 */
exports.detalle = async (req, res) => {
    try {
        const { id } = req.params;
        const idea = await IdeasMejorasModel.obtenerPorId(id);
        
        if (!idea) {
            return res.status(404).render('pages/404', {
                title: 'Idea no encontrada'
            });
        }
        
        res.render('pages/idea-mejora-detalle', {
            title: idea.titulo,
            idea,
            activeMenu: 'ideas-mejoras',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error al cargar detalle:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar el detalle'
        });
    }
};

/**
 * Crear nueva idea/mejora
 */
exports.crear = async (req, res) => {
    try {
        const datos = {
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            seccion: req.body.seccion,
            fecha_creacion: req.body.fecha_creacion || new Date()
        };
        
        if (!datos.titulo || datos.titulo.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'El título es requerido'
            });
        }
        
        const idea = await IdeasMejorasModel.crear(datos);
        
        res.json({
            success: true,
            idea,
            message: 'Idea creada exitosamente'
        });
    } catch (error) {
        console.error('Error al crear idea/mejora:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear la idea/mejora'
        });
    }
};

/**
 * Actualizar idea/mejora
 */
exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const datos = {
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            seccion: req.body.seccion
        };
        
        const idea = await IdeasMejorasModel.actualizar(id, datos);
        
        if (!idea) {
            return res.status(404).json({
                success: false,
                error: 'Idea no encontrada'
            });
        }
        
        res.json({
            success: true,
            idea,
            message: 'Idea actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar idea/mejora:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar la idea/mejora'
        });
    }
};

/**
 * Eliminar idea/mejora
 */
exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        const idea = await IdeasMejorasModel.eliminar(id);
        
        if (!idea) {
            return res.status(404).json({
                success: false,
                error: 'Idea no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Idea eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar idea/mejora:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la idea/mejora'
        });
    }
};

/**
 * Buscar sugerencias para autocompletado
 */
exports.sugerencias = async (req, res) => {
    try {
        const query = req.query.q || '';
        
        if (query.length < 2) {
            return res.json({
                success: true,
                sugerencias: []
            });
        }
        
        const sugerencias = await IdeasMejorasModel.buscarSugerencias(query, 5);
        
        res.json({
            success: true,
            sugerencias
        });
    } catch (error) {
        console.error('Error al buscar sugerencias:', error);
        res.status(500).json({
            success: false,
            error: 'Error al buscar sugerencias'
        });
    }
};

/**
 * Renderizar calculadora de score para idea
 */
exports.calculadora = async (req, res) => {
    try {
        const { id } = req.params;
        const idea = await IdeasMejorasModel.obtenerPorId(id);
        
        if (!idea) {
            return res.status(404).render('pages/404', {
                title: 'Idea no encontrada'
            });
        }
        
        const score = await ScoreIdeasModel.obtenerPorIdea(id);
        
        res.render('pages/score-calculadora', {
            title: `Score: ${idea.titulo}`,
            funcionalidad: idea,
            score,
            tipo: 'ideas-mejoras',
            activeMenu: 'ideas-mejoras'
        });
    } catch (error) {
        console.error('Error al cargar calculadora:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar la calculadora'
        });
    }
};

/**
 * Actualizar score de idea
 */
exports.actualizarScore = async (req, res) => {
    try {
        const { id } = req.params;
        
        const criterios = {
            origen: parseInt(req.body.origen) || 0,
            facturacion: parseInt(req.body.facturacion) || 0,
            facturacion_potencial: parseInt(req.body.facturacion_potencial) || 0,
            impacto_cliente: parseInt(req.body.impacto_cliente) || 0,
            esfuerzo: parseInt(req.body.esfuerzo) || 0,
            incertidumbre: parseInt(req.body.incertidumbre) || 0,
            riesgo: parseInt(req.body.riesgo) || 0
        };
        
        // Validar rangos
        for (const [key, value] of Object.entries(criterios)) {
            if (value < 0 || value > 10) {
                return res.status(400).json({
                    success: false,
                    error: `El criterio ${key} debe estar entre 0 y 10`
                });
            }
        }
        
        const score = await ScoreIdeasModel.actualizar(id, criterios);
        
        if (!score) {
            return res.status(404).json({
                success: false,
                error: 'Score no encontrado'
            });
        }
        
        res.json({
            success: true,
            score,
            message: 'Score actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar score:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el score'
        });
    }
};
