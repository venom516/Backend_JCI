const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { uploadDocument: uploadDoc } = require('../middleware/upload');
const { validateObjectId } = require('../middleware/validation');
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  approveDocument,
  archiveDocument,
  soumettreDocument,
  rejeterDocument,
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
  uploadDoc.single('fichier'),
  uploadDocument
);

// PUT - Mettre à jour un document
router.put(
  '/:id',
  auth,
  role.isSecretaireGeneral,
  validateObjectId,
  uploadDoc.single('fichier'),
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

// PUT - Soumettre un document (brouillon → en-attente)
router.put(
  '/:id/soumettre',
  auth,
  role.isSecretaireGeneral,
  validateObjectId,
  soumettreDocument
);

// PUT - Rejeter un document (en-attente → brouillon)
router.put(
  '/:id/rejeter',
  auth,
  role.isSecretaireGeneral,
  validateObjectId,
  rejeterDocument
);

module.exports = router;