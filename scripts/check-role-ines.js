const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Membre = require('../src/models/Membre');

  // Chercher Ines
  const ines = await Membre.findOne({ prenom: /ines/i });
  if (!ines) {
    console.log('❌ Ines introuvable');
    // Lister tous les membres
    const all = await Membre.find({}, 'prenom nom email role');
    console.log('Membres:', all.map(m => `${m.prenom} ${m.nom} (${m.email}) → ${m.role}`));
  } else {
    console.log(`Ines: ${ines.prenom} ${ines.nom} (${ines.email}) → rôle: "${ines.role}"`);
    if (ines.role === 'ResponsableMedia') {
      ines.role = 'ConseillerMedia';
      await ines.save();
      console.log('✅ Rôle mis à jour → ConseillerMedia');
    } else if (ines.role === 'ConseillerMedia') {
      console.log('✅ Déjà ConseillerMedia');
    } else {
      console.log(`⚠️ Rôle inattendu: "${ines.role}"`);
    }
  }

  await mongoose.connection.close();
  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
