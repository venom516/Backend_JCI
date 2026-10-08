/**
 * Contournement de src/config/email.js — SANS modifier ce fichier.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * Dans email.js, le bloc module.exports liste 22 noms en notation courte :
 *
 *     module.exports = { sendEmail, ..., sendNewDocumentEmail, ... };
 *
 * Or 7 de ces fonctions sont commentees dans le fichier (non definies) :
 *   sendNewDocumentEmail, sendTaskAssignmentEmail, sendNewEventEmail,
 *   sendNewPublicationEmail, sendNewNewsEmail, sendTaskReminderEmail,
 *   sendAutoTaskReminderEmail
 *
 * En JavaScript non strict, un identifiant non declare dans un objet est
 * d'abord cherche dans la portee globale. Definir global.<nom> AVANT le
 * require() suffit donc a evanter le ReferenceError au chargement :
 *
 *     ReferenceError: sendNewDocumentEmail is not defined
 *
 * Ce shim doit donc etre require() AVANT email.js (fait en tete de server.js).
 * Aucun email n'est envoye : ce sont des no-op.
 */

const NOTIFS_SUSPENDUES = [
  'sendNewDocumentEmail',
  'sendTaskAssignmentEmail',
  'sendNewEventEmail',
  'sendNewPublicationEmail',
  'sendNewNewsEmail',
  'sendTaskReminderEmail',
  'sendAutoTaskReminderEmail',
];

let installes = 0;

for (const nom of NOTIFS_SUSPENDUES) {
  if (typeof global[nom] === 'undefined') {
    global[nom] = async () => ({ skipped: true, raison: 'notifications email suspendues' });
    installes++;
  }
}

console.log(`\x1b[33m[shim] ${installes} notification(s) email desactivee(s) : ${NOTIFS_SUSPENDUES.join(', ')}\x1b[0m`);

module.exports = { NOTIFS_SUSPENDUES };
