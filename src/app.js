const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ============ MIDDLEWARES ============

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Permissions-Policy : allow unload (supprime les warnings Chrome)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'unload=()');
  next();
});

// Logging des requêtes
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  next();
});

// ============ ROUTES ============

// Route de base
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API JCI Sidi Mansour - Plateforme de gestion interne',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      membres: '/api/membres',
      tasks: '/api/tasks',
      news: '/api/news',
      events: '/api/events',
      documents: '/api/documents',
      entretiens: '/api/entretiens',
      publications: '/api/publications',
      dashboard: '/api/dashboard',
      contact: '/api/contact'
    }
  });
});

// Import des routes
const authRoutes = require('./routes/authRoutes');
const membreRoutes = require('./routes/membreRoutes');
const taskRoutes = require('./routes/taskRoutes');
const newsRoutes = require('./routes/newsRoutes');
const eventRoutes =require('./routes/eventRoutes');
const documentRoutes = require('./routes/documentRoutes');
const entretienRoutes = require('./routes/entretienRoutes');
const publicationRoutes = require('./routes/publicationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const contactRoutes = require('./routes/contactRoutes');
const formationRoutes = require('./routes/formationRoutes');
const socialRoutes = require('./routes/socialRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

// Utilisation des routes
app.use('/api/auth', authRoutes);
app.use('/api/membres', membreRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/entretiens', entretienRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/formations', formationRoutes);
app.use('/api/calendar', calendarRoutes);

// ============ GESTION DES ERREURS ============

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route non trouvée: ${req.method} ${req.url}`
  });
});

// Middleware d'erreur global
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erreur serveur interne';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;