const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Membre = require('../src/models/Membre');
  const Role = require('../src/models/Role');

  // Créer le rôle ConseillerMedia s'il n'existe pas
  await Role.updateOne(
    { name: 'ConseillerMedia' },
    { $set: { name: 'ConseillerMedia' } },
    { upsert: true }
  );

  // Mettre à jour Ines
  const result = await Membre.updateOne(
    { email: 'ineschalbi93@gmail.com' },
    { $set: { role: 'ConseillerMedia' } }
  );

  if (result.modifiedCount > 0) {
    console.log('✅ Ines → ConseillerMedia');
  } else {
    const ines = await Membre.findOne({ email: 'ineschalbi93@gmail.com' });
    console.log(`ℹ️ Ines déjà "${ines?.role}"`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
