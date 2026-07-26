const mongoose = require('mongoose');

const socialProfileSchema = new mongoose.Schema({
  platform: { type: String, enum: ['instagram', 'linkedin'], unique: true, required: true },
  followers: { type: Number, default: null },
  follows: { type: Number, default: null },
  mediaCount: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('SocialProfile', socialProfileSchema);
