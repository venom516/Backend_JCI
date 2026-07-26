// backend/src/models/Membre.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const membreSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    default: 'Membre' 
  },
  status: { 
    type: String, 
    enum: ['actif', 'inactif', 'suspendu', 'en-attente', 'non-validé', 'refusé'], 
    default: 'en-attente' 
  },
  isEmailVerified: { type: Boolean, default: false },
  codeValidation: { type: String },
  codeValidationExpire: { type: Date },
  telephone: { type: String, trim: true },
  adresse: { type: String, trim: true },
  situationProfessionnelle: { type: String, trim: true },
  dateNaissance: { type: Date },
  urlFacebook: { type: String },
  urlLinkedIn: { type: String },
  photo: { type: String },
  langues: { type: String, trim: true },
  competences: { type: String, trim: true },
  pointsForts: { type: String, trim: true },
  societe: { type: String, trim: true },
  hobbies: { type: String, trim: true },
  association: { type: String, trim: true },
  connaissanceZone: { type: String, trim: true },
  connaissanceJCI: { type: String, trim: true },
  pointsDeveloppement: { type: String, trim: true },
  parrainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membre' },
  parrain: { type: String, trim: true },
  datePriseFonction: { type: Date },
  mandatAnnee: { type: Number },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  lastLogin: { type: Date },
}, { timestamps: true });

// Hash password avant sauvegarde
membreSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Comparer password
membreSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Membre', membreSchema);