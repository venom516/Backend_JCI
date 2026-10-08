// backend/src/controllers/authController.js

const Membre = require('../models/Membre');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const crypto = require('crypto');
const { 
  sendRegistrationEmail,
  sendNewMemberNotificationToPresident,
  sendForgotPasswordCode
} = require('../config/email');
const { telephoneRenseigne, regexTelephone } = require('../utils/telephone');

// ============================================================
// GENERATE TOKEN
// ============================================================
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Source unique des statuts qui interdisent l'acces. auth.js porte les memes
// regles avec des messages differents : toute divergence ici doit etre
// reportee la-bas aussi.
const STATUTS_ACCES_REFUSES = ['banni', 'suspendu', 'refusé'];

// Tolérance de 60 s sur l'expiration des codes de vérification et de
// réinitialisation : absorbe le décalage entre l'horloge du serveur et celle
// qui a généré le code. Comparée ainsi, une expiration survenue il y a moins
// d'une minute est encore acceptée.
const TOLERANCE_CODE_MS = 60 * 1000;
const expirationCode = () => new Date(Date.now() - TOLERANCE_CODE_MS);

// ============================================================
// GENERATE VALIDATION CODE
// ============================================================
const generateValidationCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Le code de reinitialisation est stocke hache : une fuite de la base ne
// permet pas de reinitialiser le mot de passe d'un compte (§1.9.7).
const hashResetCode = (code) =>
  crypto.createHash('sha256').update(String(code)).digest('hex');

