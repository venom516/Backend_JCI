// backend/src/services/reminderService.js

const cron = require('node-cron');
const Task = require('../models/Task');
const { sendAutoTaskReminderEmail } = require('../config/email');

// ============================================================
// ENVOYER LES RAPPELS AUTOMATIQUES
// ============================================================
const sendAutoReminders = async () => {
  try {
    console.log('🔔 Vérification des tâches média à rappeler...');
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const tasks = await Task.find({
      type: 'Task Media',
      statut: { $in: ['assignée', 'en-cours', 'créée'] },
      deadline: { $gte: tomorrow, $lt: dayAfter },
      notificationSent: { $ne: true }
    }).populate('membre', 'nom prenom email');

    console.log(`📋 ${tasks.length} tâches média trouvées pour rappel`);

    let sentCount = 0;
    let skippedCount = 0;
    for (const task of tasks) {
      if (task.membre && task.membre.email) {
        // 6.4 : ne marquer que si l'envoi a reellement reussi. Un template
        // suspendu renvoie null et un envoi echoue renvoie false ; marquer
        // inconditionnellement consommerait le rappel J-1 sans rien envoyer,
        // et le filtre notificationSent l'empecherait d'etre retente.
        const envoye = await sendAutoTaskReminderEmail(task.membre.email, task.membre, task);

        if (envoye === true) {
          task.notificationSent = true;
          task.notificationDate = new Date();
          await task.save();
          sentCount++;
          console.log(`📧 Rappel automatique envoyé à ${task.membre.email} pour: ${task.titre}`);
        } else {
          skippedCount++;
          console.log(`⏸️ Rappel conservé (non envoyé) pour: ${task.titre}`);
        }
      }
    }

    console.log(`✅ ${sentCount} rappels envoyés, ${skippedCount} conservés pour réessai`);
    return { success: true, sent: sentCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ Erreur sendAutoReminders:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================
// DÉMARRER LE SERVICE DE RAPPEL
// ============================================================
const startReminderService = () => {
  console.log('🔄 Initialisation du service de rappel automatique...');
  
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ [08:00] Exécution du rappel automatique...');
    await sendAutoReminders();
  });

  cron.schedule('0 14 * * *', async () => {
    console.log('⏰ [14:00] Exécution du rappel automatique...');
    await sendAutoReminders();
  });

  console.log('✅ Service de rappel automatique démarré avec succès');
  console.log('📅 Rappels programmés à 8h et 14h');
};

module.exports = { startReminderService, sendAutoReminders };