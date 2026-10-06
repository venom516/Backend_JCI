const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
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
router.get('/public/:id', auth.optionalAuth, validateObjectId, getNewsById);

// GET /:id est public : la restriction publie/brouillon est appliquee dans le
// controleur, un membre connecte pouvant lire ses propres brouillons.
router.get('/:id', auth.optionalAuth, validateObjectId, getNewsById);

// Routes protégées
router.get('/', auth, getNews);
router.post('/', auth, role.isConseillerMedia, validateNews, createNews);
router.put('/:id', auth, role.isConseillerMedia, validateObjectId, updateNews);
router.delete('/:id', auth, role.isConseillerMedia, validateObjectId, deleteNews);
router.put('/:id/publish', auth, role.isConseillerMedia, validateObjectId, publishNews);
router.put('/:id/archive', auth, role.isConseillerMedia, validateObjectId, archiveNews);
router.post('/:id/like', auth, validateObjectId, likeNews);
router.post('/:id/comments', auth, validateObjectId, addComment);

module.exports = router;