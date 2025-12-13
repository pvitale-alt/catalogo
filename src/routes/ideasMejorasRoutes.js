const express = require('express');
const router = express.Router();
const ideasMejorasController = require('../controllers/ideasMejorasController');

// Vistas
router.get('/', ideasMejorasController.index);
router.get('/sugerencias', ideasMejorasController.sugerencias);
router.get('/:id', ideasMejorasController.detalle);
router.get('/:id/score', ideasMejorasController.calculadora);

// API
router.post('/', ideasMejorasController.crear);
router.put('/:id', ideasMejorasController.actualizar);
router.delete('/:id', ideasMejorasController.eliminar);
router.put('/:id/score', ideasMejorasController.actualizarScore);

module.exports = router;
