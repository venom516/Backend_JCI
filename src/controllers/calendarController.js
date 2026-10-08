const CalendarGeneral = require('../models/CalendarGeneral');
const CalendarMedia = require('../models/CalendarMedia');

const parseDate = (valeur) => {
  if (!valeur) return null;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const TOLERANCE_MS = 60 * 1000;

const aLaMinute = (d) => Math.floor(d.getTime() / 60000);

const controlerDates = (body, { creation, existant }) => {
  if (creation && !body.startDate) {
    return 'La date de début est requise';
  }

  const debut = body.startDate ? parseDate(body.startDate) : null;
  if (body.startDate && debut === undefined) {
    return 'Date de début invalide';
  }

  if (body.endDate) {
    const fin = parseDate(body.endDate);
    if (fin === undefined) {
      return 'Date de fin invalide';
    }
    const reference = debut || (existant ? parseDate(existant.startDate) : null);
    if (reference && (creation ? fin <= reference : fin < reference)) {
      return 'La date de fin doit être après la date de début';
    }
  }

  if (creation && debut && debut.getTime() < Date.now() - TOLERANCE_MS) {
    return 'Impossible d\'ajouter un événement dans le passé. Choisissez une date à partir de maintenant.';
  }

  if (!creation && debut && existant) {
    const actuel = parseDate(existant.startDate);
    if (actuel && aLaMinute(debut) !== aLaMinute(actuel) && debut.getTime() < Date.now() - TOLERANCE_MS) {
      return 'Impossible de déplacer un événement dans le passé.';
    }
  }

  return null;
};

const nettoyer = (body) => {
  const copie = { ...body };
  delete copie.createdBy;
  delete copie._id;
  delete copie.__v;
  return copie;
};

const applyRoutes = (Model, prefix) => ({
  lister: async (req, res) => {
    try {
      const { start, end } = req.query;
      const filter = {};
      if (start && end) filter.startDate = { $gte: new Date(start), $lte: new Date(end) };
      const events = await Model.find(filter).populate('createdBy', 'nom prenom').sort({ startDate: 1 });
      res.json({ success: true, data: events });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  creer: async (req, res) => {
    try {
      const erreur = controlerDates(req.body, { creation: true });
      if (erreur) {
        return res.status(400).json({ success: false, message: erreur });
      }
      const event = await Model.create({ ...nettoyer(req.body), createdBy: req.userId });
      res.status(201).json({ success: true, data: event });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  modifier: async (req, res) => {
    try {
      const existant = await Model.findById(req.params.id).select('startDate');
      if (!existant) return res.status(404).json({ success: false, message: 'Événement non trouvé' });

      const erreur = controlerDates(req.body, { creation: false, existant });
      if (erreur) {
        return res.status(400).json({ success: false, message: erreur });
      }
      const event = await Model.findByIdAndUpdate(req.params.id, nettoyer(req.body), { new: true, runValidators: true });
      if (!event) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
      res.json({ success: true, data: event });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  supprimer: async (req, res) => {
    try {
      const event = await Model.findByIdAndDelete(req.params.id);
      if (!event) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
      res.json({ success: true, message: 'Événement supprimé' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
});

const general = applyRoutes(CalendarGeneral, 'general');
const media = applyRoutes(CalendarMedia, 'media');

exports.getGeneralEvents = general.lister;
exports.createGeneralEvent = general.creer;
exports.updateGeneralEvent = general.modifier;
exports.deleteGeneralEvent = general.supprimer;

exports.getMediaEvents = media.lister;
exports.createMediaEvent = media.creer;
exports.updateMediaEvent = media.modifier;
exports.deleteMediaEvent = media.supprimer;