const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const {
  submitContact,
  getContacts,
  markAsRead,
  deleteContact
} = require('../controllers/contactController');

// POST - Soumettre un message de contact (public)
router.post('/', submitContact);

// GET - Liste des messages (Président)
router.get('/', auth, role.isPresident, getContacts);

// PUT - Marquer comme lu (Président)
router.put('/:id/read', auth, role.isPresident, markAsRead);

// DELETE - Supprimer un message (Président)
router.delete('/:id', auth, role.isPresident, deleteContact);

module.exports = router;
