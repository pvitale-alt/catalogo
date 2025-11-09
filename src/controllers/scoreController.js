const ScoreModel = require('../models/ScoreModel');
const FuncionalidadModel = require('../models/FuncionalidadModel');

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
 * Renderizar calculadora de score para una funcionalidad
 */
exports.calculadora = async (req, res) => {
    try {
        const { id } = req.params;
        const funcionalidad = await FuncionalidadModel.obtenerPorId(id);
        
        if (!funcionalidad) {
            return res.status(404).render('pages/404', {
                title: 'Funcionalidad no encontrada'
            });
        }
        
        const score = await ScoreModel.obtenerPorFuncionalidad(id);
        
        res.render('pages/score-calculadora', {
            title: `Score: ${funcionalidad.titulo}`,
            funcionalidad,
            score,
            activeMenu: 'score'
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
 * Actualizar score de funcionalidad
 */
exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        
        const criterios = {
            facturacion: parseInt(req.body.facturacion) || 0,
            urgencia: parseInt(req.body.urgencia) || 0,
            facturacion_potencial: parseInt(req.body.facturacion_potencial) || 0,
            impacto_cliente: parseInt(req.body.impacto_cliente) || 0,
            esfuerzo: parseInt(req.body.esfuerzo) || 0,
            incertidumbre: parseInt(req.body.incertidumbre) || 0,
            riesgo: parseInt(req.body.riesgo) || 0
        };
        
        // Validar que los valores estén en el rango 0-10
        for (const [key, value] of Object.entries(criterios)) {
            if (value < 0 || value > 10) {
                return res.status(400).json({
                    success: false,
                    error: `El criterio ${key} debe estar entre 0 y 10`
                });
            }
        }
        
        const score = await ScoreModel.actualizar(id, criterios);
        
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
 * Actualizar pesos de criterios
 */
exports.actualizarPesos = async (req, res) => {
    try {
        const { id } = req.params;
        
        const pesos = {
            peso_origen: parseFloat(req.body.peso_origen) || 40.00,
            peso_facturacion: parseFloat(req.body.peso_facturacion) || 20.00,
            peso_urgencia: parseFloat(req.body.peso_urgencia) || 20.00,
            peso_facturacion_potencial: parseFloat(req.body.peso_facturacion_potencial) || 20.00,
            peso_impacto_cliente: parseFloat(req.body.peso_impacto_cliente) || 33.33,
            peso_esfuerzo: parseFloat(req.body.peso_esfuerzo) || 33.33,
            peso_incertidumbre: parseFloat(req.body.peso_incertidumbre) || 33.33,
            peso_riesgo: parseFloat(req.body.peso_riesgo) || 33.33
        };
        
        const score = await ScoreModel.actualizarPesos(id, pesos);
        
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
 */
exports.calcularPreview = async (req, res) => {
    try {
        const criterios = {
            facturacion: parseInt(req.body.facturacion) || 0,
            urgencia: parseInt(req.body.urgencia) || 0,
            facturacion_potencial: parseInt(req.body.facturacion_potencial) || 0,
            impacto_cliente: parseInt(req.body.impacto_cliente) || 0,
            esfuerzo: parseInt(req.body.esfuerzo) || 0,
            incertidumbre: parseInt(req.body.incertidumbre) || 0,
            riesgo: parseInt(req.body.riesgo) || 0
        };
        
        const pesos = {
            peso_facturacion: parseFloat(req.body.peso_facturacion) || 40.00,
            peso_urgencia: parseFloat(req.body.peso_urgencia) || 20.00,
            peso_facturacion_potencial: parseFloat(req.body.peso_facturacion_potencial) || 20.00,
            peso_impacto_cliente: parseFloat(req.body.peso_impacto_cliente) || 20.00,
            peso_esfuerzo: parseFloat(req.body.peso_esfuerzo) || 33.33,
            peso_incertidumbre: parseFloat(req.body.peso_incertidumbre) || 33.33,
            peso_riesgo: parseFloat(req.body.peso_riesgo) || 33.33
        };
        
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

