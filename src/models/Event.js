const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  titre: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['Action', 'Formation', 'Manifestation', 'Réunion', 'AGP'], 
    required: true 
  },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  dateFin: { type: Date },
  lieu: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['planifiée', 'en-cours', 'terminée', 'reportée', 'annulée'], 
    default: 'planifiée' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membre' }],
  maxParticipants: { type: Number, default: 0 },
  ordreDuJour: { type: String, trim: true },
  image: { type: String, default: 'default-event.jpg' }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);