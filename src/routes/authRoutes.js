const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateRegister, validateLogin, validateVerifyEmail } = require('../middleware/validation');
const { 
  register, 
  login, 
  verifyEmail, 
  verifyEmailByToken,
  getMe,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  sendVerification,
  loginWithToken,
  memberTokenLogin
} = require('../controllers/authController');

// ============================================================
// ROUTES PUBLIQUES
// ============================================================

// POST - Inscription
router.post('/register', validateRegister, register);

// POST - Validation de l'email (code)
router.post('/verify-email', validateVerifyEmail, verifyEmail);

// POST - Validation de l'email par token (lien)
router.post('/verify-email-token', verifyEmailByToken);

// POST - Renvoyer la vérification + notifier le président
router.post('/send-verification', sendVerification);

// POST - Connexion (authentification)
router.post('/login', validateLogin, login);

// POST - Connexion via token (lien magic president)
router.post('/token-login', loginWithToken);

// POST - Connexion via token (lien magic membre)
router.post('/member-token-login', memberTokenLogin);

// POST - Mot de passe oublié (envoi code)
router.post('/forgot-password', forgotPassword);

// POST - Vérifier le code de réinitialisation
router.post('/verify-reset-code', verifyResetCode);

// POST - Réinitialiser le mot de passe
router.post('/reset-password', resetPassword);

// ============================================================
// ROUTES PROTÉGÉES
// ============================================================

// GET - Profil connecté
router.get('/me', auth, getMe);

// POST - Déconnexion
router.post('/logout', auth, logout);

module.exports = router;