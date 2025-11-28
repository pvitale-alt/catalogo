/**
 * Controlador para Requerimientos de Clientes
 * Esta sección está en desarrollo
 */

/**
 * Renderizar página de Requerimientos de Clientes
 */
exports.index = async (req, res) => {
    try {
        res.render('pages/req-clientes', {
            title: 'Req. Clientes',
            activeMenu: 'req-clientes',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error al cargar Req. Clientes:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar Requerimientos de Clientes'
        });
    }
};

