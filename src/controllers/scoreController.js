const ScoreModel = require('../models/ScoreModel');
const ScoreBacklogModel = require('../models/ScoreBacklogModel');
const ScoreIdeasModel = require('../models/ScoreIdeasModel');
const FuncionalidadModel = require('../models/FuncionalidadModel');
const ProyectosInternosModel = require('../models/ProyectosInternosModel');
const IdeasMejorasModel = require('../models/IdeasMejorasModel');

/**
 * Renderizar página de score
 */
exports.index = async (req, res) => {
    try {
        const ranking = await ScoreModel.obtenerRanking();
        const estadisticas = await ScoreModel.obtenerEstadisticas();
        
        res.render('pages/score', {
            title: 'Score de Funcionalidades',
            ranking,
            estadisticas,
            activeMenu: 'score'
        });
    } catch (error) {
        console.error('Error al cargar score:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar el score'
        });
    }
};

/**
 * Renderizar calculadora de score para una funcionalidad, proyecto interno o idea/mejora
 * Reutiliza la misma lógica para todos los casos
 */
exports.calculadora = async (req, res) => {
    try {
        const { id } = req.params;
        
        let item = await FuncionalidadModel.obtenerPorId(id);
        let score = null;
        let tipo = 'funcionalidad';
        
        if (item) {
            score = await ScoreModel.obtenerPorFuncionalidad(id);
        } else {
            // Si no es funcionalidad, intentar como proyecto interno
            item = await ProyectosInternosModel.obtenerPorId(id);
            if (item) {
                score = await ScoreBacklogModel.obtenerPorFuncionalidad(id);
                tipo = 'proyectos-internos';
            } else {
                // Si no es proyecto interno, intentar como idea/mejora
                item = await IdeasMejorasModel.obtenerPorId(id);
                if (item) {
                    score = await ScoreIdeasModel.obtenerPorIdea(id);
                    tipo = 'ideas-mejoras';
                }
            }
        }
        
        if (!item) {
            return res.status(404).render('pages/404', {
                title: 'Item no encontrado'
            });
        }
        
        res.render('pages/score-calculadora', {
            title: `Score: ${item.titulo}`,
            funcionalidad: item, // Mantener nombre para compatibilidad con la vista
            score,
            tipo,
            activeMenu: tipo === 'proyectos-internos' ? 'proyectos-internos' : (tipo === 'ideas-mejoras' ? 'ideas-mejoras' : 'score')
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
 * Actualizar score de funcionalidad, proyecto interno o idea/mejora
 * Reutiliza la misma lógica para todos los casos
 */
exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Determinar si es funcionalidad, proyecto interno o idea/mejora
        let funcionalidad = await FuncionalidadModel.obtenerPorId(id);
        let esProyectoInterno = false;
        let esIdeaMejora = false;
        
        if (!funcionalidad) {
            const proyecto = await ProyectosInternosModel.obtenerPorId(id);
            if (proyecto) {
                esProyectoInterno = true;
            } else {
                const idea = await IdeasMejorasModel.obtenerPorId(id);
                if (idea) {
                    esIdeaMejora = true;
                }
            }
        }
        
        // Construir criterios según el tipo
        const criterios = {
            facturacion: parseInt(req.body.facturacion) || 0,
            facturacion_potencial: parseInt(req.body.facturacion_potencial) || 0,
            impacto_cliente: parseInt(req.body.impacto_cliente) || 0,
            esfuerzo: parseInt(req.body.esfuerzo) || 0,
            incertidumbre: parseInt(req.body.incertidumbre) || 0,
            riesgo: parseInt(req.body.riesgo) || 0
        };
        
        // Agregar origen para proyectos internos e ideas/mejoras
        if (esProyectoInterno || esIdeaMejora) {
            criterios.origen = parseInt(req.body.origen) || 0;
        }
        
        // Validar que los valores estén en el rango 0-10
        for (const [key, value] of Object.entries(criterios)) {
            if (value < 0 || value > 10) {
                return res.status(400).json({
                    success: false,
                    error: `El criterio ${key} debe estar entre 0 y 10`
                });
            }
        }
        
        // NO actualizar pesos al guardar score - los pesos se mantienen como están en la BD
        // Solo actualizamos los criterios (valores 0-10)
        
        let score = null;
        
        if (funcionalidad) {
            score = await ScoreModel.actualizar(id, criterios);
        } else if (esProyectoInterno) {
            score = await ScoreBacklogModel.actualizar(id, criterios);
        } else if (esIdeaMejora) {
            score = await ScoreIdeasModel.actualizar(id, criterios);
        }
        
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

/**
 * Actualizar pesos de criterios (funcionalidad, proyectos internos o ideas/mejoras)
 */
exports.actualizarPesos = async (req, res) => {
    try {
        const { id } = req.params;
        
        const pesos = {
            peso_origen: parseFloat(req.body.peso_origen) || 40.00,
            peso_facturacion: parseFloat(req.body.peso_facturacion) || 40.00,
            peso_facturacion_potencial: parseFloat(req.body.peso_facturacion_potencial) || 20.00,
            peso_impacto_cliente: parseFloat(req.body.peso_impacto_cliente) || 40.00,
            peso_esfuerzo: parseFloat(req.body.peso_esfuerzo) || 40.00,
            peso_incertidumbre: parseFloat(req.body.peso_incertidumbre) || 30.00,
            peso_riesgo: parseFloat(req.body.peso_riesgo) || 30.00
        };
        
        // Determinar si es funcionalidad, proyecto interno o idea/mejora
        let funcionalidad = await FuncionalidadModel.obtenerPorId(id);
        let score = null;
        
        if (funcionalidad) {
            score = await ScoreModel.actualizarPesos(id, pesos);
        } else {
            // Intentar como proyecto interno
            const proyecto = await ProyectosInternosModel.obtenerPorId(id);
            if (proyecto) {
                score = await ScoreBacklogModel.actualizarPesos(id, pesos);
            } else {
                // Intentar como idea/mejora
                const idea = await IdeasMejorasModel.obtenerPorId(id);
                if (idea) {
                    score = await ScoreIdeasModel.actualizarPesos(id, pesos);
                }
            }
        }
        
        if (!score) {
            return res.status(404).json({
                success: false,
                error: 'Score no encontrado'
            });
        }
        
        res.json({
            success: true,
            score,
            message: 'Pesos actualizados exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar pesos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar los pesos'
        });
    }
};

/**
 * Calcular preview de score (sin guardar)
 * Funciona tanto para funcionalidades como para proyectos internos
 * USA LA MISMA LÓGICA PARA AMBOS (ignora 'origen' en el cálculo)
 */
exports.calcularPreview = async (req, res) => {
    try {
        const criterios = {
            facturacion: parseInt(req.body.facturacion) || 0,
            facturacion_potencial: parseInt(req.body.facturacion_potencial) || 0,
            impacto_cliente: parseInt(req.body.impacto_cliente) || 0,
            esfuerzo: parseInt(req.body.esfuerzo) || 0,
            incertidumbre: parseInt(req.body.incertidumbre) || 0,
            riesgo: parseInt(req.body.riesgo) || 0
        };
        
        const pesos = {
            peso_facturacion: parseFloat(req.body.peso_facturacion) || 40.00,
            peso_facturacion_potencial: parseFloat(req.body.peso_facturacion_potencial) || 20.00,
            peso_impacto_cliente: parseFloat(req.body.peso_impacto_cliente) || 40.00,
            peso_esfuerzo: parseFloat(req.body.peso_esfuerzo) || 40.00,
            peso_incertidumbre: parseFloat(req.body.peso_incertidumbre) || 30.00,
            peso_riesgo: parseFloat(req.body.peso_riesgo) || 30.00
        };
        
        // Usar ScoreModel.calcularScore (ambos modelos ahora usan la misma lógica)
        const scoreCalculado = ScoreModel.calcularScore(criterios, pesos);
        
        res.json({
            success: true,
            score: scoreCalculado,
            criterios,
            pesos
        });
    } catch (error) {
        console.error('Error al calcular preview:', error);
        res.status(500).json({
            success: false,
            error: 'Error al calcular el preview'
        });
    }
};

