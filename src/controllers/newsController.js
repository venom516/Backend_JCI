const News = require('../models/News');
const Membre = require('../models/Membre');
const { sendNewNewsEmail } = require('../config/email');
<<<<<<< HEAD
const { isValidTransition } = require('../services/stateMachine');
const { normalizeImageUrl } = require('../services/imageStore');
=======
<<<<<<< HEAD
const { isValidTransition } = require('../services/stateMachine');
const { normalizeImageUrl } = require('../services/imageStore');
=======
const { pourRecherche } = require('../utils/search');

// Catalogues valides, derives du schema : une seule source de verite, en
// miroir des listes du frontend (NewsManagementPage, I18nContext).
const CATEGORIES = new Set(News.schema.path('category').enumValues);
const STATUSES = new Set(News.schema.path('status').enumValues);
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3

// ============================================================
// 1. CRÉER UNE ACTUALITÉ
// ============================================================
exports.createNews = async (req, res) => {
  try {
    const { titre, contenu, image, tags, category } = req.body;

    if (!titre || !contenu) {
      return res.status(400).json({
        success: false,
        message: 'Titre et contenu sont obligatoires'
      });
    }

    // Liste blanche : la categorie doit appartenir au catalogue du frontend,
    // sinon Mongoose rejetterait la creation avec une Validation Error 500.
    const categorie = CATEGORIES.has(category) ? category : 'General';

    const news = await News.create({
      titre,
      contenu,
      image: req.file ? req.file.path : await normalizeImageUrl(image),
      tags: tags || [],
      category: categorie,
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
    const { status, search, page = 1, limit = 20, category } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { titre: { $regex: pourRecherche(search), $options: 'i' } },
        { contenu: { $regex: pourRecherche(search), $options: 'i' } }
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
    const { page = 1, limit = 10, category } = req.query;
    const filter = { status: 'publiée' };
    if (category) filter.category = category;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [news, total] = await Promise.all([
      News.find(filter)
        .populate('createdBy', 'nom prenom')
        .sort({ date: -1 })
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

    // Un visiteur anonyme ne doit lire que le contenu publie. Un 404 (et non
    // 403) pour un brouillon : un 403 confirme au visiteur que l'ID existe.
    if (!req.user && news.status !== 'publiée') {
      return res.status(404).json({
        success: false,
        message: 'Actualité non trouvée'
      });
    }

    // Compter une vue par appel anonyme gonfle le compteur : reserve aux membres.
    if (req.user) {
      news.views += 1;
      await news.save();
    }

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

    if (news.createdBy.toString() !== String(req.userId) && req.userRole !== 'President') {
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = req.file.path;
    } else if (
      req.body.image &&
      !/^default-(news|event)\.jpg$/i.test(String(req.body.image).trim())
    ) {
      updateData.image = await normalizeImageUrl(req.body.image);
    } else {
      delete updateData.image;
    }

    const updated = await News.findByIdAndUpdate(
      req.params.id,
      updateData,
<<<<<<< HEAD
=======
=======
    // Liste blanche : req.body ne doit jamais pouvoir ecraser createdBy,
    // views, likes ou comments depuis un appelant externe (mass assignment).
    const CHAMPS_MAJ = ['titre', 'contenu', 'image', 'tags', 'category', 'status', 'date'];
    const maj = {};
    for (const champ of CHAMPS_MAJ) {
      if (req.body[champ] !== undefined) maj[champ] = req.body[champ];
    }
    if (maj.category !== undefined && !CATEGORIES.has(maj.category)) delete maj.category;
    if (maj.status !== undefined && !STATUSES.has(maj.status)) delete maj.status;

    const updated = await News.findByIdAndUpdate(
      req.params.id,
      maj,
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
>>>>>>> 29bd9519b9b62cd2af1619d33b79e59fa7e241c3
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

    if (news.createdBy.toString() !== String(req.userId) && req.userRole !== 'President') {
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

    // Acceptation : le President ou un Conseiller Media ( meme si l'actualite
    // n'a pas ete creee par lui ).
    const peutAccepter = req.userRole === 'President' || req.userRole === 'ConseillerMedia';
    if (!peutAccepter && news.createdBy.toString() !== String(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Idempotence : si déjà publiée, on ne relance pas une transition invalide
    if (news.status === 'publiée') {
      return res.json({
        success: true,
        message: 'Actualité déjà publiée',
        data: news
      });
    }

    const validation = isValidTransition('news', news.status, 'publiée');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    news.status = 'publiée';
    news.date = new Date();
    await news.save();

    // Notifier tous les membres actifs de la nouvelle actualité
    // try {
    //   const membres = await Membre.find({ status: 'actif' });
    //   const emails = membres.map(m => m.email);
    //   if (emails.length > 0) {
    //     await sendNewNewsEmail(emails, news, req.user);
    //     console.log(`📧 Notification nouvelle actualité envoyée à ${emails.length} membres`);
    //   }
    // } catch (emailError) {
    //   console.error('⚠️ Erreur envoi notification actualité:', emailError.message);
    // }

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

    if (news.createdBy.toString() !== String(req.userId) && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const validation = isValidTransition('news', news.status, 'archivée');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
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
// 11. LIKE NEWS
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
