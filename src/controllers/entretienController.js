const Entretien = require('../models/Entretien');
const Membre = require('../models/Membre');
const { sendEntretienApprovedEmail, sendEntretienRejectedEmail } = require('../config/email');

exports.demanderEntretien = async (req, res) => {
  try {
    const { date, commentaire, lien, lieu, membre: membreId } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date requise' });
    }
    if (new Date(date) < new Date()) {
      return res.status(400).json({ success: false, message: 'La date doit être dans le futur' });
    }
    const targetMembre = membreId || req.userId;
    const existing = await Entretien.findOne({
      membre: targetMembre,
      status: { $in: ['demandé', 'en-attente', 'approuvé'] }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ce membre a déjà un entretien programmé' });
    }
    const entretien = await Entretien.create({
      membre: targetMembre, date, commentaire, lien, lieu,
      createdBy: req.userId, status: 'demandé'
    });
    res.status(201).json({ success: true, message: 'Entretien créé', data: entretien });
  } catch (error) {
    console.error('❌ Erreur demanderEntretien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getEntretiens = async (req, res) => {
  try {
    const { status, membre, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.userRole === 'Membre') filter.membre = req.userId;
    if (status) filter.status = status;
    if (membre) filter.membre = membre;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const entretiens = await Entretien.find(filter)
      .populate('membre', 'nom prenom email')
      .populate('createdBy', 'nom prenom email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Entretien.countDocuments(filter);
    res.json({ success: true, count: total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)), data: entretiens });
  } catch (error) {
    console.error('❌ Erreur getEntretiens:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getEntretienById = async (req, res) => {
  try {
    const entretien = await Entretien.findById(req.params.id)
      .populate('membre', 'nom prenom email')
      .populate('createdBy', 'nom prenom email');
    if (!entretien) {
      return res.status(404).json({ success: false, message: 'Entretien non trouvé' });
    }
    if (req.userRole === 'Membre' && 
        entretien.membre._id.toString() !== req.userId && 
        entretien.createdBy._id.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    res.json({ success: true, data: entretien });
  } catch (error) {
    console.error('❌ Erreur getEntretienById:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.approveEntretien = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Seul le président peut approuver' });
    }
    const entretien = await Entretien.findById(req.params.id).populate('membre');
    if (!entretien) {
      return res.status(404).json({ success: false, message: 'Entretien non trouvé' });
    }
    if (entretien.status !== 'demandé' && entretien.status !== 'en-attente') {
      return res.status(400).json({ success: false, message: 'Entretien ne peut pas être approuvé' });
    }
    entretien.status = 'approuvé';
    entretien.isApprove = true;
    entretien.dateApprouve = new Date();
    await entretien.save();

    const membre = entretien.membre;
    if (membre) {
      membre.status = 'actif';
      await membre.save();
      await sendEntretienApprovedEmail(membre.email, membre, entretien);
    }

    res.json({ success: true, message: 'Entretien approuvé', data: entretien });
  } catch (error) {
    console.error('❌ Erreur approveEntretien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.rejectEntretien = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Seul le président peut rejeter' });
    }
    const entretien = await Entretien.findById(req.params.id).populate('membre');
    if (!entretien) {
      return res.status(404).json({ success: false, message: 'Entretien non trouvé' });
    }
    if (entretien.status !== 'demandé' && entretien.status !== 'en-attente') {
      return res.status(400).json({ success: false, message: 'Entretien ne peut pas être rejeté' });
    }
    entretien.status = 'annulé';
    await entretien.save();

    const membre = entretien.membre;
    if (membre) {
      membre.status = 'refusé';
      await membre.save();
      await sendEntretienRejectedEmail(membre.email, membre, entretien);
    }

    res.json({ success: true, message: 'Entretien rejeté et membre archivé', data: entretien });
  } catch (error) {
    console.error('❌ Erreur rejectEntretien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.realiseEntretien = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Seul le président peut marquer comme réalisé' });
    }
    const { note, remarques } = req.body;
    const entretien = await Entretien.findById(req.params.id);
    if (!entretien) {
      return res.status(404).json({ success: false, message: 'Entretien non trouvé' });
    }
    if (entretien.status !== 'approuvé') {
      return res.status(400).json({ success: false, message: 'Entretien doit être approuvé avant d\'être réalisé' });
    }
    entretien.status = 'réalisé';
    entretien.note = note || null;
    entretien.remarques = remarques || null;
    await entretien.save();

    const membre = await Membre.findById(entretien.membre);
    if (membre && membre.status !== 'actif') {
      membre.status = 'actif';
      await membre.save();
    }

    res.json({ success: true, message: 'Entretien réalisé', data: entretien });
  } catch (error) {
    console.error('❌ Erreur realiseEntretien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateEntretien = async (req, res) => {
  try {
    const entretien = await Entretien.findById(req.params.id);
    if (!entretien) {
      return res.status(404).json({ success: false, message: 'Entretien non trouvé' });
    }
    if (entretien.membre.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    if (entretien.status === 'approuvé' || entretien.status === 'réalisé') {
      return res.status(400).json({ success: false, message: 'Entretien ne peut plus être modifié' });
    }
    const updated = await Entretien.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, message: 'Entretien mis à jour', data: updated });
  } catch (error) {
    console.error('❌ Erreur updateEntretien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.deleteEntretien = async (req, res) => {
  try {
    const entretien = await Entretien.findById(req.params.id);
    if (!entretien) {
      return res.status(404).json({ success: false, message: 'Entretien non trouvé' });
    }
    if (entretien.createdBy.toString() !== req.userId && req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    await entretien.deleteOne();
    res.json({ success: true, message: 'Entretien supprimé' });
  } catch (error) {
    console.error('❌ Erreur deleteEntretien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};