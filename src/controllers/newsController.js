const News = require('../models/News');
const Membre = require('../models/Membre');
const { sendNewNewsEmail } = require('../config/email');

// ============================================================
// 1. CRÉER UNE ACTUALITÉ
// ============================================================
exports.createNews = async (req, res) => {
  try {
    const { titre, contenu, image, tags } = req.body;

    if (!titre || !contenu) {
      return res.status(400).json({
        success: false,
        message: 'Titre et contenu sont obligatoires'
      });
    }

    const news = await News.create({
      titre,
      contenu,
      image: image || 'default-news.jpg',
      tags: tags || [],
      createdBy: req.userId,
      status: 'brouillon'
    });

    res.status(201).json({
      success: true,
      message: '✅ Actualité créée avec succès',
      data: news
    });
  } catch (error) {
    console.error('❌ Erreur createNews:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// 2. GET ALL NEWS
// ============================================================
exports.getNews = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { titre: { $regex: search, $options: 'i' } },
        { contenu: { $regex: search, $options: 'i' } }
      ];
    }

    if (req.userRole === 'Membre') {
      filter.status = 'publiée';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [news, total] = await Promise.all([
      News.find(filter)
        .populate('createdBy', 'nom prenom email')
        .populate('likes', 'nom prenom')
        .populate('comments.author', 'nom prenom')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      News.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: news
    });
  } catch (error) {
    console.error('❌ Erreur getNews:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 3. GET PUBLIC NEWS
// ============================================================
exports.getPublicNews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [news, total] = await Promise.all([
      News.find({ status: 'publiée' })
        .populate('createdBy', 'nom prenom')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      News.countDocuments({ status: 'publiée' })
    ]);

    res.json({
      success: true,
      count: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: news
    });
  } catch (error) {
    console.error('❌ Erreur getPublicNews:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 4. GET NEWS BY ID
// ============================================================
exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('createdBy', 'nom prenom email')
      .populate('likes', 'nom prenom')
      .populate('comments.author', 'nom prenom');

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Actualité non trouvée'
      });
    }

    news.views += 1;
    await news.save();

    res.json({
      success: true,
      data: news
    });
  } catch (error) {
    console.error('❌ Erreur getNewsById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 5. UPDATE NEWS
// ============================================================
exports.updateNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Actualité non trouvée'
      });
    }

    if (news.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    if (news.status === 'publiée' && req.body.status && req.body.status !== 'publiée') {
      return res.status(400).json({
        success: false,
        message: 'Une actualité publiée ne peut pas être modifiée'
      });
    }

    const updated = await News.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Actualité mise à jour',
      data: updated
    });
  } catch (error) {
    console.error('❌ Erreur updateNews:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 6. DELETE NEWS
// ============================================================
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Actualité non trouvée'
      });
    }

    if (news.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    await news.deleteOne();

    res.json({
      success: true,
      message: 'Actualité supprimée'
    });
  } catch (error) {
    console.error('❌ Erreur deleteNews:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 7. PUBLISH NEWS
// ============================================================
exports.publishNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Actualité non trouvée'
      });
    }

    if (news.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    news.status = 'publiée';
    news.date = new Date();
    await news.save();

    // Notifier tous les membres actifs de la nouvelle actualité
    try {
      const membres = await Membre.find({ status: 'actif' });
      const emails = membres.map(m => m.email);
      if (emails.length > 0) {
        await sendNewNewsEmail(emails, news, req.user);
        console.log(`📧 Notification nouvelle actualité envoyée à ${emails.length} membres`);
      }
    } catch (emailError) {
      console.error('⚠️ Erreur envoi notification actualité:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Actualité publiée',
      data: news
    });
  } catch (error) {
    console.error('❌ Erreur publishNews:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 8. ARCHIVE NEWS
// ============================================================
exports.archiveNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Actualité non trouvée'
      });
    }

    if (news.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    news.status = 'archivée';
    await news.save();

    res.json({
      success: true,
      message: 'Actualité archivée',
      data: news
    });
  } catch (error) {
    console.error('❌ Erreur archiveNews:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 9. LIKE NEWS
// ============================================================
exports.likeNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Actualité non trouvée'
      });
    }

    const index = news.likes.indexOf(req.userId);
    if (index === -1) {
      news.likes.push(req.userId);
    } else {
      news.likes.splice(index, 1);
    }

    await news.save();

    res.json({
      success: true,
      message: index === -1 ? 'Like ajouté' : 'Like retiré',
      likes: news.likes.length
    });
  } catch (error) {
    console.error('❌ Erreur likeNews:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 10. ADD COMMENT
// ============================================================
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du commentaire est obligatoire'
      });
    }

    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Actualité non trouvée'
      });
    }

    news.comments.push({
      author: req.userId,
      content
    });

    await news.save();

    const updated = await News.findById(req.params.id)
      .populate('createdBy', 'nom prenom')
      .populate('comments.author', 'nom prenom');

    res.json({
      success: true,
      message: 'Commentaire ajouté',
      data: updated
    });
  } catch (error) {
    console.error('❌ Erreur addComment:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};