const express = require('express');
const router = express.Router();
const axios = require('axios');

// Allowlist stricte : un proxy public sans liste de domaines est un SSRF (§1.9.6).
const DOMAINES_AUTORISES = new Set([
  'scontent.xx.fbcdn.net',
  'scontent.cdninstagram.com',
  'res.cloudinary.com',
  'lh3.googleusercontent.com'
]);

const TAILLE_MAX = 5 * 1024 * 1024;

const TYPES_AUTORISES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

router.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: 'Paramètre url manquant' });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ success: false, message: 'URL invalide' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ success: false, message: 'Protocole non supporté' });
  }

  if (!DOMAINES_AUTORISES.has(parsed.hostname)) {
    return res.status(403).json({ success: false, message: 'Domaine non autorisé' });
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      // maxRedirects: 0 sinon l'allowlist est contournable par une redirection
      maxRedirects: 0,
      maxContentLength: TAILLE_MAX,
      maxBodyLength: TAILLE_MAX,
      headers: { 'User-Agent': 'JCI-ImageProxy/1.0' }
    });

    const typeAmont = String(response.headers['content-type'] || '').split(';')[0].trim();
    if (!TYPES_AUTORISES.has(typeAmont)) {
      return res.status(415).json({ success: false, message: 'Type de contenu non autorisé' });
    }

    res.setHeader('Content-Type', typeAmont);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('❌ Erreur proxy image:', error.message);
    res.status(502).json({ success: false, message: 'Image indisponible' });
  }
});

module.exports = router;