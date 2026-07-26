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
    enum: ['demandé', 'en-attente', 'approuvé', 'réalisé', 'annulé'],
    default: 'demandé'
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