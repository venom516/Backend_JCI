const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/calendarController');
const { validateObjectId } = require('../middleware/validation');

router.get('/general', auth, ctrl.getGeneralEvents);
router.post('/general', auth, ctrl.createGeneralEvent);
router.put('/general/:id', auth, validateObjectId, ctrl.updateGeneralEvent);
router.delete('/general/:id', auth, validateObjectId, ctrl.deleteGeneralEvent);

router.get('/media', auth, ctrl.getMediaEvents);
router.post('/media', auth, ctrl.createMediaEvent);
router.put('/media/:id', auth, validateObjectId, ctrl.updateMediaEvent);
router.delete('/media/:id', auth, validateObjectId, ctrl.deleteMediaEvent);

module.exports = router;