const verifyResetCode = (code, storedHash) => {
  if (!storedHash) return false;
  const a = Buffer.from(hashResetCode(code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

// ============================================================
// 1. INSCRIPTION
// ============================================================
exports.register = async (req, res) => {
  try {
    console.log('📝 Tentative d\'inscription:', req.body.email);

    const { nom, prenom, email, password, telephone, adresse, sexe, situationProfessionnelle, dateNaissance, urlFacebook, urlLinkedIn, langues, competences, pointsForts, societe, hobbies, association, connaissanceZone, connaissanceJCI, pointsDeveloppement, parrainId, parrain } = req.body;

    // ✅ Validation
    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un email valide'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // ✅ Calculer l'âge si dateNaissance fournie
    let age = null;
    if (dateNaissance) {
      const birthDate = new Date(dateNaissance);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    }

    // ✅ Vérifier l'âge minimum (18 ans)
    if (age !== null && age < 18) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez avoir au moins 18 ans pour créer un compte JCI'
      });
    }

    // ✅ Vérifier l'âge maximum (40 ans)
    if (age !== null && age > 40) {
      return res.status(400).json({
        success: false,
        message: "L'inscription est réservée aux personnes âgées de 18 à 40 ans"
      });
    }

    // ✅ Vérifier le parrain si fourni
    if (parrainId) {
      const parrainExiste = await Membre.findById(parrainId);
      if (!parrainExiste) {
        return res.status(400).json({
          success: false,
          message: 'Le parrain sélectionné n\'existe pas'
        });
      }
    }

    // ✅ Vérifier si l'email existe déjà
    // Un compte archivé (supprimé) ou refusé peut se réinscrire normalement :
    // son compte est réactivé et repart en statut "en cours" comme un nouvel inscrit
    const membreExistant = await Membre.findOne({ email: email.toLowerCase() });
    const compteReinscriptible = membreExistant && (membreExistant.archiver || membreExistant.status === 'refusé');
    if (membreExistant && !compteReinscriptible) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // ✅ Unicité du téléphone : comparaison en chiffres seuls, sinon
    // "98 123 456" et "98123456" passent toutes les deux.
    if (telephoneRenseigne(telephone)) {
      const telephoneOccupe = await Membre.findOne({ telephone: regexTelephone(telephone) }).select('_id');
      if (telephoneOccupe) {
        return res.status(400).json({
          success: false,
          message: 'Ce numéro de téléphone est déjà utilisé'
        });
      }
    }

    // ✅ Générer token de vérification (JWT)
    const verificationToken = jwt.sign(
      { email: email.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // ✅ Déterminer le rôle
    let role = 'Membre';

    // ✅ Créer le membre
    const membreData = {
      nom,
      prenom,
      email: email.toLowerCase(),
      password,
      telephone: telephone || '',
      adresse: adresse || '',
      sexe: sexe || '',
      situationProfessionnelle: situationProfessionnelle || 'Autre',
      dateNaissance: dateNaissance || undefined,
      urlFacebook: urlFacebook || '',
      urlLinkedIn: urlLinkedIn || '',
      langues: langues || '',
      competences: competences || '',
      pointsForts: pointsForts || '',
      societe: societe || '',
      hobbies: hobbies || '',
      association: association || '',
      connaissanceZone: connaissanceZone || '',
      connaissanceJCI: connaissanceJCI || '',
      pointsDeveloppement: pointsDeveloppement || '',
      parrainId: parrainId || undefined,
      parrain: parrain || '',
      status: 'en-attente',
      isEmailVerified: false,
      role
    };

    let reinscription = false;
    let membre;
    if (membreExistant) {
      // Réinscription d'un compte archivé ou refusé : on réinitialise son compte
      // comme une nouvelle inscription (statut "en cours", compte déverrouillé)
      reinscription = true;
      membre = membreExistant;
      Object.assign(membre, membreData);
      membre.archiver = false;
      membre.isEmailVerified = false;
      membre.status = 'en-attente';
      membre.codeValidation = undefined;
      membre.codeValidationExpire = undefined;
      membre.resetPasswordToken = undefined;
      membre.resetPasswordExpires = undefined;
      await membre.save();
      console.log(`♻️ Compte réinscrit: ${membre.email}`);
    } else {
      membre = await Membre.create(membreData);
      console.log(`✅ Membre créé: ${membre.email}`);
    }

    // ✅ Envoyer email au membre (avec lien de vérification)
    try {
      await sendRegistrationEmail(email, nom, prenom, verificationToken);
      console.log(`📧 Email de confirmation envoyé à ${email} avec lien de vérification`);
    } catch (emailError) {
      console.error('❌ Erreur envoi email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: reinscription
        ? '✅ Réinscription réussie ! Votre compte est en cours de validation. Veuillez vérifier votre email.'
        : '✅ Inscription réussie ! Veuillez vérifier votre email.',
      data: {
        id: membre._id,
        nom: membre.nom,
        prenom: membre.prenom,
        email: membre.email,
        status: membre.status
      }
    });

  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
};

// ============================================================
// 2. VALIDER L'EMAIL
// ============================================================
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email et code de validation requis'
      });
    }

    const membre = await Membre.findOneAndUpdate(
      {
        email: email.toLowerCase(),
        codeValidation: code,
        codeValidationExpire: { $gt: expirationCode() },
        isEmailVerified: false
      },
      {
        $set: { isEmailVerified: true, status: 'en-attente' },
        $unset: { codeValidation: '', codeValidationExpire: '' }
      },
      { new: true }
    );

    if (!membre) {
      return res.status(400).json({
        success: false,
        message: 'Code de validation invalide, expiré ou email déjà vérifié'
      });
    }

    // ✅ Notifier le président
    const president = await Membre.findOne({ role: 'President' });
    if (president && president.email) {
      await sendNewMemberNotificationToPresident(president.email, membre);
    }

    res.json({
      success: true,
      message: '✅ Email validé avec succès. Votre compte est en attente de validation.'
    });
  } catch (error) {
    console.error('❌ Erreur validation email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 2b. VALIDER L'EMAIL PAR TOKEN (depuis le lien)
// ============================================================
exports.verifyEmailByToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de validation requis'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Token de validation invalide ou expiré'
      });
    }

    const membre = await Membre.findOne({ email: decoded.email });
    if (!membre) {
      return res.status(400).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    // Vérification atomique pour éviter les doublons (race condition React StrictMode)
    const updated = await Membre.findOneAndUpdate(
      { _id: membre._id, isEmailVerified: false },
      { $set: { isEmailVerified: true } },
      { new: true }
    );

    if (!updated) {
      return res.json({
        success: true,
        message: '✅ Email déjà vérifié'
      });
    }

    const isEmailChange = membre.status === 'suspendu';
    const isNewMember = !membre.isEmailVerified;

    if (isEmailChange) {
      await Membre.updateOne({ _id: membre._id }, { $set: { status: 'actif' } });
    }

    if (isNewMember) {
      try {
        const president = await Membre.findOne({ role: 'President' });
        if (president && president.email) {
          await sendNewMemberNotificationToPresident(president.email, updated);
          console.log(`📧 Notification envoyée au Président (${president.email})`);
        }
      } catch (notifError) {
        console.error('❌ Erreur notification président:', notifError);
      }
    }

    res.json({
      success: true,
      message: isEmailChange
        ? '✅ Nouvel email vérifié avec succès. Votre compte est maintenant actif.'
        : '✅ Email validé avec succès. Votre compte est en attente de validation par le Président.'
    });
  } catch (error) {
    console.error('❌ Erreur validation email par token:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 3. CONNEXION
// ============================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir email et mot de passe'
      });
    }

    const membre = await Membre.findOne({ email: email.toLowerCase() }).select('+password');
    if (!membre) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    if (membre.status === 'banni') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été banni'
      });
    }

    if (membre.status === 'suspendu') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est suspendu'
      });
    }

