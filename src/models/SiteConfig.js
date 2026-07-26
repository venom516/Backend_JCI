const mongoose = require('mongoose');

const siteConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'main' },
  slogan: { type: String, default: 'One Team, One Impact' },
  adresse: { type: String, default: 'JCI Sidi Mansour' },
  groupPhoto: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre' },
}, { timestamps: true });

module.exports = mongoose.model('SiteConfig', siteConfigSchema);
