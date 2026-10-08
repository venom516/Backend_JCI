require('dotenv').config();
require('./src/config/emailNotifsShim');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Membre = require('./src/models/Membre');
const http = require('http');

const call = (path, token) => new Promise((res) => {
  const q = http.request({ host: 'localhost', port: 5001, path, method: 'GET', headers: { Authorization: 'Bearer ' + token } },
    (r) => { let s = ''; r.on('data', (c) => s += c); r.on('end', () => res({ code: r.statusCode, body: s })); });
  q.on('error', (e) => res({ code: 'ERR', body: e.message }));
  q.setTimeout(20000, () => { q.destroy(); res({ code: 'TIMEOUT', body: '' }); });
  q.end();
});

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const cible = '6a404882671309f87e40fc9c';
  const pres = await Membre.findById(cible);
  console.log('cible :', pres.prenom, pres.nom, '| role :', pres.role, '| _id :', String(pres._id));

  const tP = jwt.sign({ id: pres._id, role: pres.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  for (const [label, tok] of [
    ['payload {id, role}', tP],
    ['payload {id} seul', jwt.sign({ id: pres._id }, process.env.JWT_SECRET, { expiresIn: '1h' })],
  ]) {
    const r = await call('/api/membres/' + cible, tok);
    console.log(label.padEnd(20), '-> HTTP', r.code, '|', r.body.slice(0, 110));
  }

  const r2 = await call('/api/membres/6a404882671309f87e40fc9c?x=1', tP);
  console.log('avec query string    -> HTTP', r2.code, '|', r2.body.slice(0, 110));

  const r3 = await call('/api/membres/invalid-id', tP);
  console.log('id invalide          -> HTTP', r3.code, '|', r3.body.slice(0, 110));

  await mongoose.disconnect();
})();