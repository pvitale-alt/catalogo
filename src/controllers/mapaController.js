const MapaModel = require('../models/MapaModel');

/**
 * Renderizar página del mapa
 */
exports.index = async (req, res) => {
    try {
        const mapa = await MapaModel.obtenerMapa();
        const estadisticas = await MapaModel.obtenerEstadisticas();
        const topFuncionalidades = await MapaModel.obtenerTopFuncionalidades(5);
        
        res.render('pages/mapa', {
            title: 'Clientes',
            clientes: mapa.clientes,
            funcionalidades: mapa.funcionalidades,
            relaciones: mapa.relaciones,
            estadisticas,
            topFuncionalidades,
            activeMenu: 'mapa'
        });
    } catch (error) {
        console.error('Error al cargar mapa:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar el mapa'
        });
    }
};

/**
 * Actualizar estado comercial
 */
exports.actualizarEstado = async (req, res) => {
    try {
        const { clienteId, funcionalidadId } = req.params;
        
        const datos = {
            estado_comercial: req.body.estado_comercial,
            fecha_inicio: req.body.fecha_inicio || null,
            fecha_fin: req.body.fecha_fin || null,
            notas: req.body.notas || null
        };
        
        // Validar estado comercial
        const estadosValidos = ['productivo', 'interesado', 'rechazado', 'en desarrollo', 'Propuesta enviada', null];
        if (datos.estado_comercial && !estadosValidos.includes(datos.estado_comercial)) {
            return res.status(400).json({
                success: false,
                error: 'Estado comercial inválido. Valores válidos: productivo, interesado, rechazado, en desarrollo, Propuesta enviada'
            });
        }
        
        const relacion = await MapaModel.actualizarEstado(clienteId, funcionalidadId, datos);
        
        res.json({
            success: true,
            relacion,
            message: 'Estado actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el estado'
        });
    }
};

/**
 * Eliminar relación
 */
exports.eliminarRelacion = async (req, res) => {
    try {
        const { clienteId, funcionalidadId } = req.params;
        
        const relacion = await MapaModel.eliminarRelacion(clienteId, funcionalidadId);
        
        if (!relacion) {
            return res.status(404).json({
                success: false,
                error: 'Relación no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Relación eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar relación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la relación'
        });
    }
};

/**
 * Obtener datos del mapa en formato JSON
 */
exports.obtenerDatos = async (req, res) => {
    try {
        const mapa = await MapaModel.obtenerMapa();
        
        res.json({
            success: true,
            clientes: mapa.clientes,
            funcionalidades: mapa.funcionalidades,
            relaciones: mapa.relaciones
        });
    } catch (error) {
        console.error('Error al obtener datos del mapa:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los datos'
        });
    }
};

/**
 * Crear nuevo cliente
 */
exports.crearCliente = async (req, res) => {
    try {
        const { nombre, color } = req.body;
        
        if (!nombre) {
            return res.status(400).json({
                success: false,
                error: 'El nombre del cliente es requerido'
            });
        }
        
        const cliente = await MapaModel.crearCliente({ nombre, color });
        
        res.json({
            success: true,
            cliente,
            message: 'Cliente creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el cliente'
        });
    }
};

/**
 * Obtener todos los clientes
 */
exports.obtenerClientes = async (req, res) => {
    try {
        const clientes = await MapaModel.obtenerTodosLosClientes();
        
        res.json({
            success: true,
            clientes
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los clientes'
        });
    }
};

