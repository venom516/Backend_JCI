// backend/src/models/Membre.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const membreSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { 
    type: String, 
    default: 'Membre',
    // Tous les autres champs String portent trim:true : sans lui, "President "
    // echoue silencieusement sur role === 'President' (droits, unicite, stats).
    trim: true
  },
  roleSecondaire: { type: String, trim: true },
  // Pose au changement de mot de passe : un JWT emis avant cet instant est
  // refuse par auth (invalidation de toutes les sessions existantes).
  passwordChangedAt: { type: Date, select: false },
  status: { 
    type: String, 
    enum: ['non-inscrit', 'en-attente', 'actif', 'suspendu', 'banni', 'refusé', 'inactif', 'non-validé'], 
    default: 'non-inscrit' 
  },
  archiver: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  codeValidation: { type: String, select: false },
  codeValidationExpire: { type: Date, select: false },
  telephone: { type: String, trim: true },
  adresse: { type: String, trim: true },
  sexe: { type: String, trim: true },
  situationProfessionnelle: { type: String, trim: true },
  travailOuEtude: { type: String, trim: true },
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
  mandatFin: { type: Date },
  mandatAnnee: { type: Number },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  lastLogin: { type: Date },
}, { timestamps: true });

// Hash password avant sauvegarde
membreSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Comparer password
membreSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Membre', membreSchema);