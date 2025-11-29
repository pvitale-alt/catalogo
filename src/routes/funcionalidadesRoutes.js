const express = require('express');
const router = express.Router();
const funcionalidadesController = require('../controllers/funcionalidadesController');

// Vistas
router.get('/', funcionalidadesController.index);
router.get('/nuevo', funcionalidadesController.nuevoFormulario);
router.get('/:id', funcionalidadesController.detalle);
router.get('/:id/editar', funcionalidadesController.editarFormulario);

// API
router.post('/', funcionalidadesController.crear);
router.put('/:id', funcionalidadesController.actualizar);
router.delete('/:id', funcionalidadesController.eliminar);
router.get('/:id/clientes', funcionalidadesController.obtenerClientes);
router.post('/:id/actualizar-epics', funcionalidadesController.actualizarEpics);

module.exports = router;

