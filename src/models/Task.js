// backend/src/models/Task.js

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  titre: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  statut: { 
    type: String, 
    enum: ['créée', 'assignée', 'en-cours', 'en-révision', 'terminée', 'annulée'], 
    default: 'créée' 
  },
  deadline: { type: Date, required: true },
  membre: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre', default: null },
  taskType: {
    type: String,
    enum: ['normal', 'media'],
    default: 'normal'
  },
  type: { 
    type: String, 
    enum: ['Task Normale', 'Task Media'], 
    default: 'Task Normale' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre', required: true },
  priority: { 
    type: String, 
    enum: ['basse', 'moyenne', 'haute', 'critique'], 
    default: 'moyenne' 
  },
  location: { type: String, default: '' },
  publication: { type: mongoose.Schema.Types.ObjectId, ref: 'Publication', default: null },
  notificationSent: { type: Boolean, default: false },
  notificationDate: { type: Date },
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre' },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

taskSchema.index({ titre: 'text', description: 'text' });

module.exports = mongoose.model('Task', taskSchema);