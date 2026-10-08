const Entretien = require('../models/Entretien');
const Membre = require('../models/Membre');
const { sendEntretienRejectedEmail, sendInterviewEmail, sendInterviewUpdatedEmail, sendValidationAccepteeEmail } = require('../config/email');
const { isValidTransition } = require('../services/stateMachine');

// Le statut suit le calendrier de l'entretien :
//   planifié  -> dès que la date de début est atteinte  -> en-cours
//   en-cours  -> dès que la date de fin est dépassée    -> terminé
// Les statuts "accepté" et "rejeté" sont des décisions définitives du Président
const syncStatutsEntretiens = async () => {
  try {
    const now = new Date();
    const versEnCours = await Entretien.updateMany(
      { status: 'planifié', date: { $lte: now } },
      { $set: { status: 'en-cours' } }
    );
    const versTermine = await Entretien.updateMany(
      { status: 'en-cours', dateFin: { $lt: now } },
      { $set: { status: 'terminé' } }
    );
    const total = versEnCours.modifiedCount + versTermine.modifiedCount;
    if (total > 0) {
      console.log(`⏰ ${versEnCours.modifiedCount} entretien(s) en cours, ${versTermine.modifiedCount} terminé(s)`);
    }
  } catch (error) {
    console.error('❌ Erreur syncStatutsEntretiens:', error.message);
  }
};

