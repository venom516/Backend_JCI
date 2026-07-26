const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const upload = require('../middleware/upload');
const { validateObjectId } = require('../middleware/validation');
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  approveDocument,
  archiveDocument,
  downloadDocument
} = require('../controllers/documentController');

// ============================================================
// ROUTES PUBLIQUES
// ============================================================

// ============================================================
// ROUTES PROTÉGÉES
// ============================================================

// GET - Liste des documents
router.get('/', auth, getDocuments);

// GET - Document par ID
router.get('/:id', auth, validateObjectId, getDocumentById);

// GET - Télécharger un document
router.get('/:id/download', auth, validateObjectId, downloadDocument);

// POST - Uploader un document (SG ou Président)
router.post(
  '/',
  auth,
  role.isSecretaireGeneral,
  upload.single('fichier'),
  uploadDocument
);

// PUT - Mettre à jour un document
router.put(
  '/:id',
  auth,
  role.isSecretaireGeneral,
  validateObjectId,
  upload.single('fichier'),
  updateDocument
);

// DELETE - Supprimer un document
router.delete(
  '/:id',
  auth,
  role.isSecretaireGeneral,
  validateObjectId,
  deleteDocument
);

// PUT - Approuver un document
router.put(
  '/:id/approve',
  auth,
  role.isSecretaireGeneral,
  validateObjectId,
  approveDocument
);

// PUT - Archiver un document
router.put(
  '/:id/archive',
  auth,
  role.isSecretaireGeneral,
  validateObjectId,
  archiveDocument
);

module.exports = router;