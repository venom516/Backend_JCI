// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

// Évite le crash sur erreurs réseau / MongoDB
process.on('uncaughtException', (err) => {
  console.error('⚠️ uncaughtException (ignorée):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ unhandledRejection (ignorée):', reason?.message || reason);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Confiance proxy (nécessaire pour rate limiting derrière un proxy)
app.set('trust proxy', 1);

// Sécurité - Headers HTTP (CSP assoupli pour embeds sociaux)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "http://localhost:5000"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://localhost:*", "https://*.mongodb.net"],
      frameSrc: ["https://maps.google.com", "https://www.google.com", "https://www.facebook.com", "https://www.instagram.com", "https://www.youtube.com"],
    }
  }
}));

// CORS - configuration stricte (AVANT rate limiting pour que les erreurs 429 aient les headers CORS)
const corsOptions = {
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
    : ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Trop de requêtes, réessayez plus tard.' }
});
app.use(globalLimiter);

// Rate limiting spécifique pour login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Trop de tentatives, réessayez plus tard.' }
});

// Rate limiting pour le formulaire de contact
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Trop de messages envoyés, réessayez plus tard.' }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Protection contre les injections MongoDB
app.use(mongoSanitize());

// Fichiers uploadés (avec CORS + CORP pour les images)
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  const allowed = Array.isArray(corsOptions.origin) ? corsOptions.origin : [corsOptions.origin];
  if (origin && allowed.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// ──────────────────────────────────────────────
// Middleware : vérifie que MongoDB est connecté
// ──────────────────────────────────────────────
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Base de données non connectée. Veuillez réessayer dans quelques instants.'
    });
  }
  next();
});

// Routes
const authRoutes = require('./src/routes/authRoutes');
const membreRoutes = require('./src/routes/membreRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const newsRoutes = require('./src/routes/newsRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const entretienRoutes = require('./src/routes/entretienRoutes');
const publicationRoutes = require('./src/routes/publicationRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const formationRoutes = require('./src/routes/formationRoutes');
const socialRoutes = require('./src/routes/socialRoutes');
const siteConfigRoutes = require('./src/routes/siteConfigRoutes');
const calendarRoutes = require('./src/routes/calendarRoutes');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/membres', membreRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/entretiens', entretienRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/formations', formationRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/site-config', siteConfigRoutes);
app.use('/api/calendar', calendarRoutes);

// Route santé (accessible même si MongoDB est down)
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  let alive = false;
  if (dbState === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      alive = true;
    } catch (_) {}
  }
  res.json({
    status: alive ? 'ok' : 'error',
    database: stateMap[dbState] || 'unknown',
    alive,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API JCI Sidi Mansour - Plateforme de gestion interne',
    version: '1.0.0'
  });
});

// ──────────────────────────────────────────────
// Gestion centralisée des erreurs
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur non gérée:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.expose ? err.message : 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
  });
});

// ──────────────────────────────────────────────
// Connexion MongoDB (asynchrone — ne bloque pas le serveur)
// ──────────────────────────────────────────────
const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 15000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 10000,
        bufferCommands: false,
      });
      console.log('✅ MongoDB connecté !');
      console.log(`📊 Base de données: ${mongoose.connection.name}`);

      mongoose.connection.on('error', (err) => {
        console.error('❌ Erreur MongoDB:', err.message);
      });
      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB déconnecté, reconnexion...');
      });
      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnecté !');
      });
      return;
    } catch (err) {
      console.log(`⚠️ Tentative ${i + 1}/${retries} MongoDB:`, err.message);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  console.log('⚠️ MongoDB non disponible après plusieurs tentatives');
};

// Démarrer le serveur immédiatement, MongoDB en parallèle
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});

// Lancer la connexion MongoDB, puis les services si réussie
connectDB().then(() => {
  // ✅ Démarrer les services après connexion DB
  try {
    const { startReminderService } = require('./src/services/reminderService');
    startReminderService();
  } catch (error) {
    console.log('⚠️ Service de rappel non disponible:', error.message);
  }


});

module.exports = app;