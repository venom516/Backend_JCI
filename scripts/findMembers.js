const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const membreSchema = new mongoose.Schema({}, { strict: false });
const Membre = mongoose.model('Membre', membreSchema);

async function find() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connecté');

  const members = await Membre.find({
    _id: { $ne: null },
    $or: [
      { prenom: { $regex: /wadi|mariem/i } },
      { nom: { $regex: /chikh|ben.?zina/i } }
    ]
  }).select('prenom nom email role status').lean();

  console.log('Trouvés:', JSON.stringify(members, null, 2));

  await mongoose.disconnect();
}

find().catch(console.error);
