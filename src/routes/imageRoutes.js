const express = require('express');
const router = express.Router();
const axios = require('axios');

<<<<<<< HEAD
// Proxy d'images externes (fbcdn, etc.) pour contourner le blocage par hotlink/referer
router.get('/proxy', async (req, res) => {
  try {
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

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ success: false, message: 'Protocole non supporté' });
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JCI Sidi Mansour Image Proxy)',
      },
    });

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.warn('⚠️ Image proxy error:', error.message);
    res.status(400).json({ success: false, message: 'Impossible de charger l\'image' });
=======
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
>>>>>>> 4b5b492f7b8393c6cfda56f90a83f9a4cc819419
  }
});

module.exports = router;