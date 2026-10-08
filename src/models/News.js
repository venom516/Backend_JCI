const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  titre: { type: String, required: true, trim: true },
  contenu: { type: String, required: true },
  // Image dynamique : URL Cloudinary. Aucune image par defaut, une actualite
  // peut etre enregistree sans photo.
  image: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['brouillon', 'publiée', 'archivée'], 
    default: 'brouillon' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre', required: true },
  date: { type: Date, default: Date.now },
  tags: [{ type: String, trim: true }],
  // Le frontend envoie et affiche deja cette valeur (7 libelles, memes
  // stringifiees en clair dans I18nContext). Sans ce champ, Mongoose la
  // supprime silencieusement a l'ecriture comme a la lecture.
  category: {
    type: String,
    enum: ['General', 'Evenement', 'Formation', 'Entrepreneuriat', 'Communaute', 'Projet', 'Partenaire'],
    default: 'General',
    trim: true
  },
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membre' }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre' },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

newsSchema.index({ titre: 'text', contenu: 'text' });

module.exports = mongoose.model('News', newsSchema);