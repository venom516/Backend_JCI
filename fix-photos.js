const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const MONGO_URI = process.env.MONGODB_URI;

async function fixPhotos() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connecté à MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('membres');

    const membres = await collection.find({
      photo: { $regex: /&#x2F;|&amp;|&lt;|&gt;|&quot;/ }
    }).toArray();

    console.log(`📸 Membres avec photos corrompues: ${membres.length}`);

    let fixed = 0;
    for (const m of membres) {
      const originalPhoto = m.photo;
      const fixedPhoto = originalPhoto
        .replace(/&#x2F;/g, '/')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');

      if (fixedPhoto !== originalPhoto) {
        await collection.updateOne(
          { _id: m._id },
          { $set: { photo: fixedPhoto } }
        );
        fixed++;
        console.log(`  ✅ ${m.prenom} ${m.nom}: ${originalPhoto.substring(0, 40)}... → ${fixedPhoto.substring(0, 40)}...`);
      }
    }

    console.log(`\n✅ ${fixed}/${membres.length} photos corrigées`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixPhotos();
