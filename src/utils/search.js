// Utilitaires partages - aucune dependance externe.

// Un terme de recherche envoye tel quel dans $regex provoque une erreur Mongo
// sur un caractere special ("(", "[", "*") et permet des motifs catastrophiques
// (ReDoS). On echappe tout ce qui a une signification en expression reguliere.
const escapeRegExp = (texte) =>
  String(texte).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Mongoose interprete un scalaire en RegExp pour $regex ; on impose donc une
// vraie chaine pour qu'un terme contenant un "/" ne soit pas pris pour une
// option (l'utilisateur ne doit pas pouvoir injecter $options).
const pourRecherche = (texte) => new RegExp(escapeRegExp(texte), 'i');

module.exports = { escapeRegExp, pourRecherche };