const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const ctrl = require('../controllers/calendarController');

router.get('/general', auth, ctrl.getGeneralEvents);
router.post('/general', auth, ctrl.createGeneralEvent);
router.put('/general/:id', auth, ctrl.updateGeneralEvent);
router.delete('/general/:id', auth, ctrl.deleteGeneralEvent);

router.get('/media', auth, ctrl.getMediaEvents);
router.post('/media', auth, ctrl.createMediaEvent);
router.put('/media/:id', auth, ctrl.updateMediaEvent);
router.delete('/media/:id', auth, ctrl.deleteMediaEvent);

module.exports = router;
