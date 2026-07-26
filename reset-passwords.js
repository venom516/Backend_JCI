require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Membre = require('./src/models/Membre');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    const members = await Membre.find({});
    console.log(`${members.length} membres trouvés`);

    for (const m of members) {
      m.password = 'password123';
      await m.save();
      console.log(`✓ ${m.email} → password123`);
    }

    console.log('Tous les mots de passe ont été réinitialisés.');
    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
})();