<<<<<<< HEAD
    if (membre.status === 'banni') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été banni'
      });
    }

=======
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
    if (membre.archiver) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été archivé'
      });
    }

<<<<<<< HEAD
    if (membre.status === 'non-inscrit' || membre.status === 'non-validé' || membre.status === 'en-attente' || membre.status === 'refusé') {
=======
    if (membre.status === 'non-validé' || membre.status === 'en-attente' || membre.status === 'refusé') {
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
      return res.status(403).json({
        success: false,
        message: 'Votre compte est en attente de validation'
      });
    }

    const isMatch = await membre.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // ✅ Transition automatique des rôles
    const today = new Date();
    const currentYear = today.getFullYear();

    // President → PPI : si mandat > 1 an
    if (membre.role === 'President' && membre.datePriseFonction) {
      const finMandat = new Date(membre.datePriseFonction);
      finMandat.setFullYear(finMandat.getFullYear() + 1);
      if (today >= finMandat) {
        membre.role = 'PPI';
        membre.datePriseFonction = today;
      }
    }

    // PPI → PP : si rôle PPI depuis ≥ 1 an
    if (membre.role === 'PPI' && membre.datePriseFonction) {
      const unAn = new Date(membre.datePriseFonction);
      unAn.setFullYear(unAn.getFullYear() + 1);
      if (today >= unAn) {
        membre.role = 'PP';
        membre.datePriseFonction = today;
      }
    }

    // Définir mandatAnnee si President, PPI ou PP et pas encore défini
    if (['President', 'PPI', 'PP'].includes(membre.role) && !membre.mandatAnnee) {
      if (membre.role === 'President') {
        membre.mandatAnnee = currentYear;
      } else if (membre.role === 'PPI') {
        membre.mandatAnnee = currentYear - 1;
      } else if (membre.role === 'PP') {
        membre.mandatAnnee = currentYear - 2;
      }
    }

    // Vérifier mandat VPFD/VPPRE/Tresorie
    const MANDAT_ROLES = ['VPFD', 'VPPRE', 'Tresorie'];
    let mandatExpired = false;
    if (MANDAT_ROLES.includes(membre.role) && membre.mandatFin) {
      if (today > new Date(membre.mandatFin)) {
        mandatExpired = true;
        // Vérifier s'il y a un autre membre avec ce même rôle
        const autrePorteur = await Membre.findOne({
          role: membre.role,
          _id: { $ne: membre._id },
          status: 'actif',
          mandatFin: { $gt: today }
        });
        if (autrePorteur) {
          // Un successeur a déjà pris le rôle → rétrograder en Membre
          membre.role = 'Membre';
          membre.datePriseFonction = undefined;
          membre.mandatFin = undefined;
          membre.mandatAnnee = undefined;
        }
        // Sinon, le mandat est expiré mais pas de successeur → laisser le rôle actif
      }
    }

    // ✅ Vérification Sénateur automatique
    if (membre.dateNaissance) {
      const birthDate = new Date(membre.dateNaissance);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age >= 40 && membre.role !== 'Sénateur') {
        membre.role = 'Sénateur';
      }
    }

    membre.lastLogin = new Date();
    await membre.save();

    const token = generateToken(membre._id);

    let roleMessage = '';
    switch (membre.role) {
      case 'President':
        roleMessage = '👑 Bienvenue Président !';
        break;
      case 'SecretaireGeneral':
        roleMessage = '📋 Bienvenue Secrétaire Général !';
        break;
      case 'ConseillerMedia':
        roleMessage = '📢 Bienvenue Conseiller Media !';
        break;
      case 'Admin':
        roleMessage = '🔧 Bienvenue Administrateur !';
        break;
      case 'Sénateur':
        roleMessage = '🎖️ Bienvenue Sénateur !';
        break;
      case 'PPI':
        roleMessage = '🌟 Bienvenue Past President Immédiat !';
        break;
      case 'PP':
        roleMessage = '🌟 Bienvenue Past President !';
        break;
      case 'VPFD':
        roleMessage = '📊 Bienvenue VPFD !';
        break;
      case 'VPPRE':
        roleMessage = '📋 Bienvenue VPPRE !';
        break;
      case 'Tresorie':
        roleMessage = '💰 Bienvenue Trésorier !';
        break;
      default:
        roleMessage = '👤 Bienvenue Membre !';
    }

    res.json({
      success: true,
      message: roleMessage,
      data: {
        token,
        membre: {
          id: membre._id,
          nom: membre.nom,
          prenom: membre.prenom,
          email: membre.email,
          role: membre.role,
          status: membre.status,
          mandatExpired
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// 4. GET ME
// ============================================================
exports.getMe = async (req, res) => {
  try {
    const membre = await Membre.findById(req.userId)
      .select('-codeValidation -codeValidationExpire -resetPasswordToken -resetPasswordExpires');
    
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: membre
    });
  } catch (error) {
    console.error('❌ Erreur getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 5. LOGOUT
// ============================================================
exports.logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('❌ Erreur logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 6. FORGOT PASSWORD - ENVOYER LE CODE
// ============================================================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un email valide'
      });
    }

    const membre = await Membre.findOne({ email: email.toLowerCase() });
    if (!membre) {
      return res.json({
        success: true,
        message: 'Si cet email existe, un code de réinitialisation a été envoyé.'
      });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    membre.resetPasswordToken = hashResetCode(code);
    membre.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await membre.save();

    try {
      await sendForgotPasswordCode(membre.email, membre.prenom, membre.nom, code);
    } catch (emailError) {
      console.error('❌ Erreur envoi email forgot password:', emailError);
    }

    res.json({
      success: true,
      message: 'Si cet email existe, un code de réinitialisation a été envoyé.'
    });
  } catch (error) {
    console.error('❌ Erreur forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 7. VÉRIFIER LE CODE DE RÉINITIALISATION
// ============================================================
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email et code requis'
      });
    }

    const membre = await Membre.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: { $exists: true },
      resetPasswordExpires: { $gt: expirationCode() }
    });

    if (!membre) {
      return res.status(400).json({
        success: false,
        message: 'Code invalide ou expiré'
      });
    }

    if (!verifyResetCode(code, membre.resetPasswordToken)) {
      return res.status(400).json({
        success: false,
        message: 'Code invalide ou expiré'
      });
    }

    res.json({
      success: true,
      message: 'Code valide. Vous pouvez réinitialiser votre mot de passe.'
    });
  } catch (error) {
    console.error('❌ Erreur verifyResetCode:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 8. RÉINITIALISER LE MOT DE PASSE
// ============================================================
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Les mots de passe ne correspondent pas'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    const membre = await Membre.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: { $exists: true },
      resetPasswordExpires: { $gt: expirationCode() }
    }).select('+password +resetPasswordToken');

    if (!membre) {
      return res.status(400).json({
        success: false,
        message: 'Code invalide ou expiré'
      });
    }

    if (!verifyResetCode(code, membre.resetPasswordToken)) {
      return res.status(400).json({
        success: false,
        message: 'Code invalide ou expiré'
      });
    }

    const isSame = await membre.comparePassword(newPassword);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit être différent de l\'ancien'
      });
    }

    membre.password = newPassword;
    // Invalidation de toutes les sessions : un JWT emis avant cet instant est
    // rejete par auth. Sans cela, un ancien token reste valide 7 jours apres
    // une reinitialisation de mot de passe.
    membre.passwordChangedAt = new Date();
    membre.resetPasswordToken = undefined;
    membre.resetPasswordExpires = undefined;
    await membre.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès !'
    });
  } catch (error) {
    console.error('❌ Erreur resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 9. ENVOYER EMAIL DE VÉRIFICATION + NOTIFIER LE PRÉSIDENT
// ============================================================
exports.sendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }

    const membre = await Membre.findOne({ email: email.toLowerCase() });
    if (!membre) {
      return res.status(404).json({ success: false, message: 'Membre non trouvé' });
    }

    if (membre.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email déjà vérifié' });
    }

    const verificationToken = jwt.sign(
      { email: email.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await sendRegistrationEmail(membre.email, membre.nom, membre.prenom, verificationToken);

    res.json({
      success: true,
      message: 'Email de vérification envoyé. Vérifiez votre boîte de réception.'
    });
  } catch (error) {
    console.error('❌ Erreur sendVerification:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi' });
  }
};

