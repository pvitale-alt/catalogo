const express = require('express');
const router = express.Router();

/**
 * Renderizar página de Desarrollos Internos
 */
router.get('/', (req, res) => {
    res.render('pages/desarrollos-internos', {
        title: 'Desarrollos Internos',
        activeMenu: 'desarrollos-internos'
    });
});

module.exports = router;

