const Document = require('../models/Document');
const Membre = require('../models/Membre');
const { sendEmail, sendNewDocumentEmail } = require('../config/email');
const { isValidTransition } = require('../services/stateMachine');

// ============================================================
// 1. UPLOAD DOCUMENT (creerDocument + insertDocument)
// ============================================================
exports.uploadDocument = async (req, res) => {
  try {
    const { titre, type, description, eventId } = req.body;

    // Vérifier les champs obligatoires
    if (!titre || !type || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Titre, type et fichier sont obligatoires'
      });
    }

    // Vérifier les autorisations
    if (req.userRole !== 'SecretaireGeneral' && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul le Secrétaire Général ou le Président peut uploader des documents'
      });
    }

    // Créer le document
    const document = await Document.create({
      titre,
      type,
      description: description || '',
      fichier: req.file.path,
      fichierNom: req.file.originalname,
      fichierTaille: req.file.size,
      createdBy: req.userId,
      eventId: eventId || null,
      status: 'brouillon',
      version: 1
    });

    // Récupérer les emails des destinataires (Président + SG)
    const admins = await Membre.find({
      role: { $in: ['President', 'SecretaireGeneral'] },
      status: 'actif',
      archiver: { $ne: true }
    });
    const emails = admins.map(m => m.email);

    // Envoyer les emails
    if (emails.length > 0) {
      try {
        await sendNewDocumentEmail(emails, document, req.user);
        console.log(`Email envoyé à ${emails.length} administrateurs`);
      } catch (mailError) {
        console.warn('Notification non envoyée aux administrateurs:', mailError.message);
      }
    }

    // Afficher succès
    res.status(201).json({
      success: true,
      message: 'Document uploadé avec succès. Les administrateurs ont été notifiés.',
      data: document
    });

  } catch (error) {
    console.error('❌ Erreur uploadDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// 2. GET ALL DOCUMENTS
// ============================================================
exports.getDocuments = async (req, res) => {
  try {
    const { type, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { titre: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('createdBy', 'nom prenom email')
        .populate('eventId', 'titre date')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Document.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: documents
    });
  } catch (error) {
    console.error('❌ Erreur getDocuments:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 3. GET DOCUMENT BY ID
// ============================================================
exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('createdBy', 'nom prenom email')
      .populate('eventId', 'titre date');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('❌ Erreur getDocumentById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 4. UPDATE DOCUMENT
// ============================================================
exports.updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier les autorisations
    if (document.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier ce document'
      });
    }

    // Si un nouveau fichier est uploadé
    if (req.file) {
      req.body.fichier = req.file.path;
      req.body.fichierNom = req.file.originalname;
      req.body.fichierTaille = req.file.size;
      req.body.version = document.version + 1;
    }

    const updated = await Document.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'nom prenom email');

    res.json({
      success: true,
      message: 'Document mis à jour',
      data: updated
    });
  } catch (error) {
    console.error('❌ Erreur updateDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ============================================================
// 5. DELETE DOCUMENT
// ============================================================
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier les autorisations
    if (document.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à supprimer ce document'
      });
    }

    await document.deleteOne();

    res.json({
      success: true,
      message: 'Document supprimé'
    });
  } catch (error) {
    console.error('❌ Erreur deleteDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 6. APPROVE DOCUMENT
// ============================================================
exports.approveDocument = async (req, res) => {
  try {
    if (req.userRole !== 'SecretaireGeneral' && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Seul le Secrétaire Général ou le Président peut approuver'
      });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Idempotence : un double clic sur Approuver ne doit pas renvoyer une erreur.
      if (document.status === 'approuvé') {
        return res.json({
          success: true,
          message: 'Document déjà approuvé',
          data: document
        });
      }

      const validation = isValidTransition('document', document.status, 'approuvé');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    document.status = 'approuvé';
    await document.save();

    // Notifier le créateur
const creator = await Membre.findById(document.createdBy);
      if (creator) {
        try {
          await sendEmail(
            creator.email,
            `Document approuvé: ${document.titre}`,
            `<p>Votre document "${document.titre}" a été approuvé.</p>`
          );
        } catch (mailError) {
          console.warn('Notification non envoyée au créateur:', mailError.message);
        }
      }

    res.json({
      success: true,
      message: 'Document approuvé',
      data: document
    });
  } catch (error) {
    console.error('❌ Erreur approveDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 7. ARCHIVE DOCUMENT
// ============================================================
exports.archiveDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    if (document.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const validation = isValidTransition('document', document.status, 'archivé');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    document.status = 'archivé';
    await document.save();

    res.json({
      success: true,
      message: 'Document archivé',
      data: document
    });
  } catch (error) {
    console.error('❌ Erreur archiveDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 8. SOUMETTRE DOCUMENT (brouillon → en-attente)
// ============================================================
exports.soumettreDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }
    if (document.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    const validation = isValidTransition('document', document.status, 'en-attente');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }
    document.status = 'en-attente';
    await document.save();
    res.json({ success: true, message: 'Document soumis pour validation', data: document });
  } catch (error) {
    console.error('❌ Erreur soumettreDocument:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// 9. REJETER DOCUMENT (en-attente → brouillon)
// ============================================================
exports.rejeterDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }
    if (req.userRole !== 'SecretaireGeneral' && req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Seul le SG ou Président peut rejeter' });
    }
    const validation = isValidTransition('document', document.status, 'brouillon');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }
    document.status = 'brouillon';
    await document.save();
    res.json({ success: true, message: 'Document renvoyé en brouillon', data: document });
  } catch (error) {
    console.error('❌ Erreur rejeterDocument:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// 10. DOWNLOAD DOCUMENT
// ============================================================
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    const fichier = document.fichier;
    if (!fichier) {
      return res.status(404).json({
        success: false,
        message: 'Aucun fichier associé à ce document'
      });
    }

    // Les anciens documents stockent un simple nom de fichier : il faut
    // reconstruire l'URL /uploads, sinon le navigateur résout la redirection
    // contre la route /api/documents/:id et renvoie une erreur 400/500.
    let cible = fichier;
    if (!/^https?:\/\//i.test(fichier)) {
      cible = fichier.startsWith('/uploads/') ? fichier : '/uploads/' + String(fichier).replace(/^\/+/, '');
      return res.redirect(cible);
    }

    const nomFichier = document.fichierNom || 'document';
    const extension = String(nomFichier).split('.').pop().toLowerCase();
    const types = {
      pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel', txt: 'text/plain',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    };
    const typeMime = types[extension] || 'application/octet-stream';

    try {
      const reponse = await fetch(cible);
      if (!reponse.ok) {
        return res.status(502).json({
          success: false,
          message: `Fichier introuvable sur le stockage (${reponse.status})`
        });
      }
      const buffer = Buffer.from(await reponse.arrayBuffer());
      res.setHeader('Content-Type', typeMime);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nomFichier)}"`);
      return res.send(buffer);
    } catch (erreur) {
      console.error('❌ Erreur lecture Cloudinary:', erreur);
      return res.status(502).json({
        success: false,
        message: 'Impossible de récupérer le fichier depuis le stockage'
      });
    }
  } catch (error) {
    console.error('❌ Erreur downloadDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};