// ============================================================
// LOGIN VIA TOKEN (magic link)
// ============================================================
exports.loginWithToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const membre = await Membre.findById(decoded.id).select('-codeValidation -codeValidationExpire -resetPasswordToken -resetPasswordExpires');

    if (!membre) {
      return res.status(404).json({ success: false, message: 'Membre introuvable' });
    }

    if (membre.role !== 'President') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const newToken = generateToken(membre._id);

    res.json({
      success: true,
      data: { token: newToken, membre }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Lien expiré. Veuillez vous connecter.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Lien invalide. Veuillez vous connecter.' });
    }
    console.error('❌ Erreur loginWithToken:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// MEMBER-LINK TOKEN LOGIN
// ============================================================
exports.memberTokenLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const membre = await Membre.findById(decoded.id).select('-codeValidation -codeValidationExpire -resetPasswordToken -resetPasswordExpires');

    // Un compte banni, suspendu, refusé ou archivé ne doit jamais obtenir de JWT,
    // même avec un lien membre valide (§1.9.3).
    if (!membre || membre.archiver || STATUTS_ACCES_REFUSES.includes(membre.status)) {
      return res.status(403).json({ success: false, message: 'Compte indisponible' });
    }
    // La claim type est signe à la génération ; sans ce contrôle un jeton de
    // vérification d'email serait structurellement interchangeable.
    if (decoded.type !== 'member-link') {
      return res.status(403).json({ success: false, message: 'Jeton invalide' });
    }

    const newToken = generateToken(membre._id);

    res.json({
      success: true,
      data: { token: newToken, membre }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Lien expiré. Veuillez vous connecter.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Lien invalide. Veuillez vous connecter.' });
    }
    console.error('❌ Erreur memberTokenLogin:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};