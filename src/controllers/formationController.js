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
