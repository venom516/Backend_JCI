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
router.post('/media', auth, role.isConseillerMedia, validateTask, createTaskMedia);
router.put('/:id', auth, validateObjectId, updateTask);
router.put('/:id/status', auth, validateObjectId, updateTaskStatus);
router.delete('/:id', auth, role.isPresident, validateObjectId, deleteTask);
router.post('/:id/comments', auth, validateObjectId, addComment);
router.post('/:id/notify', auth, role.isConseillerMedia, notifyMediaTasks);

module.exports = router;