// Echappement HTML, utilisé au moment de la CONSTRUCTION d'un gabarit et
// nulle part ailleurs. L'entrée n'est jamais échappée (voir sanitizeInput) :
// échapper à l'entrée corrompt les données stockées et casse la recherche,
// React échappe de son côté ce qui est rendu dans le navigateur, et seuls les
// e-mails produisent du HTML côté serveur.
const escapeHtml = (v) =>
  v === undefined || v === null
    ? ''
    : String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

module.exports = { escapeHtml };
