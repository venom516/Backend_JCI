// backend/src/routes/taskRoutes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { validateTask, validateObjectId } = require('../middleware/validation');
const {
  createTask,
  createTaskMedia,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addComment,
  getCalendarTasks,
  getMediaCalendar,
  notifyMediaTasks,
  getTaskStats,
  getTaskCount,
} = require('../controllers/taskController');

// ✅ Routes calendrier DOIVENT être AVANT les routes avec :id
router.get('/calendar', auth, getCalendarTasks);
router.get('/media-calendar', auth, getMediaCalendar);

// Routes publiques
router.get('/', auth, getTasks);
router.get('/stats', auth, getTaskStats);
router.get('/count', getTaskCount);
router.get('/:id', auth, validateObjectId, getTaskById);

// Routes protégées
router.post('/', auth, validateTask, createTask);
router.post('/media', auth, role.hasRole(['President', 'ConseillerMedia', 'VPFD']), validateTask, createTaskMedia);
router.put('/:id', auth, validateObjectId, updateTask);
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
router.put('/:id/status', auth, validateObjectId, updateTaskStatus);
router.delete('/:id', auth, role.isPresident, validateObjectId, deleteTask);
=======
router.delete('/:id', auth, role.hasRole(['President', 'VPFD']), validateObjectId, deleteTask);
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
router.post('/:id/comments', auth, validateObjectId, addComment);
router.post('/:id/notify', auth, role.hasRole(['President', 'ConseillerMedia', 'VPFD']), notifyMediaTasks);

module.exports = router;