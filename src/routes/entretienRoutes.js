const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { validateEntretien, validateObjectId } = require('../middleware/validation');
const {
  demanderEntretien,
  getEntretiens,
  getEntretiensStats,
  getEntretienById,
  approveEntretien,
  rejectEntretien,
  terminerEntretien,
  updateEntretien,
  deleteEntretien
} = require('../controllers/entretienController');

router.get('/', auth, role.notMembre, getEntretiens);
router.get('/stats', auth, role.notMembre, getEntretiensStats);
router.get('/:id', auth, role.notMembre, validateObjectId, getEntretienById);
router.post('/', auth, role.notMembre, validateEntretien, demanderEntretien);
router.put('/:id', auth, role.notMembre, validateObjectId, updateEntretien);
router.delete('/:id', auth, role.isPresident, validateObjectId, deleteEntretien);
router.put('/:id/approve', auth, role.isPresident, validateObjectId, approveEntretien);
router.put('/:id/reject', auth, role.isPresident, validateObjectId, rejectEntretien);
router.put('/:id/terminer', auth, role.isPresident, validateObjectId, terminerEntretien);

module.exports = router;