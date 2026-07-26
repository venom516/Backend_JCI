// backend/seed-membres.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
require('dotenv').config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const membresData = [
  { nom: "Abdelmoulah", prenom: "Hatem", telephone: "22222445", email: "hatem.abdelmoula@laposte.net", dateNaiss: "2000-02-26", titre: "sénateur", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "YENGUI", prenom: "MOHAMED ALI", telephone: "22991609", email: "yengui.mohamedali@gmail.com", dateNaiss: "2000-01-01", titre: "sénateur", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "FRIKHA", prenom: "AKREM", telephone: "24060796", email: "frikha.akrem@gmail.com", dateNaiss: "2000-07-06", titre: "Past", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "TLIJENI", prenom: "NADA", telephone: "99890360", email: "nadatlijen7@gmail.com", dateNaiss: "1999-08-02", titre: "Past", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "ghorbel", prenom: "Mohamed", telephone: "58662000", email: "ghorbelmohamed78@gmail.com", dateNaiss: "1994-05-12", titre: "President", situationProfessionnelle: "Professionnel", role: "President" },
  { nom: "TRABELSI", prenom: "CHAYMA", telephone: "99680458", email: "chaimajci@gmail.com", dateNaiss: "2000-11-18", titre: "Titulaire", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "BENZINA", prenom: "MARYAM", telephone: "21363905", email: "Maryambenzina3@gmail.com", dateNaiss: "2000-08-22", titre: "past presidente immediate", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "Abid", prenom: "Mohamed Amine", telephone: "97354456", email: "mohamedamineabid4@gmail.com", dateNaiss: "2000-07-11", titre: "VPFD", situationProfessionnelle: "Étudiant", role: "Membre" },
  { nom: "FRIKHA", prenom: "MOHAMED", telephone: "24280395", email: "med.frikha95@gmail.com", dateNaiss: "2000-03-28", titre: "Superviseure", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "BEN CHEHIDA", prenom: "TAHER", telephone: "52503366", email: "taherbenchehida.jci@gmail.com", dateNaiss: "1998-11-22", titre: "conseiller national JVC", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "CHIKH", prenom: "WADII", telephone: "96620900", email: "wadi.chikh.jci@gmail.com", dateNaiss: "1995-05-08", titre: "Conseiller juridique", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "trabelsi", prenom: "Rayen", telephone: "44678080", email: "rayentrabelsi75@gmail.com", dateNaiss: "1999-05-06", titre: "VPPRE", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "Ghorbel", prenom: "Nour", telephone: "44496777", email: "ghorbelnour352@gmail.com", dateNaiss: "2000-06-17", titre: "Directrice exécutive", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "Bilel", prenom: "Abdelmaksoud", telephone: "50846339", email: "bil602u@gmail.com", dateNaiss: "2002-10-16", titre: "Titulaire", situationProfessionnelle: "Étudiant", role: "Membre" },
  { nom: "Zghab", prenom: "Manel", telephone: "53764270", email: "zg.manel@gmail.com", dateNaiss: "2002-03-19", titre: "trésoriere", situationProfessionnelle: "Étudiant", role: "Membre" },
  { nom: "Zekri", prenom: "Hanen", telephone: "27489576", email: "zekrihannen@gmail.com", dateNaiss: "1991-05-02", titre: "Titulaire", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "souissi", prenom: "Emna", telephone: "94604313", email: "emnasouissi987@gmail.com", dateNaiss: "2004-10-15", titre: "SG", situationProfessionnelle: "Étudiant", role: "SecretaireGeneral" },
  { nom: "Achraf", prenom: "Kriaa", telephone: "28896363", email: "kriaa1122@gmail.com", dateNaiss: "1999-05-31", titre: "commissaire aux comptes", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "Eya", prenom: "Jrad", telephone: "56425037", email: "eyajrad14@gmail.com", dateNaiss: "2005-08-19", titre: "Titulaire", situationProfessionnelle: "Étudiant", role: "Membre" },
  { nom: "brahim", prenom: "Mzid", telephone: "23899085", email: "brahimmzid@yahoo.fr", dateNaiss: "1987-04-09", titre: "Observateur", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "BOUZIDI", prenom: "Salah", telephone: "51601543", email: "salahbouzidi516@gmail.com", dateNaiss: "2000-02-12", titre: "Observateur", situationProfessionnelle: "Étudiant", role: "Membre" },
  { nom: "CHALBI", prenom: "Ines", telephone: "20313937", email: "ineschalbi93@gmail.com", dateNaiss: "2000-07-02", titre: "Observateur", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "Chaabouni", prenom: "Fahmi", telephone: "26016865", email: "fahmichaabouni@gmail.com", dateNaiss: "2002-11-27", titre: "Observateur", situationProfessionnelle: "Étudiant", role: "Membre" },
  { nom: "Maamri", prenom: "Ines", telephone: "58206185", email: "Ines.maamri.isam@gmail.com", dateNaiss: "1996-06-10", titre: "Observateur", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "kammoun", prenom: "Fares", telephone: "94698299", email: "kammounfares33@gmail.com", dateNaiss: "2001-07-23", titre: "Observateur", situationProfessionnelle: "Étudiant", role: "Membre" },
  { nom: "Belghith", prenom: "Mariem", telephone: "52874081", email: "belghithmariam2@gmail.com", dateNaiss: "2002-09-14", titre: "Observateur", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "Dammak", prenom: "Ilyess", telephone: "29412405", email: "ilyesdammak99@gmail.com", dateNaiss: "1999-04-24", titre: "Observateur", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "Hammami", prenom: "Marwa", telephone: "58250221", email: "Marwa2024h@gmail.com", dateNaiss: "1988-04-01", titre: "Observateur", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "maalej", prenom: "Mohamed nour", telephone: "99777776", email: "Mohamednourmaalej@gmail.com", dateNaiss: "1998-03-02", titre: "Observateur", situationProfessionnelle: "Professionnel", role: "Membre" },
  { nom: "el mabrouk", prenom: "Sirine", telephone: "29951958", email: "elmabroukcyrine@gmail.com", dateNaiss: "2003-02-09", titre: "Observateur", situationProfessionnelle: "Étudiant", role: "Membre" },
  { nom: "Administrateur", prenom: "Admin", telephone: "00000000", email: "admin@jci.tn", dateNaiss: "2024-01-01", titre: "Admin système", situationProfessionnelle: "Professionnel", role: "Admin" },
];

const seed = async () => {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const Membre = require('./src/models/Membre');

    let created = 0;
    let skipped = 0;

    for (const m of membresData) {
      const existant = await Membre.findOne({ email: m.email.toLowerCase() });
      if (existant) {
        console.log(`⏭️  ${m.prenom} ${m.nom} — email déjà existant`);
        skipped++;
        continue;
      }

      await Membre.create({
        nom: m.nom,
        prenom: m.prenom,
        email: m.email.toLowerCase(),
        password: 'password123',
        role: m.role,
        status: 'actif',
        isEmailVerified: true,
        telephone: m.telephone,
        situationProfessionnelle: m.situationProfessionnelle || 'Autre',
        dateNaiss: m.dateNaiss ? new Date(m.dateNaiss) : undefined,
      });

      console.log(`✅ ${m.prenom} ${m.nom} — ${m.role}`);
      created++;
    }

    console.log(`\n📊 RÉSULTAT: ${created} créés, ${skipped} ignorés`);
    console.log(`🔑 Mot de passe par défaut: password123`);

    await mongoose.disconnect();
    console.log('\n✅ Seed terminé !');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

seed();
