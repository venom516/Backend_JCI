const Contact = require('../models/Contact');
const Membre = require('../models/Membre');
const { sendContactNotificationToPresident } = require('../config/email');

exports.submitContact = async (req, res) => {
  try {
    const { nom, email, message } = req.body;

    if (!nom || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Nom, email et message sont obligatoires'
      });
    }

    const contact = await Contact.create({ nom, email, message });

    const president = await Membre.findOne({ role: 'President', status: 'actif' });
    if (president) {
      await sendContactNotificationToPresident(president.email, contact);
    }

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: contact
    });
  } catch (error) {
    console.error('❌ Erreur submitContact:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message'
    });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    console.error('❌ Erreur getContacts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des messages'
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { lu: true },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Message marqué comme lu',
      data: contact
    });
  } catch (error) {
    console.error('❌ Erreur markAsRead:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du message'
    });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Message supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur deleteContact:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du message'
    });
  }
};
