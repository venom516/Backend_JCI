const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { validateObjectId } = require('../middleware/validation');
const ctrl = require('../controllers/calendarController');
const { validateObjectId } = require('../middleware/validation');

router.get('/general', auth, ctrl.getGeneralEvents);
<<<<<<< HEAD
router.post('/general', auth, ctrl.createGeneralEvent);
router.put('/general/:id', auth, validateObjectId, ctrl.updateGeneralEvent);
router.delete('/general/:id', auth, validateObjectId, ctrl.deleteGeneralEvent);

router.get('/media', auth, ctrl.getMediaEvents);
router.post('/media', auth, ctrl.createMediaEvent);
router.put('/media/:id', auth, validateObjectId, ctrl.updateMediaEvent);
router.delete('/media/:id', auth, validateObjectId, ctrl.deleteMediaEvent);
=======
router.post('/general', auth, role.isPresident, ctrl.createGeneralEvent);
router.put('/general/:id', auth, role.isPresident, validateObjectId, ctrl.updateGeneralEvent);
router.delete('/general/:id', auth, role.isPresident, validateObjectId, ctrl.deleteGeneralEvent);

router.get('/media', auth, role.isConseillerMedia, ctrl.getMediaEvents);
router.post('/media', auth, role.isConseillerMedia, ctrl.createMediaEvent);
router.put('/media/:id', auth, role.isConseillerMedia, validateObjectId, ctrl.updateMediaEvent);
router.delete('/media/:id', auth, role.isConseillerMedia, validateObjectId, ctrl.deleteMediaEvent);
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419

module.exports = router;