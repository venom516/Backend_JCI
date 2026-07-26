const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { validateEvent, validateObjectId } = require('../middleware/validation');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  participateEvent,
  updateEventStatus,
  getEventCount
} = require('../controllers/eventController');

router.get('/', auth, getEvents);
router.get('/count', getEventCount);
router.get('/:id', auth, validateObjectId, getEventById);
router.post('/', auth, role.isPresident, validateEvent, createEvent);
router.put('/:id', auth, role.isPresident, validateObjectId, updateEvent);
router.delete('/:id', auth, role.isPresident, validateObjectId, deleteEvent);
router.post('/:id/participate', auth, validateObjectId, participateEvent);
router.put('/:id/status', auth, role.isPresident, validateObjectId, updateEventStatus);

module.exports = router;