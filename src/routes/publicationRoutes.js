const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const upload = require('../middleware/upload');
const { validatePublication, validateObjectId } = require('../middleware/validation');
const {
  createPublication,
  getPublications,
  getPublicationById,
  updatePublication,
  deletePublication,
  publishPublication,
  archivePublication,
  updatePublicationStats,
  publishDirect
} = require('../controllers/publicationController');

router.get('/', auth, getPublications);
router.get('/:id', auth, validateObjectId, getPublicationById);
const handleMulterError = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors du téléversement du fichier'
    });
  }
  next();
};

router.post('/', auth, role.isConseillerMedia, (req, res, next) => {
  upload.single('fichier')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, validatePublication, createPublication);

router.put('/:id', auth, role.isConseillerMedia, (req, res, next) => {
  upload.single('fichier')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, validateObjectId, updatePublication);
router.delete('/:id', auth, role.isConseillerMedia, validateObjectId, deletePublication);
router.put('/:id/publish', auth, role.isConseillerMedia, validateObjectId, publishPublication);
router.put('/:id/archive', auth, role.isConseillerMedia, validateObjectId, archivePublication);
router.put('/:id/stats', auth, role.isConseillerMedia, validateObjectId, updatePublicationStats);

router.post('/publish-direct', auth, role.isConseillerMedia, (req, res, next) => {
  upload.array('fichiers', 10)(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, publishDirect);

module.exports = router;