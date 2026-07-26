const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const {
  getPresidentDashboard,
  getSGDashboard,
  getMediaDashboard,
  getAdminDashboard,
  getMembreDashboard
} = require('../controllers/dashboardController');

// Route générique selon le rôle
router.get('/me', auth, async (req, res) => {
  try {
    const role = req.userRole;
    let dashboard;
    switch (role) {
      case 'President':
        dashboard = await getPresidentDashboard(req, res);
        break;
      case 'SecretaireGeneral':
        dashboard = await getSGDashboard(req, res);
        break;
      case 'ConseillerMedia':
        dashboard = await getMediaDashboard(req, res);
        break;
      case 'Admin':
        dashboard = await getAdminDashboard(req, res);
        break;
      default:
        dashboard = await getMembreDashboard(req, res);
    }
    return dashboard;
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

router.get('/president', auth, role.isPresident, getPresidentDashboard);
router.get('/sg', auth, role.isSecretaireGeneral, getSGDashboard);
router.get('/media', auth, role.isConseillerMedia, getMediaDashboard);
router.get('/admin', auth, role.isUserManager, getAdminDashboard);
router.get('/membre', auth, getMembreDashboard);

module.exports = router;