const Document = require('../models/Document');
const Membre = require('../models/Membre');
const { sendNewDocumentEmail } = require('../config/email');

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
      status: 'actif'
    });
    const emails = admins.map(m => m.email);

    // Envoyer les emails
    if (emails.length > 0) {
      await sendNewDocumentEmail(emails, document, req.user);
      console.log(`📧 Email envoyé à ${emails.length} administrateurs`);
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

    document.status = 'approuvé';
    await document.save();

    // Notifier le créateur
    const creator = await Membre.findById(document.createdBy);
    if (creator) {
      await sendEmail(
        creator.email,
        `✅ Document approuvé: ${document.titre}`,
        `<p>Votre document "${document.titre}" a été approuvé.</p>`
      );
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
// 8. DOWNLOAD DOCUMENT
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

    res.redirect(document.fichier);
  } catch (error) {
    console.error('❌ Erreur downloadDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};