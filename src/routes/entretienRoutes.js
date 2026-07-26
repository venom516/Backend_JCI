const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { validateEntretien, validateObjectId } = require('../middleware/validation');
const {
  demanderEntretien,
  getEntretiens,
  getEntretienById,
  approveEntretien,
  rejectEntretien,
  realiseEntretien,
  updateEntretien,
  deleteEntretien
} = require('../controllers/entretienController');

router.get('/', auth, role.notMembre, getEntretiens);
router.get('/:id', auth, role.notMembre, validateObjectId, getEntretienById);
router.post('/', auth, role.notMembre, validateEntretien, demanderEntretien);
router.put('/:id', auth, role.notMembre, validateObjectId, updateEntretien);
router.delete('/:id', auth, role.isPresident, validateObjectId, deleteEntretien);
router.put('/:id/approve', auth, role.isPresident, validateObjectId, approveEntretien);
router.put('/:id/reject', auth, role.isPresident, validateObjectId, rejectEntretien);
router.put('/:id/realise', auth, role.isPresident, validateObjectId, realiseEntretien);

module.exports = router;