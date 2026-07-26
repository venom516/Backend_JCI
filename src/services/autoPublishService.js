const cron = require('node-cron');
const Publication = require('../models/Publication');
const Task = require('../models/Task');
const { publishPublication: socialPublish } = require('./socialMediaService');

const autoPublish = async () => {
  try {
    console.log('⏰ Vérification des publications programmées...');
    const now = new Date();
    const publications = await Publication.find({
      status: 'en-attente',
      date: { $lte: now },
      socialMedia: { $ne: [] }
    });

    if (publications.length === 0) {
      console.log('📭 Aucune publication à publier');
      return { success: true, published: 0 };
    }

    console.log(`📤 ${publications.length} publication(s) à publier`);
    let published = 0;
    for (const pub of publications) {
      try {
        console.log(`📤 Publication de "${pub.titre}" vers ${pub.socialMedia.join(', ')}`);
        const results = await socialPublish(pub);
        pub.status = 'publiée';
        pub.datePublication = new Date();
        await pub.save();
        if (pub.task) {
          await Task.findByIdAndUpdate(pub.task, { statut: 'terminée' });
        }
        published++;
        console.log(`✅ "${pub.titre}" publiée avec succès`);
      } catch (err) {
        console.error(`❌ Erreur publication "${pub.titre}":`, err.message);
      }
    }

    console.log(`✅ ${published}/${publications.length} publication(s) publiée(s)`);
    return { success: true, published };
  } catch (error) {
    console.error('❌ Erreur autoPublish:', error);
    return { success: false, error: error.message };
  }
};

const startAutoPublishService = () => {
  console.log('🔄 Initialisation du service de publication automatique...');
  cron.schedule('*/15 * * * *', async () => {
    console.log(`⏰ [${new Date().toLocaleTimeString('fr-FR')}] Vérification des publications...`);
    await autoPublish();
  });
  console.log('✅ Service de publication automatique démarré');
  console.log('📅 Vérification toutes les 15 minutes');
};

module.exports = { startAutoPublishService, autoPublish };