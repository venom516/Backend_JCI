const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { getConfig, updateConfig, removeGroupPhoto } = require('../controllers/siteConfigController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/', getConfig);
router.put('/', auth, role.isPresident, upload.single('groupPhoto'), updateConfig);
router.delete('/group-photo', auth, role.isPresident, removeGroupPhoto);

module.exports = router;
