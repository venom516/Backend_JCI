const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { validateObjectId } = require('../middleware/validation');
const ctrl = require('../controllers/calendarController');

router.get('/general', auth, ctrl.getGeneralEvents);
router.post('/general', auth, role.isPresident, ctrl.createGeneralEvent);
router.put('/general/:id', auth, role.isPresident, validateObjectId, ctrl.updateGeneralEvent);
router.delete('/general/:id', auth, role.isPresident, validateObjectId, ctrl.deleteGeneralEvent);

router.get('/media', auth, role.isConseillerMedia, ctrl.getMediaEvents);
router.post('/media', auth, role.isConseillerMedia, ctrl.createMediaEvent);
router.put('/media/:id', auth, role.isConseillerMedia, validateObjectId, ctrl.updateMediaEvent);
router.delete('/media/:id', auth, role.isConseillerMedia, validateObjectId, ctrl.deleteMediaEvent);

module.exports = router;