const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { validateMembreUpdate, validateObjectId, sanitizeInput } = require('../middleware/validation');
const {
  getMembres,
  getMembreById,
  updateMembre,
  createMembre,
  validateMembre,
  suspendreMembre,
  reactiverMembre,
  bannirMembre,
  deleteMembre,
  hardDeleteMembre,
  getStatsMembres,
  getPublicStats,
  getAllRoles,
  renameRole,
  deleteRole,
  getBureauMembers,
  acceptMember,
  rejectMember,
  getParrainList,
  createRole
} = require('../controllers/membreController');

// ============================================================
// ROUTES (ordre important: spécifiques avant /:id)
// ============================================================

// GET - Liste des membres
router.get('/', auth, getMembres);

// POST - Créer un membre (Admin seulement)
router.post('/', auth, role.isUserManager, createMembre);

// GET - Statistiques publiques (Home page)
router.get('/stats/public', getPublicStats);

// GET - Statistiques
router.get('/stats', auth, role.hasRole(['Admin', 'President', 'SecretaireGeneral']), getStatsMembres);

// GET - Tous les rôles distincts
router.get('/roles-list', auth, getAllRoles);

// PUT - Renommer un rôle
router.put('/roles/rename', auth, role.isPresident, renameRole);

// POST - Créer un rôle (sans créer de membre)
router.post('/roles', auth, role.isPresident, createRole);

// DELETE - Supprimer un rôle
router.delete('/roles/:role', auth, role.isPresident, deleteRole);

// GET - Liste des parrains (public - pour formulaire d'inscription)
router.get('/parrain-list', getParrainList);

// GET - Bureau (public, pas de auth)
router.get('/bureau', getBureauMembers);

// GET - Membres par rôle
router.get('/roles/:role', auth, (req, res, next) => { req.query.role = req.params.role; next(); }, getMembres);

// GET - Membres par statut
router.get('/statuts/:status', auth, (req, res, next) => { req.query.status = req.params.status; next(); }, getMembres);

// GET - Membre par ID
router.get('/:id', auth, validateObjectId, getMembreById);

// PUT - MODIFIER LE PROFIL (updateMembre)
router.put('/:id', auth, validateObjectId, role.isSelfOrStaff, sanitizeInput, validateMembreUpdate, updateMembre);

// PUT - Valider un membre (Admin / Président)
router.put('/:id/validate', auth, role.hasRole(['Admin', 'President']), validateObjectId, validateMembre);

<<<<<<< HEAD
// PUT - Accepter un membre (Président) avec date d'entretien
router.put('/:id/accept', auth, role.isPresident, validateObjectId, acceptMember);

=======
// PUT - Accepter un membre (Président ou VPFD) avec date d'entretien
router.put('/:id/accept', auth, role.hasRole(['President', 'VPFD']), validateObjectId, acceptMember);

<<<<<<< HEAD
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
// PUT - Rejeter un membre (Président)
router.put('/:id/reject', auth, role.isPresident, validateObjectId, rejectMember);
=======
// PUT - Valider une inscription directement (Président ou VPFD) - sans entretien
router.put('/:id/valider', auth, role.hasRole(['President', 'VPFD']), validateObjectId, validerInscriptionDirect);

// PUT - Rejeter un membre (Président ou VPFD)
router.put('/:id/reject', auth, role.hasRole(['President', 'VPFD']), validateObjectId, rejectMember);
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419

// PUT - Suspendre un membre
router.put('/:id/suspendre', auth, role.hasRole(['President', 'SecretaireGeneral', 'VPFD']), validateObjectId, suspendreMembre);

// PUT - Réactiver un membre
router.put('/:id/reactiver', auth, role.hasRole(['President', 'SecretaireGeneral', 'VPFD']), validateObjectId, reactiverMembre);

// PUT - Bannir un membre (Président seulement)
router.put('/:id/bannir', auth, role.isPresident, validateObjectId, bannirMembre);

// PUT - Bannir un membre (Président seulement)
router.put('/:id/bannir', auth, role.isPresident, validateObjectId, bannirMembre);

// DELETE - Supprimer un membre
router.delete('/:id', auth, role.hasRole(['President', 'SecretaireGeneral', 'VPFD']), validateObjectId, deleteMembre);

// DELETE - Suppression définitive du membre et de ses entretiens (Président seulement)
router.delete('/:id/permanent', auth, role.isPresident, validateObjectId, hardDeleteMembre);

// DELETE - Suppression définitive du membre et de ses entretiens (Président seulement)
router.delete('/:id/permanent', auth, role.isPresident, validateObjectId, hardDeleteMembre);

module.exports = router;
