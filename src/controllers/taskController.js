// backend/src/controllers/taskController.js

const Task = require('../models/Task');
const Membre = require('../models/Membre');
const { sendTaskAssignmentEmail } = require('../config/email');

// ============================================================
// 1. CRÉER UNE TÂCHE (Tâche Normale)
// ============================================================
exports.createTask = async (req, res) => {
  try {
    const { titre, description, deadline, membre, taskType, priority } = req.body;

    if (!titre || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Titre et deadline sont obligatoires'
      });
    }

    let membreAssigne = null;
    if (membre) {
      membreAssigne = await Membre.findById(membre);
      if (!membreAssigne) {
        return res.status(404).json({
          success: false,
          message: 'Membre assigné non trouvé'
        });
      }
    }

    const taskTypeValue = taskType === 'media' ? 'media' : 'normal';

    const task = await Task.create({
      titre,
      description: description || '',
      deadline,
      membre: membre || null,
      taskType: taskTypeValue,
      type: taskTypeValue === 'media' ? 'Task Media' : 'Task Normale',
      priority: priority || 'moyenne',
      createdBy: req.userId,
      statut: membre ? 'assignée' : 'créée'
    });

    if (membreAssigne && membreAssigne.email) {
      try {
        await sendTaskAssignmentEmail(membreAssigne.email, membreAssigne, task);
        console.log(`📧 Email d'assignation envoyé à ${membreAssigne.email}`);
      } catch (emailErr) {
        console.error(`❌ Erreur envoi email à ${membreAssigne.email}:`, emailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: '✅ Tâche créée avec succès',
      data: task
    });
  } catch (error) {
    console.error('❌ Erreur createTask:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// 2. GET ALL TASKS
// ============================================================
exports.getTasks = async (req, res) => {
  try {
    const { statut, type, membre, search, taskType, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.userRole === 'Membre') {
      filter.$or = [
        { membre: req.userId },
        { createdBy: req.userId }
      ];
    }

    if (statut) filter.statut = statut;
    if (type) filter.type = type;
    if (taskType) filter.taskType = taskType;
    if (membre) filter.membre = membre;
    if (search) {
      filter.titre = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('membre', 'nom prenom email')
        .populate('createdBy', 'nom prenom email')
        .populate('comments.author', 'nom prenom')
        .sort({ createdAt: -1, deadline: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Task.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: tasks
    });
  } catch (error) {
    console.error('❌ Erreur getTasks:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 3. GET TASK BY ID
// ============================================================
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('membre', 'nom prenom email')
      .populate('createdBy', 'nom prenom email')
      .populate('comments.author', 'nom prenom');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('❌ Erreur getTaskById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 4. UPDATE TASK
// ============================================================
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    const canEdit = req.userRole === 'President'
      || req.userRole === 'VPFD'
      || task.createdBy.toString() === req.userId;
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier cette tâche'
      });
    }

    if (req.body.statut === 'assignée' && req.body.membre) {
      const membreExists = await Membre.findById(req.body.membre);
      if (!membreExists) {
        return res.status(404).json({
          success: false,
          message: 'Membre assigné non trouvé'
        });
      }
    }

    const updateData = { ...req.body };
    delete updateData.taskType;
    delete updateData.type;

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('membre', 'nom prenom email')
     .populate('createdBy', 'nom prenom email');

    res.json({
      success: true,
      message: 'Tâche mise à jour avec succès',
      data: updatedTask
    });
  } catch (error) {
    console.error('❌ Erreur updateTask:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 5. DELETE TASK
// ============================================================
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    if (task.createdBy.toString() !== req.userId && req.userRole !== 'President' && req.userRole !== 'VPFD') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à supprimer cette tâche'
      });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: 'Tâche supprimée avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur deleteTask:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 6. ADD COMMENT
// ============================================================
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du commentaire est obligatoire'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    task.comments.push({
      author: req.userId,
      content
    });

    await task.save();

    const updatedTask = await Task.findById(req.params.id)
      .populate('membre', 'nom prenom email')
      .populate('createdBy', 'nom prenom email')
      .populate('comments.author', 'nom prenom');

    res.json({
      success: true,
      message: 'Commentaire ajouté avec succès',
      data: updatedTask
    });
  } catch (error) {
    console.error('❌ Erreur addComment:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============================================================
// 7. CRÉER UNE TÂCHE MÉDIA
// ============================================================
exports.createTaskMedia = async (req, res) => {
  try {
    const { titre, description, deadline, membre, priority } = req.body;

    if (!titre || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Titre et deadline sont obligatoires'
      });
    }

    let membreAssigne = null;
    if (membre) {
      membreAssigne = await Membre.findById(membre);
      if (!membreAssigne) {
        return res.status(404).json({
          success: false,
          message: 'Membre assigné non trouvé'
        });
      }
    }

    const task = await Task.create({
      titre,
      description: description || '',
      deadline,
      membre: membre || null,
      taskType: 'media',
      type: 'Task Media',
      priority: priority || 'moyenne',
      createdBy: req.userId,
      statut: membre ? 'assignée' : 'créée'
    });

    if (membreAssigne && membreAssigne.email) {
      try {
        await sendTaskAssignmentEmail(membreAssigne.email, membreAssigne, task);
        console.log(`📧 Email d'assignation envoyé à ${membreAssigne.email}`);
      } catch (emailErr) {
        console.error(`❌ Erreur envoi email à ${membreAssigne.email}:`, emailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: '✅ Tâche média créée avec succès',
      data: task
    });
  } catch (error) {
    console.error('❌ Erreur createTaskMedia:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// ============================================================
// 8. GET CALENDAR TASKS - CORRIGÉ
// ============================================================
exports.getCalendarTasks = async (req, res) => {
  try {
    console.log('📅 getCalendarTasks appelé');
    
    const { start, end, type, taskType, membre } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (taskType) filter.taskType = taskType;
    if (membre) filter.membre = membre;

    if (start && end) {
      try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          filter.deadline = { $gte: startDate, $lte: endDate };
        }
      } catch (err) {
        console.warn('⚠️ Format de date invalide:', err.message);
      }
    }

    if (req.userRole === 'Membre') {
      filter.$or = [
        { membre: req.userId },
        { createdBy: req.userId }
      ];
    }

    const tasks = await Task.find(filter)
      .populate('membre', 'nom prenom email')
      .populate('createdBy', 'nom prenom email')
      .sort({ deadline: 1 });

    // ✅ TOUJOURS renvoyer un tableau, même vide
    const events = tasks.map(task => ({
      id: task._id,
      title: task.titre || 'Sans titre',
      start: task.deadline || new Date(),
      end: task.deadline || new Date(),
      allDay: false,
      color: task.type === 'Task Media' ? '#8B5CF6' : '#4F46E5',
      extendedProps: {
        type: task.type || 'Task Normale',
        statut: task.statut || 'créée',
        priority: task.priority || 'moyenne',
        description: task.description || '',
        membre: task.membre ? `${task.membre.prenom} ${task.membre.nom}` : 'Non assigné'
      }
    }));

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: events
    });

  } catch (error) {
    console.error('❌ Erreur getCalendarTasks:', error);
    // ✅ TOUJOURS renvoyer une réponse même en cas d'erreur
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
      message: 'Erreur lors du chargement, mais données vides retournées'
    });
  }
};

