const axios = require('axios');
const Publication = require('../models/Publication');
const SocialProfile = require('../models/SocialProfile');

const FACEBOOK_API = 'https://graph.facebook.com/v22.0';

exports.getProfiles = async (req, res) => {
  try {
    const { getProfiles } = require('../services/socialProfileService');
    const data = await getProfiles();
    res.json({ success: true, data, updatedAt: new Date() });
  } catch (e) {
    console.warn('⚠️ Profiles error:', e.message);
    res.status(500).json({ success: false, message: 'Erreur chargement profils' });
  }
};

exports.getFeed = async (req, res) => {
  const posts = [];

  const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const fbPageId = process.env.FACEBOOK_PAGE_ID;
  if (fbToken && fbPageId) {
    try {
      const { data } = await axios.get(`${FACEBOOK_API}/${fbPageId}/posts`, {
        params: { access_token: fbToken, fields: 'message,created_time,full_picture,permalink_url', limit: 10 },
      });
      (data.data || []).forEach((p) => posts.push({
        platform: 'facebook', id: p.id, message: p.message || '', image: p.full_picture || null,
        url: p.permalink_url, date: p.created_time,
      }));
    } catch (e) { console.warn('⚠️ FB error:', e.message); }
  }

  try {
    const igPosts = await Publication.find({ socialMedia: 'Instagram', status: { $in: ['publiée', 'créée'] } })
      .sort({ date: -1 }).limit(8).lean();
    igPosts.forEach((p) => posts.push({
      platform: 'instagram', id: p._id.toString(),
      message: p.caption || p.titre || '',
      image: p.fichier || null,
      url: `https://www.instagram.com/...`, date: p.date || p.createdAt,
    }));
  } catch (e) { console.warn('⚠️ IG DB error:', e.message); }

  try {
    const liPosts = await Publication.find({ socialMedia: 'LinkedIn', status: { $in: ['publiée', 'créée'] } })
      .sort({ date: -1 }).limit(8).lean();
    liPosts.forEach((p) => posts.push({
      platform: 'linkedin', id: p._id.toString(),
      message: p.caption || p.titre || '',
      image: p.fichier || null,
      url: `https://www.linkedin.com/...`, date: p.date || p.createdAt,
    }));
  } catch (e) { console.warn('⚠️ LI DB error:', e.message); }

  posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  res.json({ success: true, data: posts });
};

exports.getOverrides = async (req, res) => {
  try {
    const overrides = await SocialProfile.find().lean();
    const map = {};
    overrides.forEach(o => { map[o.platform] = o; });
    res.json({ success: true, data: map });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateOverrides = async (req, res) => {
  try {
    const { platform, followers, follows, mediaCount } = req.body;
    if (!['instagram', 'linkedin'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Plateforme invalide' });
    }
    const update = {};
    if (followers !== undefined) update.followers = followers;
    if (follows !== undefined) update.follows = follows;
    if (mediaCount !== undefined) update.mediaCount = mediaCount;
    const doc = await SocialProfile.findOneAndUpdate(
      { platform },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
