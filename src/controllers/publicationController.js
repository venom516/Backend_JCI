const Publication = require('../models/Publication');
const Task = require('../models/Task');
const Membre = require('../models/Membre');
const { sendNewPublicationEmail } = require('../config/email');
const { publishPublication: socialPublish } = require('../services/socialMediaService');

// ============================================================
// 1. CRÉER UNE PUBLICATION
// ============================================================
exports.createPublication = async (req, res) => {
  try {
    const { titre, caption, type, socialMedia, datePublication, date } = req.body;
    const fichier = req.file ? req.file.path : req.body.fichier;
    let parsedSocialMedia = socialMedia || [];
    if (typeof socialMedia === 'string') {
      try { parsedSocialMedia = JSON.parse(socialMedia); } catch (e) { parsedSocialMedia = []; }
    }

    // Validation
    if (!titre || !type || !fichier) {
      return res.status(400).json({
        success: false,
        message: 'Titre, type et fichier sont obligatoires'
      });
    }

    const pubDate = date || datePublication || new Date();
    const isScheduled = new Date(pubDate) > new Date();

    // Créer la publication
    const publication = await Publication.create({
      titre,
      caption: caption || '',
      type,
      socialMedia: parsedSocialMedia,
      fichier,
      date: pubDate,
      datePublication: datePublication || null,
      createdBy: req.userId,
      status: isScheduled ? 'en-attente' : 'créée'
    });

    // Créer une tâche calendrier liée (non bloquant)
    if (parsedSocialMedia.length > 0) {
      try {
        const task = await Task.create({
          titre: `📱 Publication: ${titre}`,
          description: `Publication ${type} pour ${parsedSocialMedia.join(', ')}${caption ? `\n\n${caption}` : ''}`,
          deadline: pubDate,
          type: 'Task Media',
          statut: isScheduled ? 'créée' : 'terminée',
          createdBy: req.userId,
          priority: 'haute',
          location: parsedSocialMedia.join(', '),
          publication: publication._id
        });
        publication.task = task._id;
        await publication.save();
        console.log(`📅 Tâche calendrier créée pour la publication "${titre}"`);
      } catch (taskErr) {
        console.error('❌ Erreur création tâche pour publication:', taskErr.message);
      }
    }

    // Notifier les administrateurs (non bloquant)
    Membre.find({
      role: { $in: ['President', 'ConseillerMedia'] },
      status: 'actif'
    }).then(admins => {
      const emails = admins.map(m => m.email);
      if (emails.length > 0) {
        sendNewPublicationEmail(emails, publication, req.user)
          .then(() => console.log(`📧 Email notification envoyé à ${emails.length} administrateurs`))
          .catch(err => console.error('❌ Erreur envoi email publication:', err.message));
      }
    }).catch(err => console.error('❌ Erreur recherche admins:', err.message));

    // Recharger avec la tâche peuplée
    const populated = await Publication.findById(publication._id).populate('task');

    res.status(201).json({
      success: true,
      message: isScheduled
        ? `✅ Publication programmée pour le ${new Date(pubDate).toLocaleDateString('fr-FR')}`
        : '✅ Publication créée avec succès',
      data: populated
    });
  } catch (error) {
    console.error('❌ Erreur createPublication:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// 2. GET ALL PUBLICATIONS
// ============================================================
exports.getPublications = async (req, res) => {
  try {
    const { status, type, socialMedia, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (socialMedia) filter.socialMedia = { $in: [socialMedia] };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [publications, total] = await Promise.all([
      Publication.find(filter)
        .populate('createdBy', 'nom prenom email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Publication.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: publications
    });
  } catch (error) {
    console.error('❌ Erreur getPublications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 3. GET PUBLICATION BY ID
// ============================================================
exports.getPublicationById = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id)
      .populate('createdBy', 'nom prenom email');

    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }

    res.json({
      success: true,
      data: publication
    });
  } catch (error) {
    console.error('❌ Erreur getPublicationById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 4. UPDATE PUBLICATION
// ============================================================
exports.updatePublication = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }

    if (publication.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier cette publication'
      });
    }

    if (publication.status === 'publiée' && req.body.status && req.body.status !== 'publiée') {
      return res.status(400).json({
        success: false,
        message: 'Une publication publiée ne peut pas être modifiée'
      });
    }

    const updated = await Publication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'nom prenom email');

    res.json({
      success: true,
      message: 'Publication mise à jour',
      data: updated
    });
  } catch (error) {
    console.error('❌ Erreur updatePublication:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 5. DELETE PUBLICATION
// ============================================================
exports.deletePublication = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }

    if (publication.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à supprimer cette publication'
      });
    }

    await publication.deleteOne();

    res.json({
      success: true,
      message: 'Publication supprimée'
    });
  } catch (error) {
    console.error('❌ Erreur deletePublication:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 6. PUBLISH PUBLICATION
// ============================================================
exports.publishPublication = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }

    if (publication.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à publier cette publication'
      });
    }

    publication.status = 'publiée';
    publication.datePublication = new Date();
    await publication.save();

    // Marquer la tâche liée comme terminée
    if (publication.task) {
      try {
        await Task.findByIdAndUpdate(publication.task, { statut: 'terminée' });
      } catch (e) { console.warn('⚠️ Erreur mise à jour tâche:', e.message); }
    }

    const socialResults = await socialPublish(publication);

    res.json({
      success: true,
      message: 'Publication publiée',
      data: publication,
      socialMediaResults: socialResults
    });
  } catch (error) {
    console.error('❌ Erreur publishPublication:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 7. ARCHIVE PUBLICATION
// ============================================================
exports.archivePublication = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }

    if (publication.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    publication.status = 'archivée';
    await publication.save();

    res.json({
      success: true,
      message: 'Publication archivée',
      data: publication
    });
  } catch (error) {
    console.error('❌ Erreur archivePublication:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 8. UPDATE PUBLICATION STATS
// ============================================================
exports.updatePublicationStats = async (req, res) => {
  try {
    const { views, likes, shares, comments } = req.body;

    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }

    if (publication.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    if (views) publication.stats.views += views;
    if (likes) publication.stats.likes += likes;
    if (shares) publication.stats.shares += shares;
    if (comments) publication.stats.comments += comments;

    await publication.save();

    res.json({
      success: true,
      message: 'Stats mises à jour',
      data: publication
    });
  } catch (error) {
    console.error('❌ Erreur updatePublicationStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 9. PUBLIER DIRECTEMENT SUR LES RÉSEAUX SOCIAUX (SANS DB)
// ============================================================
exports.publishDirect = async (req, res) => {
  try {
    const { caption, titre, type, socialMedia } = req.body;
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ success: false, message: 'Aucun fichier sélectionné' });
    }

    let platforms = socialMedia || [];
    if (typeof socialMedia === 'string') {
      try { platforms = JSON.parse(socialMedia); } catch (e) { platforms = []; }
    }

    const filePaths = files.map(f => f.path);

    const { publishDirect: doPublish } = require('../services/socialMediaService');
    const results = await doPublish({ caption, titre, type, platforms, filePaths });

    const succeeded = results.filter(r => r.success).length;
    res.json({
      success: succeeded > 0,
      message: succeeded > 0
        ? `${succeeded}/${results.length} publication(s) réussie(s) sur les réseaux sociaux`
        : 'Échec de toutes les publications',
      results
    });
  } catch (error) {
    console.error('❌ Erreur publishDirect:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};