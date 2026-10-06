const jwt = require('jsonwebtoken');
const Membre = require('../models/Membre');

const auth = async (req, res, next) => {
  try {
    // Récupérer le token du header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token manquant.'
      });
    }

    // Vérifier le token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token invalide'
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expiré'
        });
      }
      throw error;
    }

    // Récupérer l'utilisateur
    const membre = await Membre.findById(decoded.id).select('+passwordChangedAt');

    if (!membre) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Invalidation apres changement de mot de passe : iat est en secondes, la
    // comparaison est stricte pour qu'un token emis dans la meme seconde passe.
    if (
      membre.passwordChangedAt &&
      typeof decoded.iat === 'number' &&
      decoded.iat < Math.floor(membre.passwordChangedAt.getTime() / 1000)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Session expirée. Veuillez vous reconnecter.'
      });
    }

    // Vérifier le statut du compte
    if (membre.status === 'banni') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été banni'
      });
    }

    if (membre.status === 'suspendu') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est suspendu'
      });
    }

    if (membre.archiver) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été archivé'
      });
    }

    // Ajouter l'utilisateur à la requête
    req.user = membre;
    req.userId = membre._id;
    req.userRole = membre.role;
    
    next();
  } catch (error) {
    console.error('❌ Erreur auth:', error);
    res.status(401).json({
      success: false,
      message: 'Accès non autorisé'
    });
  }
};

// Remplit req.user si un token valide est present, sans jamais rejeter.
// Necessaire pour les routes publiques qui doivent comportement differencie
// entre visiteur anonyme et membre connecte (lecture d'une actualite) : avec
// auth seul, req.user serait toujours undefined.
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Token invalide ou expire : on reste anonyme plutot que de renvoyer 401
      return next();
    }

    const membre = await Membre.findById(decoded.id).select('+passwordChangedAt');
    if (!membre) return next();

    // Token emis avant le dernier changement de mot de passe : comme pour un
    // compte inutilisable, on reste anonyme plutot que de renvoyer 401.
    if (
      membre.passwordChangedAt &&
      typeof decoded.iat === 'number' &&
      decoded.iat < Math.floor(membre.passwordChangedAt.getTime() / 1000)
    ) {
      return next();
    }

    // Compte inutilisable : reste anonyme, aucune erreur renvoyee
    if (membre.status === 'banni' || membre.status === 'suspendu' || membre.archiver) {
      return next();
    }

    req.user = membre;
    req.userId = membre._id;
    req.userRole = membre.role;
    next();
  } catch (error) {
    console.error('❌ Erreur optionalAuth:', error);
    next();
  }
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;