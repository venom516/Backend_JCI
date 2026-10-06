// Comparaison des numéros de téléphone : la forme compte moins que les
// chiffres. "+216 98 123 456", "98-123-456" et "98123456" doivent pouvoir
// être détectés comme doublons, ce qu'une égalité exacte ne fait pas.

const chiffresSeuls = (v) => (typeof v === 'string' ? v.replace(/\D+/g, '') : '');

const telephoneRenseigne = (v) => chiffresSeuls(v).length > 0;

const memeTelephone = (a, b) => {
  const x = chiffresSeuls(a);
  const y = chiffresSeuls(b);
  return x !== '' && x === y;
};

// Construit une expression régulière ancrée qui tolère des séparateurs entre
// chaque chiffre, pour interroger Mongo sans transférer la collection.
// Seuls des chiffres entrent dans le motif : aucun caractère d'échappement
// utilisateur n'est repris dans la regex.
const regexTelephone = (telephone) => {
  const d = chiffresSeuls(telephone);
  if (!d) return null;
  return new RegExp('^\\D*' + d.split('').join('\\D*') + '\\D*$');
};

module.exports = { chiffresSeuls, telephoneRenseigne, memeTelephone, regexTelephone };
