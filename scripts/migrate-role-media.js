// scripts/migrate-role-media.js
// Renomme le rôle ResponsableMedia → ConseillerMedia dans la base de données

const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const Membre = require('../src/models/Membre');
    const Role = require('../src/models/Role');

    // 1. Renommer dans la collection roles
    const roleResult = await Role.updateOne(
      { name: 'ResponsableMedia' },
      { $set: { name: 'ConseillerMedia' } }
    );
    if (roleResult.modifiedCount > 0) {
      console.log('✅ Rôle "ResponsableMedia" → "ConseillerMedia" dans la collection roles');
    } else {
      // Créer le nouveau rôle s'il n'existe pas
      const existing = await Role.findOne({ name: 'ConseillerMedia' });
      if (!existing) {
        await Role.create({ name: 'ConseillerMedia' });
        console.log('✅ Rôle "ConseillerMedia" créé dans la collection roles');
      } else {
        console.log('ℹ️ Rôle "ConseillerMedia" existe déjà');
      }
    }

    // 2. Mettre à jour les membres
    const memberResult = await Membre.updateMany(
      { role: 'ResponsableMedia' },
      { $set: { role: 'ConseillerMedia' } }
    );
    console.log(`✅ ${memberResult.modifiedCount} membre(s) mis à jour : ResponsableMedia → ConseillerMedia`);

    // 3. Vérifier qu'il ne reste plus d'occurrences
    const remaining = await Membre.countDocuments({ role: 'ResponsableMedia' });
    if (remaining > 0) {
      console.warn(`⚠️ ${remaining} membre(s) ont encore le rôle ResponsableMedia`);
    } else {
      console.log('✅ Aucun membre restant avec le rôle ResponsableMedia');
    }

    await mongoose.connection.close();
    console.log('🔒 Connexion fermée');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

migrate();
