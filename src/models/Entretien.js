const mongoose = require('mongoose');

const entretienSchema = new mongoose.Schema({
  membre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membre',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'La date est obligatoire']
  },
  dateFin: {
    type: Date,
    required: [true, 'La date de fin est obligatoire']
  },
  lien: {
    type: String,
    trim: true
  },
  lieu: {
    type: String,
    trim: true
  },
  commentaire: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['planifié', 'en-cours', 'terminé', 'accepté', 'rejeté'],
    default: 'planifié'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membre',
    required: true
  },
  isApprove: {
    type: Boolean,
    default: false
  },
  note: {
    type: Number,
    min: 0,
    max: 20
  },
  remarques: {
    type: String,
    trim: true
  },
  dateApprouve: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Entretien', entretienSchema);