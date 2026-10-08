const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { uploadMedia } = require('../middleware/upload');
const { validateNews, validateObjectId } = require('../middleware/validation');
const {
  createNews,
  getNews,
  getNewsById,
  updateNews,
  deleteNews,
  publishNews,
  archiveNews,
  getPublicNews,
  likeNews,
  addComment
} = require('../controllers/newsController');

// Routes publiques : lecture anonyme restreinte au contenu publie (voir
// getNewsById). optionalAuth permet de compter une vue seulement si le
// visiteur est really connecte.
router.get('/public', getPublicNews);
<<<<<<< HEAD
router.get('/:id', validateObjectId, getNewsById);

// Routes protégées
router.get('/', auth, getNews);
router.post('/', auth, role.isConseillerMedia, uploadMedia.single('image'), validateNews, createNews);
router.put('/:id', auth, role.isConseillerMedia, validateObjectId, uploadMedia.single('image'), updateNews);
=======
<<<<<<< HEAD
router.get('/:id', validateObjectId, getNewsById);

// Routes protégées
router.get('/', auth, getNews);
router.post('/', auth, role.isConseillerMedia, uploadMedia.single('image'), validateNews, createNews);
router.put('/:id', auth, role.isConseillerMedia, validateObjectId, uploadMedia.single('image'), updateNews);
=======
router.get('/public/:id', auth.optionalAuth, validateObjectId, getNewsById);

// GET /:id est public : la restriction publie/brouillon est appliquee dans le
// controleur, un membre connecte pouvant lire ses propres brouillons.
router.get('/:id', auth.optionalAuth, validateObjectId, getNewsById);

// Routes protégées
router.get('/', auth, getNews);
router.post('/', auth, role.isConseillerMedia, validateNews, createNews);
router.put('/:id', auth, role.isConseillerMedia, validateObjectId, updateNews);
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
router.delete('/:id', auth, role.isConseillerMedia, validateObjectId, deleteNews);
router.put('/:id/publish', auth, role.isConseillerMedia, validateObjectId, publishNews);
router.put('/:id/archive', auth, role.isConseillerMedia, validateObjectId, archiveNews);
router.post('/:id/like', auth, validateObjectId, likeNews);
router.post('/:id/comments', auth, validateObjectId, addComment);

module.exports = router;