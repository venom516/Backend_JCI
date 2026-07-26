const validator = require('validator');

// ============================================================
// SCHÉMAS DE VALIDATION
// ============================================================

const schemas = {
  // ==========================================================
  // AUTH
  // ==========================================================
  register: {
    nom: { required: true, type: 'string', min: 2, max: 50 },
    prenom: { required: true, type: 'string', min: 2, max: 50 },
    email: { required: true, type: 'email',
      custom: (value) => {
        if (!value) return null;
        const domain = value.split('@')[1]?.toLowerCase();
        const disposable = ['yopmail.com','tempmail.com','guerrillamail.com','mailinator.com','10minutemail.com'];
        if (disposable.includes(domain)) return 'Les emails jetables ne sont pas autorisés';
        return null;
      }
    },
    password: { required: true, type: 'string', min: 6 },
    telephone: { 
      required: false, 
      type: 'string', 
      min: 8, 
      max: 8,
      custom: (value) => {
        if (!value) return null;
        const cleaned = value.replace(/[\s\-\(\)\.\+]/g, '');
        if (!/^[0-9]{8}$/.test(cleaned)) {
          return 'Le numéro de téléphone doit contenir exactement 8 chiffres';
        }
        return null;
      }
    },
    adresse: { required: false, type: 'string', max: 200 },
    situationProfessionnelle: { 
      required: false, 
      type: 'enum', 
      values: ['Étudiant', 'Professionnel', 'Autre'] 
    },
    dateNaissance: { 
      required: false, 
      type: 'string',
      custom: (value) => {
        if (!value) return null;
        let day, month, year;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
          [day, month, year] = value.split('/').map(Number);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          [year, month, day] = value.split('-').map(Number);
        } else {
          return 'La date doit être au format DD/MM/AAAA ou AAAA-MM-JJ';
        }
        if (month < 1 || month > 12) return 'Le mois doit être entre 01 et 12';
        if (day < 1 || day > 31) return 'Le jour doit être entre 01 et 31';
        const date = new Date(year, month - 1, day);
        if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
          return 'Date invalide (ex: 31/02/2000 n\'existe pas)';
        }
        if (date > new Date()) return 'La date de naissance ne peut pas être dans le futur';
        return null;
      }
    },
    urlFacebook: { required: false, type: 'url' },
    urlLinkedIn: { required: false, type: 'url' },
    societe: { required: false, type: 'string', max: 200 },
    hobbies: { required: false, type: 'string', max: 500 },
    association: { required: false, type: 'string', max: 200 },
    connaissanceZone: { required: false, type: 'string', max: 1000 },
    connaissanceJCI: { required: false, type: 'string', max: 1000 },
    pointsDeveloppement: { required: false, type: 'string', max: 1000 },
    parrainId: { required: false, type: 'string' },
    parrain: { required: false, type: 'string', max: 200 }
  },

  login: {
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', min: 6 }
  },

  verifyEmail: {
    email: { required: true, type: 'email' },
    code: { required: true, type: 'string', min: 6, max: 6 }
  },

  // ==========================================================
  // MEMBRE
  // ==========================================================
  membreUpdate: {
    nom: { required: false, type: 'string', min: 1, max: 50 },
    prenom: { required: false, type: 'string', min: 1, max: 50 },
    email: { required: false, type: 'email',
      custom: (value) => {
        if (!value) return null;
        const domain = value.split('@')[1]?.toLowerCase();
        const disposable = ['yopmail.com','tempmail.com','guerrillamail.com','mailinator.com','10minutemail.com'];
        if (disposable.includes(domain)) return 'Les emails jetables ne sont pas autorisés';
        return null;
      }
    },
    telephone: { 
      required: false, 
      type: 'string', 
      min: 8, 
      max: 8,
      custom: (value) => {
        if (!value) return null;
        const cleaned = value.replace(/[\s\-\(\)\.\+]/g, '');
        if (!/^[0-9]{8}$/.test(cleaned)) {
          return 'Le numéro de téléphone doit contenir exactement 8 chiffres';
        }
        return null;
      }
    },
    adresse: { required: false, type: 'string', max: 200 },
    situationProfessionnelle: { 
      required: false, 
      type: 'string', 
      min: 0, 
      max: 100 
    },
    dateNaissance: { 
      required: false, 
      type: 'string',
      custom: (value) => {
        if (!value) return null;
        let day, month, year;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
          [day, month, year] = value.split('/').map(Number);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          [year, month, day] = value.split('-').map(Number);
        } else {
          return 'La date doit être au format DD/MM/AAAA ou AAAA-MM-JJ';
        }
        if (month < 1 || month > 12) return 'Le mois doit être entre 01 et 12';
        if (day < 1 || day > 31) return 'Le jour doit être entre 01 et 31';
        const date = new Date(year, month - 1, day);
        if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
          return 'Date invalide (ex: 31/02/2000 n\'existe pas)';
        }
        if (date > new Date()) return 'La date de naissance ne peut pas être dans le futur';
        return null;
      }
    },
    urlFacebook: { required: false, type: 'url' },
    urlLinkedIn: { required: false, type: 'url' },
    langues: { required: false, type: 'string', max: 100 },
    competences: { required: false, type: 'string', max: 500 },
    pointsForts: { required: false, type: 'string', max: 500 },
    societe: { required: false, type: 'string', max: 200 },
    hobbies: { required: false, type: 'string', max: 500 },
    association: { required: false, type: 'string', max: 200 },
    connaissanceZone: { required: false, type: 'string', max: 1000 },
    connaissanceJCI: { required: false, type: 'string', max: 1000 },
    pointsDeveloppement: { required: false, type: 'string', max: 1000 },
    password: {
      required: false,
      type: 'string',
      min: 6,
      custom: (value) => {
        if (!value) return null;
        if (value.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
        if (!/[A-Z]/.test(value)) return 'Le mot de passe doit contenir au moins une majuscule';
        if (!/[a-z]/.test(value)) return 'Le mot de passe doit contenir au moins une minuscule';
        if (!/[0-9]/.test(value)) return 'Le mot de passe doit contenir au moins un chiffre';
        return null;
      }
    },
    role: { 
      required: false, 
      type: 'string', 
      min: 2, 
      max: 50 
    },
    status: { 
      required: false, 
      type: 'enum', 
      values: ['non-validé', 'en-attente', 'actif', 'suspendu', 'banni'] 
    }
  },

  membreValidate: {
    action: { 
      required: true, 
      type: 'enum', 
      values: ['validate', 'reject'] 
    }
  },

  // ==========================================================
  // TASK
  // ==========================================================
  task: {
    titre: { required: true, type: 'string', min: 3, max: 100 },
    description: { required: false, type: 'string', max: 1000 },
    deadline: { required: true, type: 'date' },
    membre: { required: false, type: 'string' },
    type: { 
      required: false, 
      type: 'enum', 
      values: ['Task Normale', 'Task Media'] 
    },
    priority: { 
      required: false, 
      type: 'enum', 
      values: ['basse', 'moyenne', 'haute', 'critique'] 
    },
    statut: { 
      required: false, 
      type: 'enum', 
      values: ['créée', 'assignée', 'en-cours', 'en-révision', 'terminée', 'annulée'] 
    }
  },

  taskComment: {
    content: { required: true, type: 'string', min: 1, max: 500 }
  },

  // ==========================================================
  // NEWS
  // ==========================================================
  news: {
    titre: { required: true, type: 'string', min: 3, max: 100 },
    contenu: { required: true, type: 'string', min: 10 },
    image: { required: false, type: 'string' },
    tags: { required: false, type: 'array' },
    status: { 
      required: false, 
      type: 'enum', 
      values: ['brouillon', 'en-attente', 'publiée', 'archivée', 'supprimée'] 
    }
  },

  newsComment: {
    content: { required: true, type: 'string', min: 1, max: 500 }
  },

  // ==========================================================
  // EVENT
  // ==========================================================
  event: {
    titre: { required: true, type: 'string', min: 3, max: 100 },
    type: { 
      required: true, 
      type: 'enum', 
      values: ['Action', 'Formation', 'Manifestation', 'Réunion', 'AGP'] 
    },
    description: { required: true, type: 'string', min: 10, max: 1000 },
    date: { required: true, type: 'date' },
    dateFin: { required: false, type: 'date' },
    lieu: { required: true, type: 'string', min: 3, max: 200 },
    maxParticipants: { required: false, type: 'number', min: 0 },
    ordreDuJour: { required: false, type: 'string', max: 2000 },
    image: { required: false, type: 'string' },
    status: { 
      required: false, 
      type: 'enum', 
      values: ['planifiée', 'en-cours', 'terminée', 'reportée', 'annulée'] 
    }
  },

  eventStatus: {
    status: { 
      required: true, 
      type: 'enum', 
      values: ['planifiée', 'en-cours', 'terminée', 'reportée', 'annulée'] 
    }
  },

  // ==========================================================
  // DOCUMENT
  // ==========================================================
  document: {
    titre: { required: true, type: 'string', min: 3, max: 200 },
    type: { 
      required: true, 
      type: 'enum', 
      values: ['PV', 'Ordre du jour', 'Rapport'] 
    },
    description: { required: false, type: 'string', max: 500 },
    eventId: { required: false, type: 'string' }
  },

  documentUpdate: {
    titre: { required: false, type: 'string', min: 3, max: 200 },
    type: { 
      required: false, 
      type: 'enum', 
      values: ['PV', 'Ordre du jour', 'Rapport'] 
    },
    description: { required: false, type: 'string', max: 500 },
    status: { 
      required: false, 
      type: 'enum', 
      values: ['brouillon', 'en-attente', 'approuvé', 'archivé', 'supprimé'] 
    }
  },

  // ==========================================================
  // ENTRETIEN
  // ==========================================================
  entretien: {
    date: { required: true, type: 'date' },
    commentaire: { required: false, type: 'string', max: 500 },
    lieu: { required: false, type: 'string', max: 200 }
  },

  entretienUpdate: {
    date: { required: false, type: 'date' },
    commentaire: { required: false, type: 'string', max: 500 },
    lieu: { required: false, type: 'string', max: 200 },
    note: { required: false, type: 'number', min: 0, max: 20 },
    remarques: { required: false, type: 'string', max: 500 }
  },

  // ==========================================================
  // PUBLICATION
  // ==========================================================
  publication: {
    titre: { required: true, type: 'string', min: 3, max: 200 },
    caption: { required: false, type: 'string', max: 500 },
    type: { 
      required: true, 
      type: 'enum', 
      values: ['Vidéo', 'Story', 'Photo'] 
    },
    socialMedia: { 
      required: false, 
      type: 'array' 
    },
    datePublication: { required: false, type: 'date' }
  },

  publicationUpdate: {
    titre: { required: false, type: 'string', min: 3, max: 200 },
    caption: { required: false, type: 'string', max: 500 },
    type: { 
      required: false, 
      type: 'enum', 
      values: ['Vidéo', 'Story', 'Photo'] 
    },
    socialMedia: { required: false, type: 'array' },
    status: { 
      required: false, 
      type: 'enum', 
      values: ['créée', 'en-attente', 'publiée', 'archivée', 'supprimée'] 
    }
  },

  publicationStats: {
    views: { required: false, type: 'number', min: 0 },
    likes: { required: false, type: 'number', min: 0 },
    shares: { required: false, type: 'number', min: 0 },
    comments: { required: false, type: 'number', min: 0 }
  },

};

