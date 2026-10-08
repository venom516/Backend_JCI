const role = {
  // Vérifier si l'utilisateur est Président
  isPresident: (req, res, next) => {
    if (req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul le Président peut effectuer cette action.'
      });
    }
    next();
  },

  // Vérifier si l'utilisateur est Secrétaire Général
  isSecretaireGeneral: (req, res, next) => {
    if (req.userRole !== 'SecretaireGeneral' && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul le Secrétaire Général peut effectuer cette action.'
      });
    }
    next();
  },

  // Vérifier si l'utilisateur est Conseiller Media
  isConseillerMedia: (req, res, next) => {
    if (req.userRole !== 'ConseillerMedia' && req.userRole !== 'President') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul le Conseiller Media peut effectuer cette action.'
      });
    }
    next();
  },

  // Vérifier si l'utilisateur est Admin (Président ou SG)
  isAdmin: (req, res, next) => {
    if (req.userRole === 'President' || req.userRole === 'SecretaireGeneral') {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Vous devez être administrateur.'
    });
  },

  // Vérifier si l'utilisateur est Admin (gestionnaire des utilisateurs)
  isUserManager: (req, res, next) => {
    if (req.userRole !== 'President' && req.userRole !== 'SecretaireGeneral') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul l\'Administrateur peut gérer les utilisateurs.'
      });
    }
    next();
  },

  // Vérifier si l'utilisateur a un des rôles spécifiés
  hasRole: (roles) => {
    return (req, res, next) => {
      if (roles.includes(req.userRole)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôle requis: ${roles.join(', ')}`
      });
    };
  },

  // Vérifier que l'utilisateur n'est PAS un Membre
  notMembre: (req, res, next) => {
    if (req.userRole === 'Membre') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé aux membres.'
      });
    }
    next();
  }
};

module.exports = role;