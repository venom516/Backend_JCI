const mongoose = require('mongoose');

const calendarMediaSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  mediaType: {
    type: String,
    enum: ['facebook', 'instagram', 'linkedin', 'youtube', 'story', 'reel', 'photo', 'video', 'communication', 'design_graphique', 'campagne'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  color: { type: String, default: '#8b5cf6' },
  lieu: { type: String, trim: true },
  status: { type: String, enum: ['planifié', 'en-cours', 'terminé', 'annulé'], default: 'planifié' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membre' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre', required: true },
}, { timestamps: true });

module.exports = mongoose.model('CalendarMedia', calendarMediaSchema);
