const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const formationController = require('../controllers/formationController');

router.get('/count', formationController.getCount);
router.get('/', formationController.getAll);
router.post('/', auth, role.hasRole(['VPFD', 'President']), formationController.create);
router.put('/:id', auth, role.hasRole(['VPFD', 'President']), formationController.update);
router.delete('/:id', auth, role.hasRole(['VPFD', 'President']), formationController.delete);

module.exports = router;
