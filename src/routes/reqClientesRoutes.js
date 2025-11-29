const express = require('express');
const router = express.Router();
const reqClientesController = require('../controllers/reqClientesController');

// Vistas
router.get('/', reqClientesController.index);
router.get('/nuevo', reqClientesController.nuevoFormulario);
router.get('/:id', reqClientesController.detalle);
router.get('/:id/editar', reqClientesController.editarFormulario);

// API
router.post('/', reqClientesController.crear);
router.put('/:id', reqClientesController.actualizar);
router.put('/:id/ocultar', reqClientesController.ocultar);
router.delete('/:id', reqClientesController.eliminar);

module.exports = router;

