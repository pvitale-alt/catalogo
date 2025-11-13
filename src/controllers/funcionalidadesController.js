const FuncionalidadModel = require('../models/FuncionalidadModel');

/**
 * Renderizar página de funcionalidades
 */
exports.index = async (req, res) => {
    try {
        const filtros = {
            busqueda: req.query.busqueda || '',
            seccion: req.query.seccion || '',
            secciones: req.query.secciones ? (Array.isArray(req.query.secciones) ? req.query.secciones : [req.query.secciones]) : [],
            sponsor: req.query.sponsor || '',
            sponsors: req.query.sponsors ? (Array.isArray(req.query.sponsors) ? req.query.sponsors : [req.query.sponsors]) : [],
            orden: req.query.orden || 'score_total',
            direccion: req.query.direccion || 'desc'
        };
        
        const vista = req.query.vista || 'lista'; // lista o tarjetas
        
        const funcionalidades = await FuncionalidadModel.obtenerTodas(filtros);
        const secciones = await FuncionalidadModel.obtenerSecciones();
        const sponsors = await FuncionalidadModel.obtenerSponsors();
        const estadisticas = await FuncionalidadModel.obtenerEstadisticas();
        
        res.render('pages/funcionalidades', {
            title: 'Funcionalidades',
            funcionalidades,
            secciones,
            sponsors,
            estadisticas,
            filtros,
            vista,
            activeMenu: 'funcionalidades',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error al cargar funcionalidades:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar las funcionalidades'
        });
    }
};

/**
 * Renderizar detalle de funcionalidad
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.detalle = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const funcionalidad = await FuncionalidadModel.obtenerPorId(id);
        
        if (!funcionalidad) {
            return res.status(404).render('pages/404', {
                title: 'Funcionalidad no encontrada'
            });
        }
        
        // Obtener clientes de esta funcionalidad (productivo en)
        const MapaModel = require('../models/MapaModel');
        const clientesFuncionalidad = await MapaModel.obtenerClientesPorFuncionalidad(id);
        const todosLosClientes = await MapaModel.obtenerTodosLosClientes();
        
        res.render('pages/funcionalidad-detalle', {
            title: funcionalidad.titulo,
            funcionalidad,
            clientesFuncionalidad,
            todosLosClientes,
            activeMenu: 'funcionalidades',
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
 * Renderizar formulario de nueva funcionalidad
 * NOTA: Las funcionalidades se crean automáticamente desde la sincronización con Redmine
 * Redirigir a la lista de funcionalidades
 */
exports.nuevoFormulario = async (req, res) => {
    res.redirect('/funcionalidades');
};

/**
 * Renderizar formulario de edición
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.editarFormulario = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const funcionalidad = await FuncionalidadModel.obtenerPorId(id);
        
        if (!funcionalidad) {
            return res.status(404).render('pages/404', {
                title: 'Funcionalidad no encontrada'
            });
        }
        
        const secciones = await FuncionalidadModel.obtenerSecciones();
        
        res.render('pages/funcionalidad-form', {
            title: 'Editar Funcionalidad',
            funcionalidad,
            secciones,
            activeMenu: 'funcionalidades'
        });
    } catch (error) {
        console.error('Error al cargar formulario:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar el formulario'
        });
    }
};

/**
 * Crear funcionalidad
 * NOTA: Las funcionalidades se crean automáticamente desde la sincronización con Redmine
 * Este endpoint solo actualiza campos editables si viene redmine_id
 */
exports.crear = async (req, res) => {
    try {
        if (!req.body.redmine_id) {
            return res.status(400).json({
                success: false,
                error: 'Las funcionalidades deben crearse desde la sincronización con Redmine. Use el endpoint de actualización para editar campos.'
            });
        }
        
        // Si viene redmine_id, actualizar campos editables
        const datos = {
            descripcion: req.body.descripcion,
            seccion: req.body.seccion,
            monto: req.body.monto ? parseFloat(req.body.monto) : null
        };
        
        const funcionalidad = await FuncionalidadModel.actualizar(req.body.redmine_id, datos);
        
        if (!funcionalidad) {
            return res.status(404).json({
                success: false,
                error: 'Funcionalidad no encontrada. Asegúrate de que el issue esté sincronizado desde Redmine.'
            });
        }
        
        res.json({
            success: true,
            funcionalidad,
            message: 'Funcionalidad actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al crear funcionalidad:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear la funcionalidad'
        });
    }
};

/**
 * Actualizar funcionalidad (solo campos editables)
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const datos = {
            descripcion: req.body.descripcion,
            seccion: req.body.seccion,
            monto: req.body.monto ? parseFloat(req.body.monto) : null
        };
        
        const funcionalidad = await FuncionalidadModel.actualizar(id, datos);
        
        if (!funcionalidad) {
            return res.status(404).json({
                success: false,
                error: 'Funcionalidad no encontrada'
            });
        }
        
        res.json({
            success: true,
            funcionalidad,
            message: 'Funcionalidad actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar funcionalidad:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar la funcionalidad'
        });
    }
};

/**
 * Eliminar funcionalidad
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const funcionalidad = await FuncionalidadModel.eliminar(id);
        
        if (!funcionalidad) {
            return res.status(404).json({
                success: false,
                error: 'Funcionalidad no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Funcionalidad eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar funcionalidad:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la funcionalidad'
        });
    }
};

/**
 * Obtener clientes de una funcionalidad
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.obtenerClientes = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const MapaModel = require('../models/MapaModel');
        const clientes = await MapaModel.obtenerClientesPorFuncionalidad(id);
        
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