// ============================================================
// FONCTION DE VALIDATION PRINCIPALE
// ============================================================

const validateSchema = (data, schema) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Vérifier les champs requis
    if (rules.required) {
      if (value === undefined || value === null || value === '') {
        errors.push(`Le champ "${field}" est obligatoire`);
        continue;
      }
    }

    // Ignorer la validation si le champ n'est pas présent et n'est pas requis
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Valider le type
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Le champ "${field}" doit être une chaîne de caractères`);
        } else {
          if (rules.min && value.length < rules.min) {
            errors.push(`Le champ "${field}" doit contenir au moins ${rules.min} caractères`);
          }
          if (rules.max && value.length > rules.max) {
            errors.push(`Le champ "${field}" ne doit pas dépasser ${rules.max} caractères`);
          }
        }
        break;

      case 'email':
        if (!validator.isEmail(value)) {
          errors.push(`Le champ "${field}" doit être un email valide`);
        }
        break;

      case 'url':
        if (!validator.isURL(value)) {
          errors.push(`Le champ "${field}" doit être une URL valide`);
        }
        break;

      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push(`Le champ "${field}" doit être une date valide`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Le champ "${field}" doit être un nombre`);
        } else {
          if (rules.min !== undefined && value < rules.min) {
            errors.push(`Le champ "${field}" doit être supérieur ou égal à ${rules.min}`);
          }
          if (rules.max !== undefined && value > rules.max) {
            errors.push(`Le champ "${field}" doit être inférieur ou égal à ${rules.max}`);
          }
        }
        break;

      case 'enum':
        if (!rules.values.includes(value.normalize('NFC'))) {
          errors.push(`Le champ "${field}" doit être l'une des valeurs suivantes: ${rules.values.join(', ')}`);
        }
        break;

      case 'array':
        if (typeof value === 'string') {
          try { JSON.parse(value); break; } catch {}
        }
        if (!Array.isArray(value)) {
          errors.push(`Le champ "${field}" doit être un tableau`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Le champ "${field}" doit être un booléen`);
        }
        break;
    }

    // Validation personnalisée
    if (rules.custom && typeof rules.custom === 'function') {
      const customError = rules.custom(value, data);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================================
// MIDDLEWARE DE VALIDATION GÉNÉRIQUE
// ============================================================

const validate = (schema) => {
  return (req, res, next) => {
    const data = req.body;
    const result = validateSchema(data, schema);

    if (!result.valid) {
      console.log('❌ Validation errors:', JSON.stringify(result.errors));
      console.log('📦 Request body:', JSON.stringify(data));
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation: ' + result.errors.join(', '),
        errors: result.errors
      });
    }

    next();
  };
};

// ============================================================
// VALIDATIONS SPÉCIFIQUES
// ============================================================

// ---------- AUTH ----------
const validateRegister = validate(schemas.register);
const validateLogin = validate(schemas.login);
const validateVerifyEmail = validate(schemas.verifyEmail);

// ---------- MEMBRE ----------
const validateMembreUpdate = validate(schemas.membreUpdate);
const validateMembreValidate = validate(schemas.membreValidate);

// ---------- TASK ----------
const validateTask = validate(schemas.task);
const validateTaskComment = validate(schemas.taskComment);

// ---------- NEWS ----------
const validateNews = validate(schemas.news);
const validateNewsComment = validate(schemas.newsComment);

// ---------- EVENT ----------
const validateEvent = validate(schemas.event);
const validateEventStatus = validate(schemas.eventStatus);

// ---------- DOCUMENT ----------
const validateDocument = validate(schemas.document);
const validateDocumentUpdate = validate(schemas.documentUpdate);

// ---------- ENTRETIEN ----------
const validateEntretien = validate(schemas.entretien);
const validateEntretienUpdate = validate(schemas.entretienUpdate);

// ---------- PUBLICATION ----------
const validatePublication = validate(schemas.publication);
const validatePublicationUpdate = validate(schemas.publicationUpdate);
const validatePublicationStats = validate(schemas.publicationStats);

// ============================================================
// VALIDATEURS DE CHAMPS INDIVIDUELS
// ============================================================

// Valider un email
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

// Valider un mot de passe
const isValidPassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Valider un numéro de téléphone tunisien
const isValidTunisianPhone = (tel) => {
  if (!tel) return true;
  return /^[2-9][0-9]{7}$/.test(tel) || /^[0-9]{8,10}$/.test(tel);
};

// Valider un ObjectId MongoDB
const isValidObjectId = (id) => {
  return validator.isMongoId(id);
};

// Valider une date
const isValidDate = (date, future = false) => {
  const errors = [];
  
  if (!date) {
    errors.push('La date est obligatoire');
    return { valid: false, errors };
  }
  
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    errors.push('Date invalide');
  }
  
  if (future && d < new Date()) {
    errors.push('La date doit être dans le futur');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Valider une URL
const isValidUrl = (url) => {
  if (!url) return true;
  return validator.isURL(url);
};

// Valider une chaîne
const isValidString = (str, min = 1, max = 100) => {
  const errors = [];
  
  if (str === undefined || str === null || str === '') {
    errors.push('La chaîne est obligatoire');
    return { valid: false, errors };
  }
  
  if (typeof str !== 'string') {
    errors.push('Doit être une chaîne de caractères');
  }
  
  if (str.length < min) {
    errors.push(`La chaîne doit contenir au moins ${min} caractères`);
  }
  
  if (str.length > max) {
    errors.push(`La chaîne ne doit pas dépasser ${max} caractères`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Valider un nombre
const isValidNumber = (num, min = 0, max = Infinity) => {
  const errors = [];
  
  if (num === undefined || num === null) {
    errors.push('Le nombre est obligatoire');
    return { valid: false, errors };
  }
  
  if (typeof num !== 'number' || isNaN(num)) {
    errors.push('Doit être un nombre valide');
  }
  
  if (num < min) {
    errors.push(`Le nombre doit être supérieur ou égal à ${min}`);
  }
  
  if (num > max) {
    errors.push(`Le nombre doit être inférieur ou égal à ${max}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Valider une énumération
const isValidEnum = (value, values) => {
  const errors = [];
  
  if (!value) {
    errors.push('La valeur est obligatoire');
    return { valid: false, errors };
  }
  
  if (!values.includes(value)) {
    errors.push(`La valeur doit être: ${values.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================================
// VALIDATEURS COMPOSÉS
// ============================================================

// Valider les données d'inscription complètes
const validateRegistrationData = (data) => {
  const errors = [];
  
  // Nom
  const nomResult = isValidString(data.nom, 2, 50);
  if (!nomResult.valid) errors.push(...nomResult.errors);
  
  // Prénom
  const prenomResult = isValidString(data.prenom, 2, 50);
  if (!prenomResult.valid) errors.push(...prenomResult.errors);
  
  // Email
  if (!isValidEmail(data.email)) {
    errors.push('Email invalide');
  }
  
  // Mot de passe
  const passwordResult = isValidPassword(data.password);
  if (!passwordResult.valid) errors.push(...passwordResult.errors);
  
  // Téléphone
  if (data.telephone && !isValidTunisianPhone(data.telephone)) {
    errors.push('Numéro de téléphone invalide');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Valider les données d'un événement
const validateEventData = (data) => {
  const errors = [];
  
  const titreResult = isValidString(data.titre, 3, 100);
  if (!titreResult.valid) errors.push(...titreResult.errors);
  
  const typeResult = isValidEnum(data.type, ['Action', 'Formation', 'Manifestation', 'Réunion', 'AGP']);
  if (!typeResult.valid) errors.push(...typeResult.errors);
  
  const descResult = isValidString(data.description, 10, 1000);
  if (!descResult.valid) errors.push(...descResult.errors);
  
  const dateResult = isValidDate(data.date, true);
  if (!dateResult.valid) errors.push(...dateResult.errors);
  
  const lieuResult = isValidString(data.lieu, 3, 200);
  if (!lieuResult.valid) errors.push(...lieuResult.errors);
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Valider les données d'une tâche
const validateTaskData = (data) => {
  const errors = [];
  
  const titreResult = isValidString(data.titre, 3, 100);
  if (!titreResult.valid) errors.push(...titreResult.errors);
  
  const dateResult = isValidDate(data.deadline, true);
  if (!dateResult.valid) errors.push(...dateResult.errors);
  
  if (data.type) {
    const typeResult = isValidEnum(data.type, ['Task Normale', 'Task Media']);
    if (!typeResult.valid) errors.push(...typeResult.errors);
  }
  
  if (data.priority) {
    const priorityResult = isValidEnum(data.priority, ['basse', 'moyenne', 'haute', 'critique']);
    if (!priorityResult.valid) errors.push(...priorityResult.errors);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================================
// SANITIZE
// ============================================================

const URL_FIELDS = new Set(['urlFacebook', 'urlLinkedIn', 'photo']);

const sanitizeString = (str, fieldName) => {
  if (typeof str !== 'string') return str;
  const trimmed = validator.trim(str);
  if (URL_FIELDS.has(fieldName)) return trimmed;
  return validator.escape(trimmed);
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item, key) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      result[key] = sanitizeString(value, key);
    } else {
      result[key] = value;
    }
  }
  return result;
};

// Middleware de sanitization
const sanitizeInput = (req, res, next) => {
  const photo = req.body?.photo;
  if (photo) delete req.body.photo;
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  if (photo) req.body.photo = photo;
  next();
};

// ============================================================
// VALIDATEURS D'ID
// ============================================================

// Valider un ObjectId dans les paramètres
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!validator.isMongoId(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID invalide'
    });
  }
  next();
};

// ============================================================
// EXPORTATIONS
// ============================================================

module.exports = {
  // Schémas
  schemas,
  validateSchema,
  
  // Middleware générique
  validate,
  
  // Validations spécifiques (middleware)
  validateRegister,
  validateLogin,
  validateVerifyEmail,
  validateMembreUpdate,
  validateMembreValidate,
  validateTask,
  validateTaskComment,
  validateNews,
  validateNewsComment,
  validateEvent,
  validateEventStatus,
  validateDocument,
  validateDocumentUpdate,
  validateEntretien,
  validateEntretienUpdate,
  validatePublication,
  validatePublicationUpdate,
  validatePublicationStats,
  // Validateurs de champs individuels
  isValidEmail,
  isValidPassword,
  isValidTunisianPhone,
  isValidObjectId,
  isValidDate,
  isValidUrl,
  isValidString,
  isValidNumber,
  isValidEnum,
  
  // Validateurs composés
  validateRegistrationData,
  validateEventData,
  validateTaskData,
  
  // Sanitize
  sanitizeString,
  sanitizeObject,
  sanitizeInput,
  
  // Validateur d'ID
  validateObjectId
};