const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { uploadMedia } = require('../middleware/upload');
const { validateEvent, validateObjectId } = require('../middleware/validation');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  participateEvent,
  updateEventStatus,
  getEventStats,
  getEventCount
} = require('../controllers/eventController');

router.get('/', auth, getEvents);
router.get('/stats', auth, getEventStats);
router.get('/count', getEventCount);
router.get('/:id', auth, validateObjectId, getEventById);
// Consultation ouverte a tout membre connecte (auth seul).
// Gestion reservee au President et au Conseiller Media (isConseillerMedia
// autorise les deux).
router.post('/', auth, role.isConseillerMedia, uploadMedia.single('image'), validateEvent, createEvent);
router.put('/:id', auth, role.isConseillerMedia, validateObjectId, uploadMedia.single('image'), updateEvent);
router.delete('/:id', auth, role.isConseillerMedia, validateObjectId, deleteEvent);
router.post('/:id/participate', auth, validateObjectId, participateEvent);
router.put('/:id/status', auth, role.isConseillerMedia, validateObjectId, updateEventStatus);

module.exports = router;