const Event = require('../models/Event');
const Membre = require('../models/Membre');
const { sendNewEventEmail } = require('../config/email');

// ============================================================
// 1. CRÉER UN ÉVÉNEMENT
// ============================================================
exports.createEvent = async (req, res) => {
  try {
    const { titre, type, description, date, dateFin, lieu, maxParticipants, ordreDuJour, image } = req.body;

    // Validation
    if (!titre || !type || !description || !date || !lieu) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs requis doivent être remplis'
      });
    }

    if (new Date(date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La date doit être dans le futur'
      });
    }

    // Créer l'événement
    const event = await Event.create({
      titre,
      type,
      description,
      date,
      dateFin: dateFin || null,
      lieu,
      maxParticipants: maxParticipants || 0,
      ordreDuJour: ordreDuJour || null,
      image: image || 'default-event.jpg',
      createdBy: req.userId,
      status: 'planifiée'
    });

    // Notifier les membres
    const membres = await Membre.find({ status: 'actif' });
    for (const membre of membres) {
      await sendNewEventEmail(membre.email, membre, event);
    }

    res.status(201).json({
      success: true,
      message: '✅ Événement créé avec succès',
      data: event
    });
  } catch (error) {
    console.error('❌ Erreur createEvent:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// 2. GET ALL EVENTS
// ============================================================
exports.getEvents = async (req, res) => {
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

    if (req.userRole === 'Membre') {
      filter.date = { $gte: new Date() };
      filter.status = { $ne: 'annulée' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('createdBy', 'nom prenom email')
        .populate('participants', 'nom prenom email')
        .sort({ date: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Event.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: events
    });
  } catch (error) {
    console.error('❌ Erreur getEvents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 3. GET EVENT BY ID
// ============================================================
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'nom prenom email')
      .populate('participants', 'nom prenom email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('❌ Erreur getEventById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 4. UPDATE EVENT
// ============================================================
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    if (event.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    if (event.status === 'terminée' || event.status === 'annulée') {
      return res.status(400).json({
        success: false,
        message: 'Un événement terminé ou annulé ne peut pas être modifié'
      });
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Événement mis à jour',
      data: updated
    });
  } catch (error) {
    console.error('❌ Erreur updateEvent:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 5. DELETE EVENT
// ============================================================
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    if (event.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    await event.deleteOne();

    res.json({
      success: true,
      message: 'Événement supprimé'
    });
  } catch (error) {
    console.error('❌ Erreur deleteEvent:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 6. PARTICIPATE TO EVENT
// ============================================================
exports.participateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    if (event.status !== 'planifiée' && event.status !== 'en-cours') {
      return res.status(400).json({
        success: false,
        message: 'Cet événement n\'est pas ouvert aux participations'
      });
    }

    if (event.maxParticipants > 0 && event.participants.length >= event.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Nombre maximum de participants atteint'
      });
    }

    const index = event.participants.indexOf(req.userId);
    if (index === -1) {
      event.participants.push(req.userId);
    } else {
      event.participants.splice(index, 1);
    }

    await event.save();

    res.json({
      success: true,
      message: index === -1 ? '✅ Inscription réussie' : '❌ Désinscription réussie',
      participants: event.participants.length
    });
  } catch (error) {
    console.error('❌ Erreur participateEvent:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 7. UPDATE EVENT STATUS
// ============================================================
exports.getEventCount = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    const count = await Event.countDocuments(filter);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('❌ Erreur getEventCount:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateEventStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['planifiée', 'en-cours', 'terminée', 'reportée', 'annulée'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    if (event.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    event.status = status;
    await event.save();

    res.json({
      success: true,
      message: `Statut mis à jour: ${status}`,
      data: event
    });
  } catch (error) {
    console.error('❌ Erreur updateEventStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};