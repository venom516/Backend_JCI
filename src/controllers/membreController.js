const Membre = require('../models/Membre');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');
const Entretien = require('../models/Entretien');
const Task = require('../models/Task');
const Event = require('../models/Event');
const News = require('../models/News');
<<<<<<< HEAD
const { isValidTransition } = require('../services/stateMachine');
=======
<<<<<<< HEAD
const { isValidTransition } = require('../services/stateMachine');
=======
const { pourRecherche } = require('../utils/search');
const { telephoneRenseigne, regexTelephone } = require('../utils/telephone');
const { escapeHtml } = require('../utils/html');
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
const { 
  sendEmail,
  sendEmailChangeVerification,
  sendValidationConfirmationToPresident,
  sendInterviewEmail,
  sendValidationAccepteeEmail,
  sendRejectionEmail,
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

// Rôles à durée limitée (mandat d'1 an, renouvelable 1x)
const MANDAT_ROLES = ['VPFD', 'VPPRE', 'Tresorie'];
const MANDAT_DUREE_MS = 365 * 24 * 60 * 60 * 1000; // 1 an en ms

// ============================================================
// 1. GET MEMBRES - Liste des membres
// ============================================================
exports.getMembres = async (req, res) => {
  try {
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
    const { status, role, search, page = 1, limit = 10000, archived = 'false', refused } = req.query;
    const filter = {};

    // Un compte archivé (supprimé) est différent d'un compte refusé :
    // les refusés ont leur propre vue, les deux ensembles sont disjoints
    const vueRefuses = refused === 'true' || refused === true;
    if (vueRefuses) {
      filter.status = 'refusé';
    } else if (archived === 'true' || archived === true) {
      filter.archiver = true;
      filter.status = { $ne: 'refusé' };
    } else {
      filter.archiver = { $ne: true };
      filter.status = { $ne: 'refusé' };
    }

    if (status && !vueRefuses) {
      const statuses = status.split(',').map(s => s.trim());
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
=======
    const { status, role, search, page = 1, limit, archived, refused } = req.query;
    const filter = {};

    // 9 : plafonner cote serveur. Sans cela, une requete sans limit charge la
    // base entiere (defaut 10000 sans bornes).
    const limite = Math.max(1, Math.min(parseInt(limit, 10) || 100, 100));
    const pageN = Math.max(1, parseInt(page, 10) || 1);

    // 1. refused a la priorite sur archived et sur status : la memoire du
    // filtre doit refleter la demande, pas l'empilement de trois affectations.
    const estRefuse = refused === 'true' || refused === true;

    if (estRefuse) {
      filter.status = 'refusé';
    } else {
      // 2. archived : defaut 'false' => exclure les comptes archives.
      //    Les deux conditions coexistent avec status (elles portent sur des
      //    champs differents) au lieu de l'une qui ecrase l'autre.
      const estArchive = archived === 'true' || archived === true;
      filter.archiver = estArchive ? true : { $ne: true };

      // 3. status : CSV => $in, sinon egalite. A defaut, on masque les refuses.
      if (status) {
        const liste = String(status).split(',').map(s => s.trim()).filter(Boolean);
        filter.status = liste.length > 1 ? { $in: liste } : liste[0];
      } else {
        filter.status = { $ne: 'refusé' };
      }
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
    }

    // 4. role : meme syntaxe CSV que status (l'asymetrie d'origine est un defaut)
    if (role) {
      const roles = String(role).split(',').map(s => s.trim()).filter(Boolean);
      if (roles.length === 1) filter.role = roles[0];
      else if (roles.length > 1) filter.role = { $in: roles };
    }

    // 5. recherche : regex echappee (voir utils/search)
    if (search) {
      filter.$or = [
        { nom: { $regex: pourRecherche(search), $options: 'i' } },
        { prenom: { $regex: pourRecherche(search), $options: 'i' } },
        { email: { $regex: pourRecherche(search), $options: 'i' } }
      ];
    }

    // 6. Si membre normal, ne voir que son profil
    if (req.userRole === 'Membre') filter._id = req.userId;

    const skip = (pageN - 1) * limite;

    const [membres, total] = await Promise.all([
      Membre.find(filter)
        // Liste negative complete : les deux tokens de reset sont omis par defaut
        // (select:false) mais la liste reste correcte si la protection disparait.
        .select('-password -codeValidation -codeValidationExpire -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limite),
      Membre.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: total,
      page: pageN,
      totalPages: Math.ceil(total / limite),
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
      .select('-password -codeValidation -codeValidationExpire -resetPasswordToken -resetPasswordExpires');
    
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    const allowed = ['President', 'SecretaireGeneral', 'VPFD'];
    if (!allowed.includes(req.userRole) && req.userId.toString() !== req.params.id) {
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

    if (membre.archiver) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est archivé et ne peut pas être modifié'
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
    // Vérifier l'unicité du téléphone si modifié.
    // - on compare sur les chiffres seuls, sinon "51-60-15-43" passerait à côté
    //   de "51601543" alors que c'est le même numéro ;
    // - on ignore les comptes supprimés (archiver), qui ne doivent pas continuer
    //   à réserver un numéro ;
    // - on regarde aussi l'ancien champ "tel", encore rempli sur la plupart des
    //   membres, faute de quoi un doublon pourrait se créer.
    if (req.body.telephone) {
      const telSaisi = String(req.body.telephone);
      const telNettoye = telSaisi.replace(/[\s\-\(\)\.\+]/g, '');
      const telExistant = await Membre.findOne({
        _id: { $ne: req.params.id },
        archiver: { $ne: true },
        $or: [
          { telephone: { $in: [telSaisi, telNettoye] } },
          { tel: { $in: [telSaisi, telNettoye] } }
        ]
      });
<<<<<<< HEAD
=======
=======
    // Vérifier l'unicité du téléphone si modifié : comparaison en chiffres
    // seuls, sinon "98 123 456" et "98123456" passent toutes les deux.
    if (telephoneRenseigne(req.body.telephone)) {
      const telExistant = await Membre.findOne({
        telephone: regexTelephone(req.body.telephone),
        _id: { $ne: req.params.id }
      }).select('_id');
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
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

    // Second rôle : autorisé uniquement pour un ancien président (PP).
    // Le rôle principal reste "PP" ; roleSecondaire porte la fonction active.
    if (req.body.roleSecondaire !== undefined) {
      const second = String(req.body.roleSecondaire || '').trim();
      // Une valeur VIDE n'est pas une tentative de cumul : c'est l'absence de
      // second rôle (le formulaire envoie toujours le champ, meme vide). Le
      // controle "PP uniquement" ne concerne donc que la presence d'un second
      // role reel, sinon modifier le nom d'un membre non-PP echouait en 400.
      if (second) {
        if (membre.role !== 'PP') {
          return res.status(400).json({
            success: false,
            message: 'Seul un ancien président (PP) peut cumuler un second rôle'
          });
        }
        if (second === 'PP' || second === 'President') {
          return res.status(400).json({
            success: false,
            message: 'Le second rôle ne peut pas être PP ou Président'
          });
        }
        // Un poste unique ne peut pas être occupé deux fois : on compte en
        // ignorant ce membre et les comptes supprimés.
        if (UNIQUE_ROLES.includes(second)) {
          const dejaPris = await Membre.findOne({
            role: second,
            _id: { $ne: req.params.id },
            archiver: { $ne: true },
            status: { $ne: 'refusé' }
          });
          if (dejaPris) {
            return res.status(400).json({
              success: false,
              message: `Le poste ${second} est déjà occupé par ${dejaPris.prenom} ${dejaPris.nom}`
            });
          }
        }
        req.body.roleSecondaire = second;
      } else if (membre.role === 'PP') {
        // Seul un PP peut avoir un second rôle, donc seul un PP peut l'effacer.
        req.body.roleSecondaire = '';
      }
      // Pour un non-PP la valeur vide est ignoree : il n'a pas de second rôle
      // et n'en aura pas.
    }

    // Rotation automatique des rôles Président
    if (req.body.role === 'President' && req.body.role !== membre.role) {
      const oldPresident = await Membre.findOne({ role: 'President', _id: { $ne: req.params.id }, status: { $ne: 'refusé' } });
      const oldPPI = await Membre.findOne({ role: 'PPI', status: { $ne: 'refusé' } });
      if (oldPPI) {
        oldPPI.role = 'PP';
        oldPPI.datePriseFonction = new Date();
        oldPPI.mandatAnnee = new Date().getFullYear() - 2;
        // Le membre redevenu PPI ne pouvait pas cumuler : son éventuel second
        // rôle n'a de sens qu'une fois devenu PP.
        oldPPI.roleSecondaire = undefined;
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

    // Un membre qui n'est plus "PP" ne peut plus cumuler : on retire le second
    // rôle dès qu'il prend une autre fonction (Sénateur, Membre, Tresorie...).
    if (membre.role === 'PP' && req.body.role && req.body.role !== 'PP') {
      req.body.roleSecondaire = '';
    }

    // Gestion du mandat pour VPFD, VPPRE, Tresorie
    if (req.body.role && MANDAT_ROLES.includes(req.body.role)) {
      if (req.body.role !== membre.role) {
        // Nouvelle assignation : définir mandat d'1 an
        req.body.datePriseFonction = new Date();
        req.body.mandatFin = new Date(Date.now() + MANDAT_DUREE_MS);
        req.body.mandatAnnee = new Date().getFullYear();
      } else if (membre.mandatFin && new Date() > new Date(membre.mandatFin)) {
        // Renouvellement : vérifier s'il existe un successeur
        const memeRole = await Membre.countDocuments({
          role: req.body.role,
          _id: { $ne: req.params.id },
          status: { $ne: 'refusé' }
        });
        if (memeRole === 0) {
          // Pas de successeur → renouvellement possible
          req.body.datePriseFonction = new Date();
          req.body.mandatFin = new Date(Date.now() + MANDAT_DUREE_MS);
          req.body.mandatAnnee = new Date().getFullYear();
        } else {
          return res.status(400).json({
            success: false,
            message: `Le mandat de ${req.body.role} est expiré. Un autre membre occupe déjà ce poste.`
          });
        }
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

    // Photo : base64 uniquement, jamais une URL distante fournie par le client (§1.9.4)
    let photoBase64 = null;
    if (typeof req.body.photo === 'string' && req.body.photo.startsWith('data:')) {
      photoBase64 = req.body.photo;
    }

    // Liste blanche d'écriture (§1.9.4). photo est traite a part : base64 uniquement.
    const CHAMPS_EDITABLES = [
      'nom', 'prenom', 'email', 'telephone', 'adresse', 'sexe',
      'situationProfessionnelle', 'travailOuEtude', 'dateNaissance',
      'urlFacebook', 'urlLinkedIn', 'langues', 'competences', 'pointsForts',
      'societe', 'hobbies', 'association', 'connaissanceZone',
      'connaissanceJCI', 'pointsDeveloppement'
    ];
    const CHAMPS_PRIVES = [
      'role', 'status', 'archiver', 'isEmailVerified', 'codeValidation',
      'codeValidationExpire', 'resetPasswordToken', 'resetPasswordExpires',
      'mandatAnnee', 'mandatFin', 'datePriseFonction', 'lastLogin',
      'parrainId', 'parrain'
    ];

    const { password, ...rest } = req.body;
    const updateData = {};
    for (const champ of CHAMPS_EDITABLES) {
      if (rest[champ] !== undefined) updateData[champ] = rest[champ];
    }
    if (req.userRole === 'President') {
      for (const champ of CHAMPS_PRIVES) {
        if (rest[champ] !== undefined) updateData[champ] = rest[champ];
      }
    }

    // Un changement d'email invalide toujours la vérification, y compris en auto-édition
    if (emailChanged) {
      updateData.isEmailVerified = false;
      updateData.status = 'suspendu';
    }

    if (photoBase64) {
      const result = await cloudinary.uploader.upload(photoBase64, { folder: 'jci-uploads/members' });
      updateData.photo = result.secure_url;
    }

    let updated;
    if (password) {
      // Utiliser save() pour que le hook de hashage s'exécute
      Object.assign(membre, updateData);
      membre.password = password;
      // Même règle que resetPassword : les JWT émis avant ce changement
      // deviennent invalides.
      membre.passwordChangedAt = new Date();
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
      ).select('-password -codeValidation -codeValidationExpire -resetPasswordToken -resetPasswordExpires');
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
            <p>Bonjour <strong>${escapeHtml(updated.prenom)} ${escapeHtml(updated.nom)}</strong>,</p>
            <p>Votre adresse email a été modifiée sur la plateforme JCI Sidi Mansour.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Nouvel email :</strong> ${escapeHtml(newEmail)}</p>
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

    if (membre.archiver) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est archivé et ne peut être ni modifié ni supprimé'
      });
    }

    // ============================================================
    // CAS 1 : VALIDATION (entretien obligatoire avant activation)
    // ============================================================
    if (action === 'validate') {
      const validation = isValidTransition('membre', membre.status, 'actif');
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: 'Ce membre ne peut pas être validé' });
      }

      // Créer un entretien automatique - le membre reste 'en-attente'
      // jusqu'à l'acceptation de l'entretien par le Président
      const debut = new Date();
      debut.setDate(debut.getDate() + 7);
      debut.setHours(9, 0, 0, 0);
      const fin = new Date(debut);
      fin.setHours(17, 0, 0, 0);

      const entretien = await Entretien.create({
        membre: membre._id,
        date: debut,
        dateFin: fin,
        commentaire: 'Entretien de bienvenue suite à la validation du compte',
        createdBy: req.userId,
        status: 'planifié'
      });

      // Envoyer email au membre
      await sendInterviewEmail(membre, entretien);
      console.log(`📧 Email entretien envoyé à ${membre.email}`);

      // Envoyer email au président
      const president = await Membre.findOne({ role: 'President' });
      if (president) {
        await sendValidationConfirmationToPresident(president.email, membre, entretien);
        console.log(`📧 Email confirmation envoyé à ${president.email}`);
      }

      return res.json({
        success: true,
        message: '✅ Entretien planifié. Le membre sera activé après acceptation de l\'entretien.',
        data: { membre, entretien }
      });

    // ============================================================
    // CAS 2 : REJET
    // ============================================================
    } else {
      const validation = isValidTransition('membre', membre.status, 'refusé');
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: 'Ce membre ne peut pas être rejeté' });
      }

      const { email, nom, prenom } = membre;
      membre.status = 'refusé';
      await membre.save();

      // Un compte refusé reste tracé dans la KPI "Refusés" :
      // il n'est pas archivé (donc pas compté comme "supprimé")
      // et ses entretiens en cours passent à "rejeté"
      await Entretien.updateMany(
        { membre: membre._id, status: { $in: ['planifié', 'en-cours', 'terminé'] } },
        { $set: { status: 'rejeté' } }
      );

      await sendRejectionEmail(email, nom, prenom);
      console.log(`📧 Email rejet envoyé à ${email}`);

      return res.json({
        success: true,
        message: '❌ Inscription refusée. Le compte a été archivé et l\'entretien annulé.',
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
    if (!['President', 'SecretaireGeneral', 'VPFD'].includes(req.userRole)) {
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

    if (membre.archiver) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est archivé et ne peut être ni modifié ni supprimé'
      });
    }

    const validation = isValidTransition('membre', membre.status, 'suspendu');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: 'Ce membre ne peut pas être suspendu' });
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
    if (!['President', 'SecretaireGeneral', 'VPFD'].includes(req.userRole)) {
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

    if (membre.archiver) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est archivé et ne peut être ni modifié ni supprimé'
      });
    }

    const validation = isValidTransition('membre', membre.status, 'actif');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: 'Ce membre ne peut pas être réactivé' });
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
// 6b. BANNIR MEMBRE
// ============================================================
exports.bannirMembre = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul le président peut bannir des membres'
      });
    }

    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    if (membre.archiver) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est archivé et ne peut être ni modifié ni supprimé'
      });
    }

    const validation = isValidTransition('membre', membre.status, 'banni');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: 'Ce membre ne peut pas être banni' });
    }

    membre.status = 'banni';
    await membre.save();

    res.json({
      success: true,
      message: '🚫 Membre banni avec succès',
      data: membre
    });
  } catch (error) {
    console.error('❌ Erreur bannirMembre:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// 7. DELETE MEMBRE
// ============================================================
exports.deleteMembre = async (req, res) => {
  try {
    if (!['President', 'SecretaireGeneral', 'VPFD'].includes(req.userRole)) {
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

    if (membre.archiver) {
      return res.json({
        success: true,
        message: '🗃️ Ce compte est déjà archivé'
      });
    }

    membre.archiver = true;
    await membre.save();

    res.json({
      success: true,
      message: '🗑️ Membre archivé avec succès'
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
// 7b. SUPPRESSION DEFINITIVE DU MEMBRE (depuis la page Entretien)
// ============================================================
exports.hardDeleteMembre = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul le Président peut supprimer définitivement un membre'
      });
    }

    const membre = await Membre.findById(req.params.id);
    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    // Un compte archivé doit d'abord repasser par le statut actif
    // pour être supprimé définitivement
    if (membre.archiver) {
      membre.archiver = false;
      membre.status = 'actif';
      await membre.save();
      console.log(`♻️ Compte archivé remis en actif avant suppression: ${membre.email}`);
    }

    await Membre.findByIdAndDelete(req.params.id);
    await Entretien.deleteMany({ membre: req.params.id });

    console.log(`🗑️ Membre supprimé définitivement: ${membre.email}`);
    res.json({
      success: true,
      message: '🗑️ Membre supprimé définitivement'
    });
  } catch (error) {
    console.error('❌ Erreur hardDeleteMembre:', error);
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
      nonInscrits,
      etudiants,
      professionnels,
      nouveauxMois,
      supprimes
    ] = await Promise.all([
      Membre.countDocuments({ archiver: { $ne: true }, status: { $ne: 'refusé' } }),
      Membre.countDocuments({ status: 'actif', archiver: { $ne: true } }),
      Membre.countDocuments({ status: 'en-attente', archiver: { $ne: true } }),
      Membre.countDocuments({ status: 'suspendu', archiver: { $ne: true } }),
      Membre.countDocuments({ status: 'banni', archiver: { $ne: true } }),
      Membre.countDocuments({ status: 'non-validé', archiver: { $ne: true } }),
      Membre.countDocuments({ status: 'refusé' }),
      Membre.countDocuments({ status: 'non-inscrit', archiver: { $ne: true } }),
      Membre.countDocuments({ situationProfessionnelle: 'Étudiant', archiver: { $ne: true } }),
      Membre.countDocuments({ situationProfessionnelle: 'Professionnel', archiver: { $ne: true } }),
      Membre.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        archiver: { $ne: true }
      }),
      Membre.countDocuments({ archiver: true, status: { $ne: 'refusé' } })
    ]);

    const statsParRole = await Membre.aggregate([
      { $match: { archiver: { $ne: true } } },
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
        nonInscrits,
        etudiants,
        professionnels,
        nouveauxMois,
        supprimes,
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
    const actifs = await Membre.countDocuments({ status: 'actif', archiver: { $ne: true } });
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
    const { nom, prenom, email, password, telephone, adresse, sexe, situationProfessionnelle, role, status, photo } = req.body;

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

    // Unicité du téléphone : comparaison en chiffres seuls, sinon
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

    const membreData = {
      nom, prenom,
      email: email.toLowerCase(),
      password: password || require('crypto').randomBytes(4).toString('hex') + 'A1',
      telephone: telephone || '',
      adresse: adresse || '',
      sexe: sexe || '',
      situationProfessionnelle: situationProfessionnelle || 'Autre',
      role: targetRole,
      status: status || 'non-inscrit',
      isEmailVerified: true,
      photo: photoUrl
    };

    // Si le rôle a une durée de mandat, définir datePriseFonction et mandatFin
    if (MANDAT_ROLES.includes(targetRole)) {
      membreData.datePriseFonction = new Date();
      membreData.mandatFin = new Date(Date.now() + MANDAT_DUREE_MS);
      membreData.mandatAnnee = new Date().getFullYear();
    }

    const membre = await Membre.create(membreData);

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
// ACCEPTER UN MEMBRE (Président) - avec date d'entretien
// ============================================================
// ============================================================
// ACCEPTER UN MEMBRE (Président) - validation du compte
// L'entretien a déjà été planifié puis accepté séparément.
// ============================================================
exports.acceptMember = async (req, res) => {
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

    // L'entretien doit avoir été accepté avant de valider le compte
    const entretien = await Entretien.findOne({
      membre: membre._id,
      status: 'accepté'
    }).sort({ dateApprouve: -1 });

    if (!entretien) {
      return res.status(400).json({
        success: false,
        message: 'L\'entretien doit être accepté avant de valider le compte'
      });
    }

    membre.status = 'actif';
    membre.isEmailVerified = true;
    await membre.save();

    await sendValidationAccepteeEmail(membre);

    return res.json({
      success: true,
      message: 'Membre validé',
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
// REJETER UN MEMBRE (Président) - statut refusé
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

    if (membre.status !== 'en-attente' && membre.status !== 'non-validé' && membre.status !== 'non-inscrit') {
      return res.status(400).json({
        success: false,
        message: 'Ce membre ne peut pas être rejeté'
      });
    }

    const { email, nom, prenom } = membre;
    membre.status = 'refusé';
    await membre.save();

    // Synchronisation : le refus reste tracé dans la KPI "Refusés"
    // (le compte n'est pas archivé) et les entretiens en cours passent à "rejeté"
    await Entretien.updateMany(
      { membre: membre._id, status: { $in: ['planifié', 'en-cours', 'terminé'] } },
      { $set: { status: 'rejeté', isApprove: false } }
    );

    try {
      await sendRejectionEmail(email, nom, prenom);
    } catch (mailError) {
      console.error('❌ Erreur email de rejet:', mailError.message);
    }

    return res.json({
      success: true,
<<<<<<< HEAD
      message: '❌ Inscription refusée. Le compte a été archivé et l\'entretien rejeté.',
=======
<<<<<<< HEAD
      message: '❌ Inscription refusée. Le compte a été archivé et l\'entretien rejeté.',
=======
      message: 'Inscription refusée',
      data: membre
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
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