require('dotenv').config();
const mongoose = require('mongoose');
const Membre = require('./src/models/Membre');
const ctrl = require('./src/controllers/documentController');

const mockRes = () => {
  const r = { code: null, payload: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.payload = b; return r; };
  r.redirect = (u) => { r.code = 302; r.payload = { redirect: u }; return r; };
  return r;
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const p = await Membre.findOne({ role: 'President' });

  for (const id of ['6a454d1d9d73c071e9f0095e']) {
    console.log('=== approveDocument sur', id);
    const req = { params: { id }, userRole: 'President', userId: p._id, body: {}, file: null };
    const res = mockRes();
    try {
      await ctrl.approveDocument(req, res);
      console.log('  -> status', res.code, '|', JSON.stringify(res.payload).slice(0, 120));
    } catch (e) {
      console.log('  -> EXCEPTION NON RATTRAPEE:', e.message);
      console.log(e.stack.split('\n').slice(0, 6).join('\n'));
    }
  }
  await mongoose.disconnect();
})();