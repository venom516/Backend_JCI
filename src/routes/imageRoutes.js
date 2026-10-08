const express = require('express');
const router = express.Router();
const axios = require('axios');

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
  }
});

module.exports = router;