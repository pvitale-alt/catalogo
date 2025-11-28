const express = require('express');
const router = express.Router();
const reqClientesController = require('../controllers/reqClientesController');

// Vista principal
router.get('/', reqClientesController.index);

module.exports = router;

