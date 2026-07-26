const mongoose = require('mongoose');

const publicationSchema = new mongoose.Schema({
  titre: { type: String, required: true, trim: true },
  caption: { type: String, trim: true },
  type: { type: String, enum: ['Vidéo', 'Story', 'Photo'], required: true },
  socialMedia: [{ type: String, enum: ['Facebook', 'Instagram', 'LinkedIn', 'Twitter', 'YouTube'] }],
  fichier: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['créée', 'en-attente', 'publiée', 'archivée', 'supprimée'], 
    default: 'créée' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  date: { type: Date, default: Date.now },
  datePublication: { type: Date },
  stats: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Publication', publicationSchema);