const Membre = require('../models/Membre');
const Task = require('../models/Task');
const News = require('../models/News');
const Event = require('../models/Event');
const Document = require('../models/Document');
const Entretien = require('../models/Entretien');
const Publication = require('../models/Publication');

const now = () => new Date();
const startOfMonth = () => new Date(now().getFullYear(), now().getMonth(), 1);
const startOfYear = () => new Date(now().getFullYear(), 0, 1);

// Aggregates monthly counts for a collection over the last 12 months
const monthlyAggregation = async (Model, dateField = 'createdAt', match = {}) => {
  const twelveMonthsAgo = new Date(now().getFullYear(), now().getMonth() - 11, 1);
  const pipeline = [
    { $match: { ...match, [dateField]: { $gte: twelveMonthsAgo } } },
    { $group: {
        _id: { year: { $year: '$' + dateField }, month: { $month: '$' + dateField } },
        count: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ];
  const results = await Model.aggregate(pipeline);
  // Fill missing months with 0
  const filled = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now().getFullYear(), now().getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const found = results.find(r => r._id.year === y && r._id.month === m);
    filled.push({ year: y, month: m, count: found ? found.count : 0 });
  }
  return filled;
};

exports.getPresidentDashboard = async (req, res) => {
  try {
    const [totalMembres, nouveauxMois, actifs, etudiants, professionnels,
      totalTasks, tasksEnCours, tasksTerminees, totalEvents, eventsAMois,
      totalNews, newsPubliees, entretiensEnAttente, documents,
      entretiensProgrammes, entretiensRealises, totalActions,
      publicationsMedia] = await Promise.all([
      Membre.countDocuments(),
      Membre.countDocuments({ createdAt: { $gte: startOfMonth() } }),
      Membre.countDocuments({ status: 'actif' }),
      Membre.countDocuments({ situationProfessionnelle: 'Étudiant', status: 'actif' }),
      Membre.countDocuments({ situationProfessionnelle: 'Professionnel', status: 'actif' }),
      Task.countDocuments(),
      Task.countDocuments({ statut: { $in: ['en-cours', 'assignée'] } }),
      Task.countDocuments({ statut: 'terminée' }),
      Event.countDocuments(),
      Event.countDocuments({ date: { $gte: startOfMonth() } }),
      News.countDocuments(),
      News.countDocuments({ status: 'publiée' }),
      Entretien.countDocuments({ status: 'en-attente' }),
      Document.countDocuments(),
      Entretien.countDocuments({ status: 'approuvé' }),
      Entretien.countDocuments({ status: 'réalisé' }),
      Event.countDocuments({ type: 'Action' }),
      Publication.countDocuments()
    ]);

    const [
      inscriptionEvolution,
      entretienEvolution,
      membreRepartition,
      statistiquesMensuelles
    ] = await Promise.all([
      monthlyAggregation(Membre),
      monthlyAggregation(Entretien),
      Membre.aggregate([
        { $group: { _id: '$situationProfessionnelle', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      (async () => {
        const eventsByMonth = await monthlyAggregation(Event);
        const tasksByMonth = await monthlyAggregation(Task);
        const interviewsByMonth = await monthlyAggregation(Entretien);
        const membersByMonth = await monthlyAggregation(Membre);
        return eventsByMonth.map((e, i) => ({
          month: e.month,
          year: e.year,
          events: e.count,
          tasks: tasksByMonth[i]?.count || 0,
          interviews: interviewsByMonth[i]?.count || 0,
          members: membersByMonth[i]?.count || 0
        }));
      })()
    ]);

    const [upcomingEvents, recentTasks, newMembers, recentActivities] = await Promise.all([
      Event.find({ date: { $gte: now() }, status: { $ne: 'annulée' } })
        .sort({ date: 1 }).limit(5).populate('createdBy', 'nom prenom'),
      Task.find().sort({ createdAt: -1 }).limit(10)
        .populate('membre', 'nom prenom').populate('createdBy', 'nom prenom'),
      Membre.find({ status: 'en-attente' })
        .sort({ createdAt: -1 }).limit(10).select('nom prenom email createdAt'),
      (async () => {
        const LIMIT = 15;
        const [recentMembres, recentEntretiens, recentEvents, recentTasksFeed, recentPublications] = await Promise.all([
          Membre.find().sort({ createdAt: -1 }).limit(LIMIT).select('nom prenom status createdAt').lean(),
          Entretien.find().sort({ createdAt: -1 }).limit(LIMIT).populate('membre', 'nom prenom').lean(),
          Event.find().sort({ createdAt: -1 }).limit(LIMIT).select('titre type date createdAt createdBy').populate('createdBy', 'nom prenom').lean(),
          Task.find().sort({ createdAt: -1 }).limit(LIMIT).select('titre statut createdAt createdBy').populate('membre', 'nom prenom').lean(),
          Publication.find().sort({ createdAt: -1 }).limit(LIMIT).select('titre type status createdAt createdBy').populate('createdBy', 'nom prenom').lean()
        ]);
        const activities = [];
        recentMembres.forEach(m => activities.push({ type: 'membre', action: 'inscrit', date: m.createdAt, data: m }));
        recentEntretiens.forEach(e => activities.push({ type: 'entretien', action: e.status, date: e.createdAt, data: e }));
        recentEvents.forEach(e => activities.push({ type: 'evenement', action: 'créé', date: e.createdAt, data: e }));
        recentTasksFeed.forEach(t => activities.push({ type: 'tache', action: 'créée', date: t.createdAt, data: t }));
        recentPublications.forEach(p => activities.push({ type: 'publication', action: 'créée', date: p.createdAt, data: p }));
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        return activities.slice(0, 20);
      })()
    ]);

    res.json({
      success: true,
      data: {
        stats: { totalMembres, nouveauxMois, actifs, etudiants, professionnels,
          totalTasks, tasksEnCours, tasksTerminees, totalEvents, eventsAMois,
          totalNews, newsPubliees, entretiensEnAttente, documents,
          entretiensProgrammes, entretiensRealises, totalActions, publicationsMedia },
        upcomingEvents, recentTasks, newMembers,
        chartData: { inscriptionEvolution, entretienEvolution, membreRepartition, statistiquesMensuelles },
        recentActivities
      }
    });
  } catch (error) {
    console.error('❌ Erreur dashboard président:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getSGDashboard = async (req, res) => {
  try {
    const now = new Date();
    const [documents, documentsPV, documentsRapports, documentsODJ,
      entretiens, entretiensApprouves, events, eventsAGP] = await Promise.all([
      Document.countDocuments(),
      Document.countDocuments({ type: 'PV' }),
      Document.countDocuments({ type: 'Rapport' }),
      Document.countDocuments({ type: 'Ordre du jour' }),
      Entretien.countDocuments(),
      Entretien.countDocuments({ status: 'approuvé' }),
      Event.countDocuments(),
      Event.countDocuments({ type: 'AGP' })
    ]);
    const recentDocuments = await Document.find().sort({ createdAt: -1 }).limit(10)
      .populate('createdBy', 'nom prenom');
    const upcomingEntretiens = await Entretien.find({ date: { $gte: now }, status: 'approuvé' })
      .sort({ date: 1 }).limit(5).populate('membre', 'nom prenom').populate('createdBy', 'nom prenom');
    res.json({
      success: true,
      data: { stats: { documents, documentsPV, documentsRapports, documentsODJ,
        entretiens, entretiensApprouves, events, eventsAGP },
        recentDocuments, upcomingEntretiens }
    });
  } catch (error) {
    console.error('❌ Erreur dashboard SG:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getMediaDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalPublications, publicationsMois, publicationsEnAttente, publicationsPubliees,
      totalNews, newsMois, tasksMedia, tasksMediaEnCours] = await Promise.all([
      Publication.countDocuments(),
      Publication.countDocuments({ date: { $gte: startOfMonth } }),
      Publication.countDocuments({ status: 'en-attente' }),
      Publication.countDocuments({ status: 'publiée' }),
      News.countDocuments(),
      News.countDocuments({ date: { $gte: startOfMonth } }),
      Task.countDocuments({ type: 'Task Media' }),
      Task.countDocuments({ type: 'Task Media', statut: { $in: ['en-cours', 'assignée'] } })
    ]);
    const recentPublications = await Publication.find().sort({ createdAt: -1 }).limit(10)
      .populate('createdBy', 'nom prenom');
    const pendingNews = await News.find({ status: 'brouillon' }).sort({ createdAt: -1 }).limit(5)
      .populate('createdBy', 'nom prenom');
    res.json({
      success: true,
      data: { stats: { totalPublications, publicationsMois, publicationsEnAttente, publicationsPubliees,
        totalNews, newsMois, tasksMedia, tasksMediaEnCours },
        recentPublications, pendingNews }
    });
  } catch (error) {
    console.error('❌ Erreur dashboard media:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const [totalMembres, actifs, enAttente, suspendus, bannis, nonValides,
      etudiants, professionnels, nouveauxMois] = await Promise.all([
      Membre.countDocuments(),
      Membre.countDocuments({ status: 'actif' }),
      Membre.countDocuments({ status: 'en-attente' }),
      Membre.countDocuments({ status: 'suspendu' }),
      Membre.countDocuments({ status: 'banni' }),
      Membre.countDocuments({ status: 'non-validé' }),
      Membre.countDocuments({ situationProfessionnelle: 'Étudiant' }),
      Membre.countDocuments({ situationProfessionnelle: 'Professionnel' }),
      Membre.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      })
    ]);
    const statsParRole = await Membre.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const recentMembres = await Membre.find()
      .sort({ createdAt: -1 }).limit(10)
      .select('nom prenom email role status createdAt photo');
    res.json({
      success: true,
      data: {
        stats: { totalMembres, actifs, enAttente, suspendus, bannis, nonValides,
          etudiants, professionnels, nouveauxMois, parRole: statsParRole },
        recentMembres
      }
    });
  } catch (error) {
    console.error('❌ Erreur dashboard admin:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getMembreDashboard = async (req, res) => {
  try {
    const userId = req.userId;
    const [tasks, tasksEnCours, tasksTerminees,
      news, events, entretiens] = await Promise.all([
      Task.find({ membre: userId }).countDocuments(),
      Task.find({ membre: userId, statut: { $in: ['en-cours', 'assignée'] } }).countDocuments(),
      Task.find({ membre: userId, statut: 'terminée' }).countDocuments(),
      News.find({ status: 'publiée' }).sort({ createdAt: -1 }).limit(5),
      Event.find({ date: { $gte: new Date() }, status: { $ne: 'annulée' } }).sort({ date: 1 }).limit(5),
      Entretien.find({ membre: userId }).sort({ date: -1 }).limit(5)
    ]);
    const myTasks = await Task.find({ membre: userId }).sort({ deadline: 1 }).limit(10)
      .populate('createdBy', 'nom prenom');
    res.json({
      success: true,
      data: { stats: { tasks, tasksEnCours, tasksTerminees },
        myTasks, recentNews: news, upcomingEvents: events, mesEntretiens: entretiens }
    });
  } catch (error) {
    console.error('❌ Erreur dashboard membre:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};