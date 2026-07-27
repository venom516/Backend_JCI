const Formation = require('../models/Formation');

exports.getCount = async (req, res) => {
  try {
    const count = await Formation.countDocuments();
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const formations = await Formation.find().sort({ createdAt: -1 });
    res.json({ success: true, data: formations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  try {
    const formation = await Formation.create(req.body);
    res.status(201).json({ success: true, data: formation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const formation = await Formation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!formation) return res.status(404).json({ success: false, message: 'Formation non trouvée' });
    res.json({ success: true, data: formation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const formation = await Formation.findByIdAndDelete(req.params.id);
    if (!formation) return res.status(404).json({ success: false, message: 'Formation non trouvée' });
    res.json({ success: true, message: 'Formation supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
