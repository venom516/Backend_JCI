const mongoose = require('mongoose');

const formationSchema = new mongoose.Schema({
  titre: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  dateDebut: { type: Date },
  dateFin: { type: Date },
  formateur: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Formation', formationSchema);