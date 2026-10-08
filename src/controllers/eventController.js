const Event = require('../models/Event');
const Membre = require('../models/Membre');
const { sendNewEventEmail } = require('../config/email');
<<<<<<< HEAD
const { isValidTransition } = require('../services/stateMachine');

/**
 * Droits de gestion d'un événement.
 *
 * La gestion revient au Président et au Conseiller Média (même logique que
 * le middleware role.isConseillerMedia). L'auteur de l'événement peut aussi
 * le modifier.
 *
 * Attention à la comparaison : event.createdBy est un ObjectId et req.userId
 * également. Comparer event.createdBy.toString() (une chaîne) à req.userId
 * (un ObjectId) avec !== donnait toujours true, donc l'auteur n'était jamais
 * reconnu. On normalise les deux côtés en String.
 */
const peutGererEvent = (req, event) => {
  if (req.userRole === 'President' || req.userRole === 'ConseillerMedia') return true;
  if (!event || !event.createdBy || !req.userId) return false;
  return String(event.createdBy) === String(req.userId);
};
=======
const { pourRecherche } = require('../utils/search');
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419

// ============================================================
// 1. CRÉER UN ÉVÉNEMENT
// ============================================================
exports.createEvent = async (req, res) => {
  try {
    const { titre, type, description, date, dateFin, lieu, maxParticipants, ordreDuJour } = req.body;

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

    const image = req.file ? req.file.path : 'default-event.jpg';

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
      image,
      createdBy: req.userId,
      status: 'planifiée'
    });

    // Notifier les membres
    const membres = await Membre.find({ status: 'actif', archiver: { $ne: true } });

    res.status(201).json({
      success: true,
      message: '✅ Événement créé avec succès',
      data: event
    });

    // Notifications envoyées APRÈS la réponse :sendNewEventEmail est appelée
    // en série pour une trentaine de membres, ce qui dépassait le timeout
    // axios (15 s) et faisait échouer la création alors que l'événement
    // était bien enregistré.
    (async () => {
      for (const membre of membres) {
        try {
          await sendNewEventEmail(membre.email, membre, event);
        } catch (err) {
          console.error(`❌ Notification impossible pour ${membre.email}:`, err.message);
        }
      }
    })();
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
        { titre: { $regex: pourRecherche(search), $options: 'i' } },
        { description: { $regex: pourRecherche(search), $options: 'i' } }
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

    if (!peutGererEvent(req, event)) {
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

    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = req.file.path;
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
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

    if (!peutGererEvent(req, event)) {
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
exports.getEventStats = async (req, res) => {
  try {
    const now = new Date();
    const [total, aVenir, enCours, terminees, annulees] = await Promise.all([
      Event.countDocuments({ status: { $ne: 'annulée' } }),
      Event.countDocuments({ date: { $gt: now }, status: { $nin: ['terminée', 'annulée'] } }),
      Event.countDocuments({ status: 'en-cours' }),
      Event.countDocuments({ status: 'terminée' }),
      Event.countDocuments({ status: 'annulée' })
    ]);
    res.json({ success: true, data: { total, aVenir, enCours, terminees, annulees } });
  } catch (error) {
    console.error('❌ Erreur getEventStats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

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

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    if (!peutGererEvent(req, event)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const validation = isValidTransition('event', event.status, status);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
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