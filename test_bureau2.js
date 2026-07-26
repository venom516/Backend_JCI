const mongoose = require('mongoose');
const config = require('./src/config/database');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jci');
  console.log('Connected');
  const Membre = mongoose.model('Membre', require('./src/models/Membre').schema);
  
  const roles = await Membre.distinct('role');
  console.log('All roles:', roles);
  
  const statuses = await Membre.distinct('status');
  console.log('All statuses:', statuses);
  
  const actifs = await Membre.countDocuments({ status: 'actif' });
  console.log('Actifs count:', actifs);
  
  const bureau = await Membre.find({ role: { $in: ['President'] }, status: 'actif' }).lean();
  console.log('President found:', bureau.length);
  bureau.forEach(m => console.log(' -', m.role, m.prenom, m.nom));
  
  await mongoose.disconnect();
}
test().catch(e => console.error('Error:', e.message));
