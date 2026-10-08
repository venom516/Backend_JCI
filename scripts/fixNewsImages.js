require('dotenv').config();
const mongoose = require('mongoose');
const News = require('../src/models/News');
const { normalizeImageUrl } = require('../src/services/imageStore');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const all = await News.find({});
  console.log(`📰 ${all.length} actualités trouvées`);

  let fixed = 0;
  let failed = 0;

  for (const n of all) {
    const oldImage = n.image || '';
    const isDefault = oldImage === 'default-news.jpg';
    const isCloudinary = oldImage.includes('res.cloudinary.com');
    if (isDefault || isCloudinary || !oldImage.startsWith('http')) continue;

    const newImage = await normalizeImageUrl(oldImage).catch(() => 'default-news.jpg');
    if (newImage !== oldImage) {
      n.image = newImage;
      await n.save();
      fixed++;
      console.log(`✅ ${n._id} (${n.titre || ''})`);
      console.log(`   ${oldImage.slice(0, 90)}`);
      console.log(`   → ${newImage.slice(0, 90)}`);
    } else {
      failed++;
      console.log(`⚠️ Inchangé: ${n._id} (${oldImage.slice(0, 90)})`);
    }
  }

  console.log(`\n🎯 Terminé: ${fixed} corrigée(s), ${failed} inchangée(s)`);
  await mongoose.disconnect();
  process.exit(0);
})();