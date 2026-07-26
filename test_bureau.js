const Membre = require('./src/models/Membre');
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jci');
  console.log('Connected');
  const membres = await Membre.find({ role: { $in: ['President', 'Conseiller Juridique', 'Past President Immédiat', 'VPPRE', 'VPFD', 'Tresorie', 'SecretaireGeneral'] }, status: 'actif' }).lean();
  console.log('Found:', membres.length, 'members');
  membres.forEach(m => console.log(m.role, m.prenom, m.nom));
  await mongoose.disconnect();
}
test().catch(e => console.error('Error:', e.message));
