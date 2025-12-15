const express = require('express');
const router = express.Router();
const proyectosInternosController = require('../controllers/proyectosInternosController');

// Vistas
router.get('/', proyectosInternosController.index);
router.get('/nuevo', proyectosInternosController.nuevoFormulario);
router.get('/:id', proyectosInternosController.detalle);
router.get('/:id/editar', proyectosInternosController.editarFormulario);

// API
router.post('/', proyectosInternosController.crear);
router.put('/:id', proyectosInternosController.actualizar);
router.delete('/:id', proyectosInternosController.eliminar);

module.exports = router;