// ============================================================
// 9. GET MEDIA CALENDAR - CORRIGÉ
// ============================================================
exports.getMediaCalendar = async (req, res) => {
  try {
    console.log('📅 getMediaCalendar appelé');

    const { start, end } = req.query;
    const filter = { type: 'Task Media', taskType: 'media' };

    if (req.userRole === 'Membre') {
      filter.$or = [
        { membre: req.userId },
        { createdBy: req.userId }
      ];
    }

    if (start && end) {
      try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          filter.deadline = { $gte: startDate, $lte: endDate };
        }
      } catch (err) {
        console.warn('⚠️ Format de date invalide:', err.message);
      }
    }

    const tasks = await Task.find(filter)
      .populate('membre', 'nom prenom email')
      .populate('createdBy', 'nom prenom email')
      .sort({ deadline: 1 });

    // ✅ TOUJOURS renvoyer un tableau, même vide
    const events = tasks.map(task => ({
      id: task._id,
      title: task.titre || 'Sans titre',
      start: task.deadline || new Date(),
      end: task.deadline || new Date(),
      allDay: false,
      color: '#8B5CF6',
      extendedProps: {
        type: task.type || 'Task Media',
        statut: task.statut || 'créée',
        priority: task.priority || 'moyenne',
        description: task.description || '',
        membre: task.membre ? `${task.membre.prenom} ${task.membre.nom}` : 'Non assigné'
      }
    }));

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: events
    });

  } catch (error) {
    console.error('❌ Erreur getMediaCalendar:', error);
    // ✅ TOUJOURS renvoyer une réponse même en cas d'erreur
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
      message: 'Erreur lors du chargement, mais données vides retournées'
    });
  }
};

// ============================================================
// 10. NOTIFIER UNE TÂCHE MÉDIA
// ============================================================
exports.getTaskCount = async (req, res) => {
  try {
    const count = await Task.countDocuments();
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('❌ Erreur getTaskCount:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.notifyMediaTasks = async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id).populate('membre', 'nom prenom email');
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    if (task.type !== 'Task Media') {
      return res.status(400).json({
        success: false,
        message: 'Cette tâche n\'est pas une tâche média'
      });
    }

    if (!task.membre) {
      return res.status(400).json({
        success: false,
        message: 'Aucun membre assigné à cette tâche'
      });
    }

    const { sendTaskReminderEmail } = require('../config/email');
    await sendTaskReminderEmail(task.membre.email, task.membre, task);
    
    task.notificationSent = true;
    task.notificationDate = new Date();
    await task.save();

    res.json({
      success: true,
      message: `✅ Notification envoyée avec succès à ${task.membre.email}`
    });
  } catch (error) {
    console.error('❌ Erreur notifyMediaTasks:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};