exports.demanderEntretien = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Seul le président peut créer un entretien' });
    }
    const { date, dateFin, commentaire, lien, lieu, membre: membreId } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date de début requise' });
    }
    if (!dateFin) {
      return res.status(400).json({ success: false, message: 'Date de fin requise' });
    }
    if (new Date(date) < new Date()) {
      return res.status(400).json({ success: false, message: 'La date de début doit être dans le futur' });
    }
    if (new Date(dateFin) <= new Date(date)) {
      return res.status(400).json({ success: false, message: 'La date de fin doit être après la date de début' });
    }
    if (!membreId) {
      return res.status(400).json({ success: false, message: 'Veuillez sélectionner un membre' });
    }
    const targetMembre = membreId;
    const existing = await Entretien.findOne({
      membre: targetMembre,
      status: { $in: ['planifié', 'en-cours', 'terminé'] }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ce membre a déjà un entretien en cours de traitement' });
    }
    // Une personne = un seul entretien. Les entretiens déjà decidés
    // (acceptés ou rejetés) sont effacés : la nouvelle planification
    // remplace la trace précédente au lieu de la dupliquer.
    const anciens = await Entretien.find({ membre: targetMembre });
    if (anciens.length > 0) {
      await Entretien.deleteMany({ _id: { $in: anciens.map((e) => e._id) } });
      console.log(`♻️ ${anciens.length} entretien(s) précédent(s) supprimé(s) pour ce membre`);
    }
    const entretien = await Entretien.create({
      membre: targetMembre, date, dateFin, commentaire, lien, lieu,
      createdBy: req.userId, status: 'planifié'
    });

    // Notifier le membre
    try {
      const membre = await Membre.findById(targetMembre).select('nom prenom email');
      if (membre) {
        sendInterviewEmail(membre, entretien);
      }
    } catch (err) {
      console.error('❌ Erreur notification entretien:', err.message);
    }

    res.status(201).json({ success: true, message: 'Entretien créé', data: entretien });
  } catch (error) {
    console.error('❌ Erreur demanderEntretien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getEntretiens = async (req, res) => {
  try {
    await syncStatutsEntretiens();
    const { status, membre, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.userRole === 'Membre') filter.membre = req.userId;
    if (status) {
      const liste = String(status).split(',').map((s) => s.trim()).filter(Boolean);
      filter.status = liste.length > 1 ? { $in: liste } : liste[0];
    }
    if (membre) filter.membre = membre;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const entretiens = await Entretien.find(filter)
      .populate('membre', 'nom prenom email status archiver isEmailVerified')
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

exports.getEntretiensStats = async (req, res) => {
  try {
    await syncStatutsEntretiens();
    // Membres validés leur email et encore sans entretien : à planifier
    const membresAvecEntretien = await Entretien.distinct('membre', {
      status: { $in: ['planifié', 'en-cours', 'terminé'] }
    });

    const [total, planifies, enCours, termines, acceptes, rejetes, aPlanifier] = await Promise.all([
      Entretien.countDocuments(),
      Entretien.countDocuments({ status: 'planifié' }),
      Entretien.countDocuments({ status: 'en-cours' }),
      Entretien.countDocuments({ status: 'terminé' }),
      Entretien.countDocuments({ status: 'accepté' }),
      Entretien.countDocuments({ status: 'rejeté' }),
      Membre.countDocuments({
        status: { $in: ['en-attente', 'non-validé'] },
        isEmailVerified: true,
        archiver: { $ne: true },
        _id: { $nin: membresAvecEntretien }
      })
    ]);
    res.json({
      success: true,
      data: { total, planifies, enCours, termines, acceptes, rejetes, aPlanifier }
    });
  } catch (error) {
    console.error('❌ Erreur getEntretiensStats:', error);
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

exports.terminerEntretien = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Seul le président peut terminer un entretien' });
    }
    const entretien = await Entretien.findById(req.params.id);
    if (!entretien) {
      return res.status(404).json({ success: false, message: 'Entretien non trouvé' });
    }
    const validation = isValidTransition('entretien', entretien.status, 'terminé');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }
    entretien.status = 'terminé';
    await entretien.save();
    res.json({ success: true, message: 'Entretien terminé', data: entretien });
  } catch (error) {
    console.error('❌ Erreur terminerEntretien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.approveEntretien = async (req, res) => {
  try {
    if (req.userRole !== 'President') {
      return res.status(403).json({ success: false, message: 'Seul le président peut accepter' });
    }
    const entretien = await Entretien.findById(req.params.id).populate('membre');
    if (!entretien) {
      return res.status(404).json({ success: false, message: 'Entretien non trouvé' });
    }
    const validation = isValidTransition('entretien', entretien.status, 'accepté');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }
    entretien.status = 'accepté';
    entretien.isApprove = true;
    entretien.dateApprouve = new Date();
    await entretien.save();

    // Action unique : accepter l'entretien transforme la personne en membre actif
    const membre = entretien.membre;
    if (membre) {
      membre.status = 'actif';
      membre.archiver = false;
      membre.isEmailVerified = true;
      await membre.save();
      try {
        await sendValidationAccepteeEmail(membre);
      } catch (err) {
        console.error('❌ Erreur notification acceptation:', err.message);
      }
    }

    res.json({ success: true, message: 'Personne acceptée et compte activé', data: entretien });
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
    const validation = isValidTransition('entretien', entretien.status, 'rejeté');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    // Refuser l'entretien est une décision DÉFINITIVE : le compte passe
    // "banni" (et non plus "refusé"). Conséquences assumées :
    //   - la connexion est bloquée (authController refuse le statut "banni") ;
    //   - le compte sort du KPI "Refusés" et entre dans le KPI "Bannis" ;
    //   - "banni" est un état terminal de la machine d'état, le compte ne peut
    //     plus être ni réactivé ni réinscrit.
    // La transition du membre est validée AVANT toute écriture, sinon on
    // laisserait l'entretien "rejeté" avec un compte non banni.
    const membre = entretien.membre;
    if (membre) {
      const validationMembre = isValidTransition('membre', membre.status, 'banni');
      if (!validationMembre.valid) {
        return res.status(400).json({
          success: false,
          message: `Le compte est dans l'état "${membre.status}" et ne peut pas être banni. L'entretien n'a pas été modifié.`
        });
      }
    }

    entretien.status = 'rejeté';
    entretien.isApprove = false;
    await entretien.save();

    if (membre) {
      membre.status = 'banni';
      await membre.save();
      try {
        await sendEntretienRejectedEmail(membre.email, membre, entretien);
      } catch (err) {
        console.error('❌ Erreur notification rejet:', err.message);
      }
    }

    res.json({ success: true, message: 'Personne rejetée et compte banni définitivement', data: entretien });
  } catch (error) {
    console.error('❌ Erreur rejectEntretien:', error);
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
    if (entretien.status !== 'planifié') {
      return res.status(400).json({ success: false, message: 'Seul un entretien planifié peut être modifié' });
    }
    const dateEffective = req.body.date || entretien.date;
    const dateFinEffective = req.body.dateFin || entretien.dateFin;
    if (dateFinEffective && new Date(dateFinEffective) <= new Date(dateEffective)) {
      return res.status(400).json({ success: false, message: 'La date de fin doit être après la date de début' });
    }
    const updated = await Entretien.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    // Notifier le membre que son entretien a été modifié
    try {
      const membre = await Membre.findById(entretien.membre).select('nom prenom email');
      if (membre) {
        await sendInterviewUpdatedEmail(membre, updated);
        console.log(`📧 Notification de modification envoyée à ${membre.email}`);
      }
    } catch (notifError) {
      console.error('❌ Erreur notification modification entretien:', notifError.message);
    }

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
    if (entretien.status !== 'planifié') {
      return res.status(400).json({ success: false, message: 'Seul un entretien planifié peut être supprimé' });
    }
    await entretien.deleteOne();
    res.json({ success: true, message: 'Entretien supprimé' });
  } catch (error) {
    console.error('❌ Erreur deleteEntretien:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};