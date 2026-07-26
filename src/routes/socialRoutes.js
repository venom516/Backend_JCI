const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const auth = require('../middleware/auth');

router.get('/profiles', socialController.getProfiles);
router.get('/feed', socialController.getFeed);
router.get('/overrides', socialController.getOverrides);
router.put('/overrides', auth, socialController.updateOverrides);

module.exports = router;
