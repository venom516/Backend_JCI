const mongoose = require('mongoose');

const calendarGeneralSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['event', 'task', 'urgent', 'formation'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  color: { type: String, default: '#3b82f6' },
  lieu: { type: String, trim: true },
  status: { type: String, enum: ['planifié', 'en-cours', 'terminé', 'annulé'], default: 'planifié' },
  priority: { type: String, enum: ['basse', 'moyenne', 'haute', 'urgente'], default: 'moyenne' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membre' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre', required: true },
}, { timestamps: true });

module.exports = mongoose.model('CalendarGeneral', calendarGeneralSchema);
