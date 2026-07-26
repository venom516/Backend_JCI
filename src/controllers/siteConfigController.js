const SiteConfig = require('../models/SiteConfig');

exports.getConfig = async (req, res) => {
  try {
    let config = await SiteConfig.findOne({ key: 'main' });
    if (!config) {
      config = await SiteConfig.create({ key: 'main' });
    }
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { slogan } = req.body;
    const update = {};
    if (slogan !== undefined) update.slogan = slogan;
    if (req.file) update.groupPhoto = req.file.path;
    update.updatedBy = req.user._id;

    const config = await SiteConfig.findOneAndUpdate(
      { key: 'main' },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.removeGroupPhoto = async (req, res) => {
  try {
    const config = await SiteConfig.findOneAndUpdate(
      { key: 'main' },
      { $set: { groupPhoto: '' } },
      { new: true }
    );
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
