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
<<<<<<< HEAD
router.delete('/:id', auth, role.isPresident, validateObjectId, deleteEntretien);
router.put('/:id/approve', auth, role.isPresident, validateObjectId, approveEntretien);
router.put('/:id/reject', auth, role.isPresident, validateObjectId, rejectEntretien);
router.put('/:id/terminer', auth, role.isPresident, validateObjectId, terminerEntretien);
<<<<<<< HEAD
=======
=======
router.delete('/:id', auth, role.hasRole(['President', 'VPFD']), validateObjectId, deleteEntretien);
router.put('/:id/approve', auth, role.hasRole(['President', 'VPFD']), validateObjectId, approveEntretien);
router.put('/:id/reject', auth, role.hasRole(['President', 'VPFD']), validateObjectId, rejectEntretien);
router.put('/:id/realise', auth, role.hasRole(['President', 'VPFD']), validateObjectId, realiseEntretien);
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3

module.exports = router;