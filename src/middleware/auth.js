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
    const membre = await Membre.findById(decoded.id)
      .select('-password -codeValidation -codeValidationExpire');

    if (!membre) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
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

module.exports = auth;