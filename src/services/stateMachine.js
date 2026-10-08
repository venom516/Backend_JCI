const stateMachines = {
  event: {
    states: ['planifiée', 'en-cours', 'terminée', 'reportée', 'annulée'],
    transitions: {
      'planifiée': ['en-cours', 'reportée', 'annulée'],
      'en-cours': ['terminée', 'annulée'],
      'reportée': ['planifiée', 'annulée'],
      'terminée': [],
      'annulée': [],
    }
  },
  task: {
    states: ['créée', 'assignée', 'en-cours', 'en-révision', 'terminée', 'annulée'],
    transitions: {
      'créée': ['assignée', 'annulée'],
      'assignée': ['en-cours', 'annulée'],
      'en-cours': ['en-révision', 'annulée'],
      'en-révision': ['en-cours', 'terminée', 'annulée'],
      'terminée': [],
      'annulée': [],
    }
  },
  membre: {
    states: ['non-inscrit', 'en-attente', 'actif', 'suspendu', 'banni', 'refusé'],
    transitions: {
      'non-inscrit': ['en-attente'],
      'en-attente': ['actif', 'non-inscrit', 'refusé', 'banni'],
      'actif': ['suspendu', 'banni'],
      'suspendu': ['actif'],
      'banni': [],
      'refusé': [],
    }
  },
  publication: {
    states: ['créée', 'en-attente', 'publiée', 'archivée', 'supprimée'],
    transitions: {
      'créée': ['en-attente', 'supprimée'],
      'en-attente': ['publiée', 'créée', 'supprimée'],
      'publiée': ['archivée'],
      'archivée': [],
      'supprimée': [],
    }
  },
  news: {
    // 2 statuts de cycle de vie : brouillon -> publiée (acceptation unique).
    // archivée est l'etat final de l'action "archiver".
    states: ['brouillon', 'publiée', 'archivée'],
    transitions: {
      'brouillon': ['publiée'],
      'publiée': ['archivée'],
      'archivée': [],
    }
  },
  document: {
    states: ['brouillon', 'en-attente', 'approuvé', 'archivé', 'supprimé'],
    transitions: {
      'brouillon': ['en-attente', 'supprimé'],
      'en-attente': ['approuvé', 'brouillon', 'supprimé'],
      'approuvé': ['archivé'],
      'archivé': [],
      'supprimé': [],
    }
  },
  entretien: {
    states: ['planifié', 'en-cours', 'terminé', 'accepté', 'rejeté'],
    transitions: {
      'planifié': ['en-cours'],
      'en-cours': ['terminé'],
      'terminé': ['accepté', 'rejeté'],
      'accepté': [],
      'rejeté': [],
    }
  },
};

function isValidTransition(entityType, currentState, nextState) {
  const sm = stateMachines[entityType];
  if (!sm) return { valid: false, message: `Type d'entité inconnu: ${entityType}` };
  if (!sm.states.includes(currentState)) {
    return { valid: false, message: `État actuel invalide: ${currentState}` };
  }
  if (!sm.states.includes(nextState)) {
    return { valid: false, message: `État de destination invalide: ${nextState}` };
  }
  const allowed = sm.transitions[currentState];
  if (!allowed || !allowed.includes(nextState)) {
    return { valid: false, message: `Transition impossible: ${currentState} → ${nextState}` };
  }
  return { valid: true };
}

function getNextStates(entityType, currentState) {
  const sm = stateMachines[entityType];
  if (!sm || !sm.transitions[currentState]) return [];
  return sm.transitions[currentState];
}

function getStates(entityType) {
  const sm = stateMachines[entityType];
  return sm ? sm.states : [];
}

module.exports = { stateMachines, isValidTransition, getNextStates, getStates };
