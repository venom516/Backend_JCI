// backend/seed.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
require('dotenv').config();

// ✅ Ajouter les serveurs DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const seed = async () => {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const Membre = require('./src/models/Membre');
    const Task = require('./src/models/Task');

    // Supprimer les anciennes données
    await Membre.deleteMany({});
    await Task.deleteMany({});
    console.log('🗑️ Anciennes données supprimées');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // ============================================================
    // 1. CRÉER LES MEMBRES
    // ============================================================
    console.log('\n📝 Création des membres...');

    // 1. Président
    const president = await Membre.create({
      nom: 'Admin',
      prenom: 'President',
      email: 'president@jci.tn',
      password: hashedPassword,
      role: 'President',
      status: 'actif',
      isEmailVerified: true,
      situationProfessionnelle: 'Professionnel'
    });
    console.log('✅ Président créé');

    // 2. Secrétaire Général
    const sg = await Membre.create({
      nom: 'Admin',
      prenom: 'SG',
      email: 'sg@jci.tn',
      password: hashedPassword,
      role: 'SecretaireGeneral',
      status: 'actif',
      isEmailVerified: true,
      situationProfessionnelle: 'Professionnel'
    });
    console.log('✅ Secrétaire Général créé');

    // 3a. Admin
    const admin = await Membre.create({
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@jci.tn',
      password: hashedPassword,
      role: 'Admin',
      status: 'actif',
      isEmailVerified: true,
      situationProfessionnelle: 'Professionnel'
    });
    console.log('✅ Admin créé');

    // 3b. Responsable Média
    const media = await Membre.create({
      nom: 'Admin',
      prenom: 'Media',
      email: 'media@jci.tn',
      password: hashedPassword,
      role: 'ConseillerMedia',
      status: 'actif',
      isEmailVerified: true,
      situationProfessionnelle: 'Professionnel'
    });
    console.log('✅ Conseiller Media créé');

    // 4. Membres
    const membre1 = await Membre.create({
      nom: 'User',
      prenom: 'Membre1',
      email: 'membre1@jci.tn',
      password: hashedPassword,
      role: 'Membre',
      status: 'actif',
      isEmailVerified: true,
      situationProfessionnelle: 'Étudiant'
    });
    console.log('✅ Membre 1 créé');

    const membre2 = await Membre.create({
      nom: 'User',
      prenom: 'Membre2',
      email: 'membre2@jci.tn',
      password: hashedPassword,
      role: 'Membre',
      status: 'actif',
      isEmailVerified: true,
      situationProfessionnelle: 'Professionnel'
    });
    console.log('✅ Membre 2 créé');

    // ============================================================
    // 2. CRÉER DES TÂCHES DE TEST
    // ============================================================
    console.log('\n📋 Création des tâches de test...');

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in2Days = new Date(now);
    in2Days.setDate(in2Days.getDate() + 2);
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const in5Days = new Date(now);
    in5Days.setDate(in5Days.getDate() + 5);

    // Tâches Media
    const tasks = [
      {
        titre: "🎬 Vidéo de présentation JCI",
        description: "Créer une vidéo de présentation de l'association pour les réseaux sociaux",
        deadline: tomorrow,
        membre: membre1._id,
        type: "Task Media",
        priority: "haute",
        createdBy: president._id,
        statut: "assignée",
        location: "Studio Media"
      },
      {
        titre: "📸 Couverture événement",
        description: "Prendre des photos et vidéos lors du prochain événement",
        deadline: in2Days,
        membre: membre2._id,
        type: "Task Media",
        priority: "moyenne",
        createdBy: media._id,
        statut: "en-cours",
        location: "Salle des fêtes"
      },
      {
        titre: "🎨 Design flyer événement",
        description: "Créer le design du flyer pour l'événement du mois",
        deadline: in3Days,
        membre: membre1._id,
        type: "Task Media",
        priority: "haute",
        createdBy: media._id,
        statut: "créée"
      },
      {
        titre: "📱 Publication Instagram",
        description: "Préparer et publier le contenu Instagram de la semaine",
        deadline: in5Days,
        membre: membre2._id,
        type: "Task Media",
        priority: "basse",
        createdBy: media._id,
        statut: "assignée"
      }
    ];

    await Task.insertMany(tasks);
    console.log(`✅ ${tasks.length} tâches média créées`);

    // Tâches Normales
    const normalTasks = [
      {
        titre: "📋 Rapport mensuel",
        description: "Préparer le rapport d'activité du mois",
        deadline: in3Days,
        membre: membre1._id,
        type: "Task Normale",
        priority: "moyenne",
        createdBy: president._id,
        statut: "assignée"
      },
      {
        titre: "📅 Planification réunion",
        description: "Organiser la réunion du comité directeur",
        deadline: in2Days,
        membre: membre2._id,
        type: "Task Normale",
        priority: "haute",
        createdBy: sg._id,
        statut: "en-cours"
      },
      {
        titre: "📊 Budget projet",
        description: "Préparer le budget pour le projet communautaire",
        deadline: in5Days,
        membre: membre1._id,
        type: "Task Normale",
        priority: "moyenne",
        createdBy: president._id,
        statut: "créée"
      }
    ];

    await Task.insertMany(normalTasks);
    console.log(`✅ ${normalTasks.length} tâches normales créées`);

    // ============================================================
    // 3. RÉCAPITULATIF
    // ============================================================
    console.log('\n📋 RÉCAPITULATIF DES COMPTES:');
    console.log('   👑 President: president@jci.tn / password123');
    console.log('   📋 SG: sg@jci.tn / password123');
    console.log('   📢 Media: media@jci.tn / password123');
    console.log('   🔧 Admin: admin@jci.tn / password123');
    console.log('   👤 Membre1: membre1@jci.tn / password123');
    console.log('   👤 Membre2: membre2@jci.tn / password123');

    console.log('\n📊 STATISTIQUES:');
    const totalMembers = await Membre.countDocuments();
    const totalTasks = await Task.countDocuments();
    const mediaTasks = await Task.countDocuments({ type: 'Task Media' });
    const normalTasksCount = await Task.countDocuments({ type: 'Task Normale' });

    console.log(`   👥 Membres: ${totalMembers}`);
    console.log(`   📋 Tâches totales: ${totalTasks}`);
    console.log(`   🎬 Tâches Media: ${mediaTasks}`);
    console.log(`   📄 Tâches Normales: ${normalTasksCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Seed terminé avec succès ! 🚀');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('📚 Stack:', error.stack);
    process.exit(1);
  }
};

seed();