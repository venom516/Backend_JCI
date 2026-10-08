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

// Routes publiques
router.get('/public', getPublicNews);
router.get('/:id', validateObjectId, getNewsById);

// Routes protégées
router.get('/', auth, getNews);
router.post('/', auth, role.isConseillerMedia, uploadMedia.single('image'), validateNews, createNews);
router.put('/:id', auth, role.isConseillerMedia, validateObjectId, uploadMedia.single('image'), updateNews);
router.delete('/:id', auth, role.isConseillerMedia, validateObjectId, deleteNews);
router.put('/:id/publish', auth, role.isConseillerMedia, validateObjectId, publishNews);
router.put('/:id/archive', auth, role.isConseillerMedia, validateObjectId, archiveNews);
router.post('/:id/like', auth, validateObjectId, likeNews);
router.post('/:id/comments', auth, validateObjectId, addComment);

module.exports = router;