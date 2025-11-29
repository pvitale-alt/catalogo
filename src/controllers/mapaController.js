const MapaModel = require('../models/MapaModel');

/**
 * Renderizar página del mapa
 */
exports.index = async (req, res) => {
    try {
        const mapa = await MapaModel.obtenerMapa();
        const estadisticas = await MapaModel.obtenerEstadisticas();
        const topFuncionalidades = await MapaModel.obtenerTopFuncionalidades(5);
        
        // Si es admin, obtener todos los clientes con sus cliente_redmine
        let clientesConRedmine = [];
        if (req.isAdmin) {
            const todosLosClientes = await MapaModel.obtenerTodosLosClientes();
            clientesConRedmine = await Promise.all(
                todosLosClientes.map(async (cliente) => {
                    const clienteRedmine = await MapaModel.obtenerClienteRedminePorCliente(cliente.id);
                    return {
                        ...cliente,
                        cliente_redmine: clienteRedmine
                    };
                })
            );
        }
        
        res.render('pages/mapa', {
            title: 'Clientes',
            clientes: mapa.clientes,
            funcionalidades: mapa.funcionalidades,
            relaciones: mapa.relaciones,
            estadisticas,
            topFuncionalidades,
            activeMenu: 'mapa',
            isAdmin: req.isAdmin || false,
            clientesConRedmine: clientesConRedmine
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
        
        // Si el estado es null, eliminar la relación en lugar de actualizar
        if (datos.estado_comercial === null || datos.estado_comercial === '') {
            const relacionEliminada = await MapaModel.eliminarRelacion(clienteId, funcionalidadId);
            return res.json({
                success: true,
                relacion: relacionEliminada,
                message: 'Estado eliminado exitosamente'
            });
        }
        
        // Validar estado comercial
        const estadosValidos = ['productivo', 'interesado', 'rechazado', 'en desarrollo', 'Propuesta enviada'];
        if (!estadosValidos.includes(datos.estado_comercial)) {
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

/**
 * Obtener clientes Redmine únicos
 */
exports.obtenerClientesRedmine = async (req, res) => {
    try {
        const clientesRedmine = await MapaModel.obtenerClientesRedmine();
        
        res.json({
            success: true,
            clientesRedmine
        });
    } catch (error) {
        console.error('Error al obtener clientes Redmine:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los clientes Redmine'
        });
    }
};

/**
 * Obtener cliente_redmine de un cliente
 */
exports.obtenerClienteRedmine = async (req, res) => {
    try {
        const { clienteId } = req.params;
        const clientesRedmine = await MapaModel.obtenerClienteRedminePorCliente(clienteId);
        
        res.json({
            success: true,
            clientesRedmine
        });
    } catch (error) {
        console.error('Error al obtener cliente_redmine:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los cliente_redmine'
        });
    }
};

/**
 * Actualizar cliente_redmine de un cliente
 */
exports.actualizarClienteRedmine = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden actualizar cliente_redmine'
            });
        }

        const { clienteId } = req.params;
        const { clientesRedmine } = req.body;

        if (!Array.isArray(clientesRedmine)) {
            return res.status(400).json({
                success: false,
                error: 'clientesRedmine debe ser un array'
            });
        }

        const resultado = await MapaModel.actualizarClienteRedmine(clienteId, clientesRedmine);
        
        res.json({
            success: true,
            clientesRedmine: resultado,
            message: 'Cliente Redmine actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar cliente_redmine:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar cliente_redmine'
        });
    }
};

