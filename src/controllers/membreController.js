const Membre = require('../models/Membre');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');
const Entretien = require('../models/Entretien');
const Task = require('../models/Task');
const Event = require('../models/Event');
const News = require('../models/News');
const { 
  sendEmail,
  sendEmailChangeVerification,
  sendValidationAcceptedEmail,
  sendValidationConfirmationToPresident,
  sendInterviewEmail,
  sendRejectionEmail,
  sendValidationAccepteeEmail,
  sendSuspensionEmail,
  sendReactivationEmail
} = require('../config/email');

// ============================================================
// Rôles uniques (ne peuvent être attribués qu'à une seule personne)
// ============================================================
const UNIQUE_ROLES = [
  'President',
  'Conseiller Juridique',
  'ConseillerMedia',
  'Conseiller IT',
  'Conseiller 100% Efficacité',
  'PPI',
  'Directeur Exécutif'
];

// ============================================================
// 1. GET MEMBRES - Liste des membres
// ============================================================
exports.getMembres = async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 10000 } = req.query;
    const filter = {};
    
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Si membre normal, ne voir que son profil
    if (req.userRole === 'Membre') filter._id = req.userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [membres, total] = await Promise.all([
      Membre.find(filter)
        .select('-password -codeValidation -codeValidationExpire')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Membre.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: membres
    });
  } catch (error) {
    console.error('❌ Erreur getMembres:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// 2. GET MEMBRE BY ID
// ============================================================
exports.getMembreById = async (req, res) => {
  try {
    const membre = await Membre.findById(req.params.id)
      .select('-password -codeValidation -codeValidationExpire');
    
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    if (req.userRole !== 'President' && req.userRole !== 'SecretaireGeneral' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.json({
      success: true,
      data: membre
    });
  } catch (error) {
    console.error('❌ Erreur getMembreById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 3. UPDATE MEMBRE - Modifier le profil
// ============================================================
exports.updateMembre = async (req, res) => {
  try {
    if (req.userRole !== 'President' && req.userRole !== 'SecretaireGeneral' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    // Vérifier si l'email change
    const emailChanged = req.body.email && req.body.email !== membre.email;
    const oldEmail = membre.email;
    const newEmail = req.body.email;

    // Si l'email change, vérifier s'il est déjà pris
    if (emailChanged) {
      const emailExistant = await Membre.findOne({ email: newEmail });
      if (emailExistant && emailExistant._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    // Vérifier l'unicité du téléphone si modifié
    if (req.body.telephone) {
      const telExistant = await Membre.findOne({ telephone: req.body.telephone, _id: { $ne: req.params.id } });
      if (telExistant) {
        return res.status(400).json({
          success: false,
          message: 'Ce numéro de téléphone est déjà utilisé'
        });
      }
    }

    // Si changement de rôle (seul l'Admin ou le Président peut le faire)
    if (req.body.role && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'administrateur peut modifier les rôles'
      });
    }

    // Rotation automatique des rôles Président
    if (req.body.role === 'President' && req.body.role !== membre.role) {
      const oldPresident = await Membre.findOne({ role: 'President', _id: { $ne: req.params.id }, status: { $ne: 'refusé' } });
      const oldPPI = await Membre.findOne({ role: 'PPI', status: { $ne: 'refusé' } });
      if (oldPPI) {
        oldPPI.role = 'PP';
        oldPPI.datePriseFonction = new Date();
        oldPPI.mandatAnnee = new Date().getFullYear() - 2;
        await oldPPI.save();
      }
      if (oldPresident) {
        oldPresident.role = 'PPI';
        oldPresident.datePriseFonction = new Date();
        oldPresident.mandatAnnee = new Date().getFullYear() - 1;
        await oldPresident.save();
      }
      req.body.mandatAnnee = new Date().getFullYear();
      req.body.datePriseFonction = new Date();
    } else if (req.body.role && UNIQUE_ROLES.includes(req.body.role) && req.body.role !== 'President') {
      const roleHolder = await Membre.findOne({ role: req.body.role, _id: { $ne: req.params.id }, status: { $ne: 'refusé' } });
      if (roleHolder) {
        return res.status(400).json({
          success: false,
          message: 'Ce rôle est déjà attribué à un autre membre. Veuillez d\'abord le retirer avant de l\'attribuer à une nouvelle personne.'
        });
      }
    }

    // Si changement de statut (seul l'Admin ou le Président peut le faire)
    if (req.body.status && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'administrateur peut modifier le statut'
      });
    }

    // Si email changé - Désactiver la vérification et suspendre le compte
    if (emailChanged) {
      req.body.isEmailVerified = false;
      req.body.status = 'suspendu';
    }

    // Upload photo to Cloudinary if base64
    if (req.body.photo && req.body.photo.startsWith('data:')) {
      const result = await cloudinary.uploader.upload(req.body.photo, { folder: 'jci-uploads/members' });
      req.body.photo = result.secure_url;
    }

    // Extraire le password pour le traiter via le hook pre('save')
    const { password, ...updateData } = req.body;

    let updated;
    if (password) {
      // Utiliser save() pour que le hook de hashage s'exécute
      Object.assign(membre, updateData);
      membre.password = password;
      await membre.save();
      updated = membre.toObject();
      delete updated.password;
      delete updated.codeValidation;
      delete updated.codeValidationExpire;
    } else {
      updated = await Membre.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password -codeValidation -codeValidationExpire');
    }

    // Vérification Sénateur automatique
    if (updated && updated.dateNaissance) {
      const birthDate = new Date(updated.dateNaissance);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age >= 40 && updated.role !== 'Sénateur') {
        await Membre.findByIdAndUpdate(updated._id, { role: 'Sénateur' });
        updated.role = 'Sénateur';
      }
    }

    // Si email changé - Envoyer email de vérification + suspenser le compte
    if (emailChanged) {
      // Générer un token JWT pour la vérification du nouvel email
      const verificationToken = jwt.sign(
        { email: newEmail },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Email de vérification à la nouvelle adresse (avec bouton)
      try {
        await sendEmailChangeVerification(newEmail, updated.prenom, updated.nom, verificationToken);
        console.log(`📧 Email de vérification envoyé à ${newEmail}`);
      } catch (emailError) {
        console.error('❌ Erreur envoi email vérification:', emailError.message);
      }

      // Email de sécurité à l'ancienne adresse
      try {
        await sendEmail(
          oldEmail,
          '🔐 Votre email a été modifié - JCI Sidi Mansour',
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #f57c00;">🔐 Votre email a été modifié</h2>
            <p>Bonjour <strong>${updated.prenom} ${updated.nom}</strong>,</p>
            <p>Votre adresse email a été modifiée sur la plateforme JCI Sidi Mansour.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Nouvel email :</strong> ${newEmail}</p>
            </div>
            <p>Si vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement l'association.</p>
            <hr style="border: 1px solid #e0e0e0;" />
            <p style="color: #999; font-size: 11px;">JCI Sidi Mansour - Plateforme de gestion interne</p>
          </div>
          `
        );
        console.log(`📧 Email de sécurité envoyé à ${oldEmail}`);
      } catch (emailError) {
        console.error('❌ Erreur envoi email sécurité:', emailError.message);
      }
    }

    res.json({
      success: true,
      message: emailChanged 
        ? '✅ Profil mis à jour. Un email de vérification a été envoyé à la nouvelle adresse. Le compte est suspendu jusqu\'à la vérification.'
        : '✅ Profil mis à jour avec succès.',
      data: updated
    });

  } catch (error) {
    console.error('❌ Erreur updateMembre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// 4. VALIDATE MEMBRE - Valider un membre + Créer entretien
// ============================================================
exports.validateMembre = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'administrateur ou le président peut valider les inscriptions'
      });
    }

    const { action } = req.body;
    if (!action || !['validate', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action invalide. Utilisez "validate" ou "reject"'
      });
    }

    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    if (membre.status !== 'en-attente' && membre.status !== 'non-validé') {
      return res.status(400).json({
        success: false,
        message: 'Ce membre n\'est pas en attente de validation'
      });
    }

    // ============================================================
    // CAS 1 : VALIDATION
    // ============================================================
    if (action === 'validate') {
      
      // Mettre à jour le statut
      membre.status = 'actif';
      await membre.save();

      // Créer un entretien automatique
      const entretienDate = new Date();
      entretienDate.setDate(entretienDate.getDate() + 7);

      const entretien = await Entretien.create({
        membre: membre._id,
        date: entretienDate,
        commentaire: 'Entretien de bienvenue suite à la validation du compte',
        createdBy: req.userId,
        status: 'demandé'
      });

      // Envoyer email au membre
      await sendValidationAcceptedEmail(membre, entretien);
      console.log(`📧 Email validation envoyé à ${membre.email}`);

      // Envoyer email au président
      const president = await Membre.findOne({ role: 'President' });
      if (president) {
        await sendValidationConfirmationToPresident(president.email, membre, entretien);
        console.log(`📧 Email confirmation envoyé à ${president.email}`);
      }

      return res.json({
        success: true,
        message: '✅ Inscription validée avec succès. Un entretien a été créé.',
        data: { membre, entretien }
      });

    // ============================================================
    // CAS 2 : REJET
    // ============================================================
    } else {
      membre.status = 'refusé';
      await membre.save();

      await sendRejectionEmail(membre.email, membre.nom, membre.prenom);
      console.log(`📧 Email rejet envoyé à ${membre.email}`);

      return res.json({
        success: true,
        message: '❌ Inscription rejetée avec succès',
        data: membre
      });
    }

  } catch (error) {
    console.error('❌ Erreur validateMembre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// 5. SUSPENDRE MEMBRE
// ============================================================
exports.suspendreMembre = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'administrateur ou le président peut suspendre des membres'
      });
    }

    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    if (membre.status !== 'actif' && membre.status !== 'inactif') {
      return res.status(400).json({
        success: false,
        message: 'Ce membre ne peut pas être suspendu'
      });
    }

    membre.status = 'suspendu';
    await membre.save();

    try {
      await sendSuspensionEmail(membre.email, membre.nom, membre.prenom);
      console.log(`📧 Email suspension envoyé à ${membre.email}`);
    } catch (emailError) {
      console.error('❌ Erreur envoi email suspension:', emailError.message);
    }

    res.json({
      success: true,
      message: '⏸️ Membre suspendu avec succès',
      data: membre
    });
  } catch (error) {
    console.error('❌ Erreur suspendreMembre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 6. REACTIVER MEMBRE
// ============================================================
exports.reactiverMembre = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'administrateur ou le président peut réactiver des membres'
      });
    }

    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    if (membre.status !== 'suspendu' && membre.status !== 'inactif') {
      return res.status(400).json({
        success: false,
        message: 'Ce membre n\'est pas suspendu ou inactif'
      });
    }

    membre.status = 'actif';
    await membre.save();

    try {
      await sendReactivationEmail(membre.email, membre.nom, membre.prenom, membre._id);
      console.log(`📧 Email réactivation envoyé à ${membre.email}`);
    } catch (emailError) {
      console.error('❌ Erreur envoi email réactivation:', emailError.message);
    }

    res.json({
      success: true,
      message: '🔄 Membre réactivé avec succès',
      data: membre
    });
  } catch (error) {
    console.error('❌ Erreur reactiverMembre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 7. DELETE MEMBRE
// ============================================================
exports.deleteMembre = async (req, res) => {
  try {
    if (req.userRole !== 'President' && req.userRole !== 'SecretaireGeneral') {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'administrateur peut supprimer des membres'
      });
    }

    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    await membre.deleteOne();

    res.json({
      success: true,
      message: '🗑️ Membre supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur deleteMembre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 8. STATISTIQUES MEMBRES
// ============================================================
exports.getStatsMembres = async (req, res) => {
  try {
    if (req.userRole !== 'President' && req.userRole !== 'SecretaireGeneral') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const [
      total,
      actifs,
      enAttente,
      suspendus,
      bannis,
      nonValides,
      refuses,
      etudiants,
      professionnels,
      nouveauxMois
    ] = await Promise.all([
      Membre.countDocuments(),
      Membre.countDocuments({ status: 'actif' }),
      Membre.countDocuments({ status: 'en-attente' }),
      Membre.countDocuments({ status: 'suspendu' }),
      Membre.countDocuments({ status: 'banni' }),
      Membre.countDocuments({ status: 'non-validé' }),
      Membre.countDocuments({ status: 'refusé' }),
      Membre.countDocuments({ situationProfessionnelle: 'Étudiant' }),
      Membre.countDocuments({ situationProfessionnelle: 'Professionnel' }),
      Membre.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      })
    ]);

    const statsParRole = await Membre.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        actifs,
        enAttente,
        suspendus,
        bannis,
        nonValides,
        refuses,
        etudiants,
        professionnels,
        nouveauxMois,
        parRole: statsParRole
      }
    });
  } catch (error) {
    console.error('❌ Erreur getStatsMembres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 8b. STATS PUBLIQUES (Home page - pas de auth requis)
// ============================================================
exports.getPublicStats = async (req, res) => {
  try {
    const actifs = await Membre.countDocuments({ status: 'actif' });
    res.json({ success: true, data: { actifs } });
  } catch (error) {
    console.error('❌ Erreur getPublicStats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// 12. GET ALL ROLES (fusionne rôles de la collection + rôles des membres)
// ============================================================
exports.getAllRoles = async (req, res) => {
  try {
    if (!['President', 'SecretaireGeneral'].includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const roles = await Membre.distinct('role');
    const roleDocs = await Role.find().lean();
    const allNames = new Set([...roles, ...roleDocs.map(r => r.name)]);

    const rolesWithCount = await Promise.all(
      Array.from(allNames).map(async (name) => ({
        name,
        count: await Membre.countDocuments({ role: name })
      }))
    );

    res.json({
      success: true,
      data: rolesWithCount.sort((a, b) => b.count - a.count)
    });
  } catch (error) {
    console.error('❌ Erreur getAllRoles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 12b. CREATE ROLE (sans créer de membre)
// ============================================================
exports.createRole = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul le président peut créer des rôles'
      });
    }

    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Le nom doit contenir au moins 2 caractères'
      });
    }

    const exists = await Role.findOne({ name: name.trim() });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Ce rôle existe déjà'
      });
    }

    await Role.create({ name: name.trim() });

    res.json({
      success: true,
      message: `✅ Rôle "${name.trim()}" créé`,
      data: { name: name.trim() }
    });
  } catch (error) {
    console.error('❌ Erreur createRole:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 13. RENAME ROLE
// ============================================================
exports.renameRole = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul le président peut renommer les rôles'
      });
    }

    const { oldName, newName } = req.body;

    if (!oldName || !newName) {
      return res.status(400).json({
        success: false,
        message: 'oldName et newName sont requis'
      });
    }

    if (newName.length < 2 || newName.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du rôle doit contenir entre 2 et 50 caractères'
      });
    }

    const result = await Membre.updateMany(
      { role: oldName },
      { $set: { role: newName } }
    );

    await Role.updateOne({ name: oldName }, { name: newName });

    res.json({
      success: true,
      message: `✅ Rôle "${oldName}" renommé en "${newName}" (${result.modifiedCount} membres)`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('❌ Erreur renameRole:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 14. DELETE ROLE (définit tous les membres avec ce rôle à "Membre")
// ============================================================
exports.deleteRole = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul le président peut supprimer les rôles'
      });
    }

    const { role } = req.params;

    if (role === 'Membre') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer le rôle Membre'
      });
    }

    const result = await Membre.updateMany(
      { role },
      { $set: { role: 'Membre' } }
    );

    await Role.deleteOne({ name: role });

    res.json({
      success: true,
      message: `✅ Rôle "${role}" supprimé (${result.modifiedCount} membres repassés en Membre)`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('❌ Erreur deleteRole:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 15. CREATE MEMBRE
// ============================================================
exports.createMembre = async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone, adresse, situationProfessionnelle, role, status, photo } = req.body;

    if (!nom || !prenom || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nom, prénom et email sont requis'
      });
    }

    const existant = await Membre.findOne({ email: email.toLowerCase() });
    if (existant) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Vérifier unicité du rôle si c'est un rôle unique
    const targetRole = role || 'Membre';
    if (UNIQUE_ROLES.includes(targetRole)) {
      const roleHolder = await Membre.findOne({ role: targetRole, status: { $ne: 'refusé' } });
      if (roleHolder) {
        return res.status(400).json({
          success: false,
          message: 'Ce rôle est déjà attribué à un autre membre. Veuillez d\'abord le retirer avant de l\'attribuer à une nouvelle personne.'
        });
      }
    }

    let photoUrl = photo || '';
    if (photo && photo.startsWith('data:')) {
      const result = await cloudinary.uploader.upload(photo, { folder: 'jci-uploads/members' });
      photoUrl = result.secure_url;
    }

    const membre = await Membre.create({
      nom, prenom,
      email: email.toLowerCase(),
      password: password || require('crypto').randomBytes(4).toString('hex') + 'A1',
      telephone: telephone || '',
      adresse: adresse || '',
      situationProfessionnelle: situationProfessionnelle || 'Autre',
      role: targetRole,
      status: status || 'actif',
      isEmailVerified: true,
      photo: photoUrl
    });

    res.status(201).json({
      success: true,
      message: '✅ Membre créé avec succès',
      data: membre
    });
  } catch (error) {
    console.error('❌ Erreur createMembre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// GET BUREAU MEMBERS - Public (pas de auth)
// ============================================================
exports.getBureauMembers = async (req, res) => {
  try {
    const roleOrder = { President: 1, 'Conseiller Juridique': 2, 'Past President Immédiat': 3, VPPRE: 4, VPFD: 5, Tresorie: 6, SecretaireGeneral: 7 };
    const queryRoles = Object.keys(roleOrder);
    console.log('getBureauMembers: querying with roles:', queryRoles);
    const membres = await Membre.find({ role: { $in: queryRoles }, status: 'actif' })
      .select('-password -codeValidation -codeValidationExpire -resetPasswordToken -resetPasswordExpires -codeValidationExpire -connaissanceZone -connaissanceJCI -pointsDeveloppement -parrain -urlFacebook -urlLinkedIn -competences -pointsForts -langues -hobbies -association -societe -adresse -situationProfessionnelle -parrainId')
      .lean();
    console.log('getBureauMembers: found', membres.length);
    
    membres.sort((a, b) => (roleOrder[a.role] || 9) - (roleOrder[b.role] || 9));
    res.json({ success: true, data: membres });
  } catch (error) {
    console.error('❌ Erreur getBureauMembers:', error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Erreur chargement bureau', error: error.message });
  }
};

// ============================================================
// LISTE DES PARRAINS (public - pour formulaire d'inscription)
// ============================================================
exports.getParrainList = async (req, res) => {
  try {
    const membres = await Membre.find({ status: 'actif' })
      .select('nom prenom')
      .sort({ prenom: 1 })
      .lean();
    res.json({ success: true, data: membres });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// VALIDER UNE INSCRIPTION DIRECTEMENT (Président) - sans entretien
// ============================================================
exports.validerInscriptionDirect = async (req, res) => {
  try {
    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    if (membre.status !== 'en-attente' && membre.status !== 'non-validé') {
      return res.status(400).json({
        success: false,
        message: 'Ce membre n\'est pas en attente de validation'
      });
    }

    membre.status = 'actif';
    await membre.save();

    await sendValidationAccepteeEmail(membre);
    console.log(`📧 Email validation acceptée envoyé à ${membre.email}`);

    return res.json({
      success: true,
      message: '✅ Inscription validée avec succès',
      data: membre
    });
  } catch (error) {
    console.error('❌ Erreur validerInscriptionDirect:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// ACCEPTER UN MEMBRE (Président) - avec date d'entretien
// ============================================================
exports.acceptMember = async (req, res) => {
  try {
    const { dateEntretien, commentaire, lieu } = req.body;
    if (!dateEntretien) {
      return res.status(400).json({
        success: false,
        message: 'La date d\'entretien est obligatoire'
      });
    }

    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    if (membre.status !== 'en-attente' && membre.status !== 'non-validé') {
      return res.status(400).json({
        success: false,
        message: 'Ce membre n\'est pas en attente de validation'
      });
    }

    const dateDebut = new Date(dateEntretien);
    const dateFin = new Date(dateDebut.getTime() + 60 * 60 * 1000);
    const conflit = await Entretien.findOne({
      date: { $gte: dateDebut, $lt: dateFin }
    });
    if (conflit) {
      return res.status(400).json({
        success: false,
        message: 'Un entretien est déjà programmé à cette heure. Veuillez choisir un autre créneau.'
      });
    }

    await membre.save();

    const entretien = await Entretien.create({
      membre: membre._id,
      date: new Date(dateEntretien),
      commentaire: commentaire || 'Entretien de bienvenue',
      lieu: lieu || '',
      createdBy: req.userId,
      status: 'demandé'
    });

    await sendInterviewEmail(membre, entretien);

    return res.json({
      success: true,
      message: '✅ Membre accepté. Un email d\'entretien lui a été envoyé.',
      data: { membre, entretien }
    });
  } catch (error) {
    console.error('❌ Erreur acceptMember:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// REJETER UN MEMBRE (Président) - archive avec statut refusé
// ============================================================
exports.rejectMember = async (req, res) => {
  try {
    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    if (membre.status !== 'en-attente' && membre.status !== 'non-validé') {
      return res.status(400).json({
        success: false,
        message: 'Ce membre n\'est pas en attente de validation'
      });
    }

    membre.status = 'refusé';
    await membre.save();

    await sendRejectionEmail(membre.email, membre.nom, membre.prenom);

    return res.json({
      success: true,
      message: '❌ Inscription refusée. Membre archivé.',
      data: membre
    });
  } catch (error) {
    console.error('❌ Erreur rejectMember:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================