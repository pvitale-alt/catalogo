const express = require('express');
const router = express.Router();
const mapaController = require('../controllers/mapaController');
const { requireAdmin } = require('../middleware/authJWT');

// Vistas
router.get('/', mapaController.index);

// API
router.get('/datos', mapaController.obtenerDatos);
router.get('/clientes', mapaController.obtenerClientes);
router.get('/clientes-redmine', mapaController.obtenerClientesRedmine);
router.get('/clientes/:clienteId/cliente-redmine', mapaController.obtenerClienteRedmine);
router.post('/clientes', mapaController.crearCliente);
router.put('/estado/:clienteId/:funcionalidadId', mapaController.actualizarEstado);
router.put('/clientes/:clienteId/cliente-redmine', requireAdmin, mapaController.actualizarClienteRedmine);
router.delete('/relacion/:clienteId/:funcionalidadId', mapaController.eliminarRelacion);

module.exports = router;

