const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: [true, 'Le titre est obligatoire'],
    trim: true,
    maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
  },
  type: {
    type: String,
    enum: ['PV', 'Ordre du jour', 'Rapport'],
    required: [true, 'Le type est obligatoire']
  },
  fichier: {
    type: String,
    required: [true, 'Le fichier est obligatoire']
  },
  fichierNom: {
    type: String,
    trim: true
  },
  fichierTaille: {
    type: Number
  },
  dateUpload: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['brouillon', 'en-attente', 'approuvé', 'archivé', 'supprimé'],
    default: 'brouillon'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membre',
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  version: {
    type: Number,
    default: 1
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }
}, {
  timestamps: true
});

// Index pour les recherches
documentSchema.index({ titre: 'text', description: 'text' });

module.exports = mongoose.model('Document', documentSchema);