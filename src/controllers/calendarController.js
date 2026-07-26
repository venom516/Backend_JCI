const CalendarGeneral = require('../models/CalendarGeneral');
const CalendarMedia = require('../models/CalendarMedia');

exports.getGeneralEvents = async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = {};
    if (start && end) filter.startDate = { $gte: new Date(start), $lte: new Date(end) };
    const events = await CalendarGeneral.find(filter).populate('createdBy', 'nom prenom').sort({ startDate: 1 });
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createGeneralEvent = async (req, res) => {
  try {
    const event = await CalendarGeneral.create({ ...req.body, createdBy: req.userId });
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateGeneralEvent = async (req, res) => {
  try {
    const event = await CalendarGeneral.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteGeneralEvent = async (req, res) => {
  try {
    const event = await CalendarGeneral.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    res.json({ success: true, message: 'Événement supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMediaEvents = async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = {};
    if (start && end) filter.startDate = { $gte: new Date(start), $lte: new Date(end) };
    const events = await CalendarMedia.find(filter).populate('createdBy', 'nom prenom').sort({ startDate: 1 });
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createMediaEvent = async (req, res) => {
  try {
    const event = await CalendarMedia.create({ ...req.body, createdBy: req.userId });
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateMediaEvent = async (req, res) => {
  try {
    const event = await CalendarMedia.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteMediaEvent = async (req, res) => {
  try {
    const event = await CalendarMedia.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    res.json({ success: true, message: 'Événement supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
