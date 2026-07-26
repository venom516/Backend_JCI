const express = require('express');
const router = express.Router();
const formationController = require('../controllers/formationController');

router.get('/count', formationController.getCount);
router.get('/', formationController.getAll);

module.exports = router;
