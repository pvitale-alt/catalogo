const ReqClientesModel = require('../models/ReqClientesModel');

const buildRedmineBaseUrl = () => {
    const base = process.env.REDMINE_PUBLIC_URL || process.env.REDMINE_URL || 'https://redmine.mercap.net';
    return base.replace(/\/+$/, '');
};

/**
 * Renderizar página de requerimientos de clientes
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
            direccion: req.query.direccion || 'desc',
            mostrarOcultos: req.query.mostrarOcultos === 'true' || req.query.mostrarOcultos === true
        };
        
        const vista = req.query.vista || 'lista';
        
        const requerimientos = await ReqClientesModel.obtenerTodas(filtros);
        const secciones = await ReqClientesModel.obtenerSecciones();
        const estadisticas = await ReqClientesModel.obtenerEstadisticas();
        
        res.render('pages/req-clientes', {
            title: 'Req. Clientes',
            requerimientos,
            secciones,
            estadisticas,
            filtros,
            vista,
            activeMenu: 'req-clientes',
            isAdmin: req.isAdmin || false,
            redmineBaseUrl: buildRedmineBaseUrl()
        });
    } catch (error) {
        console.error('Error al cargar requerimientos de clientes:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar los requerimientos de clientes'
        });
    }
};

/**
 * Renderizar detalle de requerimiento de cliente
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.detalle = async (req, res) => {
    try {
        const { id } = req.params;
        const requerimiento = await ReqClientesModel.obtenerPorId(id);
        
        if (!requerimiento) {
            return res.status(404).render('pages/404', {
                title: 'Requerimiento no encontrado'
            });
        }
        
        // Buscar funcionalidad por sponsor (cf_92) si existe
        let funcionalidadSponsor = null;
        if (requerimiento.cf_92) {
            try {
                const FuncionalidadModel = require('../models/FuncionalidadModel');
                funcionalidadSponsor = await FuncionalidadModel.obtenerPorSponsor(requerimiento.cf_92);
                if (funcionalidadSponsor) {
                    console.log(`✅ Funcionalidad encontrada para sponsor "${requerimiento.cf_92}": redmine_id=${funcionalidadSponsor.redmine_id}`);
                } else {
                    console.log(`⚠️ No se encontró funcionalidad para sponsor "${requerimiento.cf_92}"`);
                }
            } catch (error) {
                console.error('Error al buscar funcionalidad por sponsor:', error);
            }
        }
        
        res.render('pages/req-cliente-detalle', {
            title: requerimiento.titulo,
            requerimiento,
            funcionalidadSponsor, // Funcionalidad encontrada por sponsor
            activeMenu: 'req-clientes',
            isAdmin: req.isAdmin || false,
            redmineBaseUrl: buildRedmineBaseUrl()
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
 * Redirigir a la lista (los requerimientos se crean desde Redmine)
 */
exports.nuevoFormulario = async (req, res) => {
    res.redirect('/req-clientes');
};

/**
 * Renderizar formulario de edición
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.editarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const requerimiento = await ReqClientesModel.obtenerPorId(id);
        
        if (!requerimiento) {
            return res.status(404).render('pages/404', {
                title: 'Requerimiento no encontrado'
            });
        }
        
        const secciones = await ReqClientesModel.obtenerSecciones();
        
        res.render('pages/req-cliente-form', {
            title: 'Editar Requerimiento de Cliente',
            requerimiento,
            secciones,
            activeMenu: 'req-clientes'
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
 * Crear requerimiento (en realidad actualiza si existe redmine_id)
 */
exports.crear = async (req, res) => {
    try {
        if (!req.body.redmine_id) {
            return res.status(400).json({
                success: false,
                error: 'Los requerimientos deben crearse desde la sincronización con Redmine. Use el endpoint de actualización para editar campos.'
            });
        }
        
        const datos = {
            descripcion: req.body.descripcion,
            seccion: req.body.seccion
        };
        
        const requerimiento = await ReqClientesModel.actualizar(req.body.redmine_id, datos);
        
        if (!requerimiento) {
            return res.status(404).json({
                success: false,
                error: 'Requerimiento no encontrado. Asegúrate de que el issue esté sincronizado desde Redmine.'
            });
        }
        
        res.json({
            success: true,
            requerimiento,
            message: 'Requerimiento de cliente actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear requerimiento de cliente:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear el requerimiento de cliente'
        });
    }
};

/**
 * Actualizar requerimiento (solo campos editables)
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const datos = {
            descripcion: req.body.descripcion,
            seccion: req.body.seccion
        };
        
        const requerimiento = await ReqClientesModel.actualizar(id, datos);
        
        if (!requerimiento) {
            return res.status(404).json({
                success: false,
                error: 'Requerimiento no encontrado'
            });
        }
        
        res.json({
            success: true,
            requerimiento,
            message: 'Requerimiento de cliente actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar requerimiento de cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el requerimiento de cliente'
        });
    }
};

/**
 * Eliminar requerimiento de cliente
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        const requerimiento = await ReqClientesModel.eliminar(id);
        
        if (!requerimiento) {
            return res.status(404).json({
                success: false,
                error: 'Requerimiento no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Requerimiento de cliente eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar requerimiento de cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el requerimiento de cliente'
        });
    }
};

/**
 * Ocultar o mostrar un requerimiento de cliente
 */
exports.ocultar = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden ocultar requerimientos'
            });
        }

        const { id } = req.params;
        const { oculto } = req.body;

        if (typeof oculto !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'El campo oculto debe ser un booleano'
            });
        }

        await ReqClientesModel.ocultar(id, oculto);

        res.json({
            success: true,
            message: oculto ? 'Requerimiento ocultado exitosamente' : 'Requerimiento mostrado exitosamente'
        });
    } catch (error) {
        console.error('Error al ocultar/mostrar requerimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al ocultar/mostrar el requerimiento'
        });
    }
};
