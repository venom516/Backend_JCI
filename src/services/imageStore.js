const axios = require('axios');
const cloudinary = require('../config/cloudinary');

const BROWSE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const META_HOSTS = /(^|\.)(facebook\.com|fbcdn\.net|fb\.com|instagram\.com|cdninstagram\.com)$/i;

function buildHeaders(url) {
  const headers = {
    'User-Agent': BROWSE_UA,
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  };
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch (e) {
    return headers;
  }
  // Le Referer Facebook n'est necessaire que pour les hotes qui l'exigent :
  // ailleurs il provoque un 403.
  if (META_HOSTS.test(host)) headers['Referer'] = 'https://www.facebook.com/';
  return headers;
}

async function fetchBufferOnce(url, headers) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxRedirects: 5,
    headers,
  });
  return { buffer: Buffer.from(res.data), contentType: res.headers['content-type'] || '' };
}

async function fetchBuffer(url) {
  const headers = buildHeaders(url);
  try {
    return await fetchBufferOnce(url, headers);
  } catch (e) {
    // Retry sans les headers optionnels : certains hotes les refusent.
    try {
      return await fetchBufferOnce(url, { 'User-Agent': BROWSE_UA, Accept: '*/*' });
    } catch (e2) {
      // Dernier essai : Wikimedia et al. exigent un User-Agent descriptif.
      return await fetchBufferOnce(url, {
        'User-Agent': 'JCI-SidiMansour/1.0 (+https://jci-sidimansour.tn)',
        Accept: '*/*',
      });
    }
  }
}

function extractOgImage(html) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return m ? m[1] : null;
}

// Facebook et Instagram ne renvoient pas og:image sans session : on extrait
// directement les liens CDN des photos presentes dans le HTML de la page.
const CDN_IMG_RE = /https?:\\?\/\\?\/[a-z0-9.-]*(?:fbcdn\.net|cdninstagram\.com)[^"'\\\s)<>]+?\.(?:jpe?g|png|webp)[^"'\\\s)<>]*/gi;

function extractSocialImages(html) {
  const found = (html.match(CDN_IMG_RE) || [])
    .map((u) => u.replace(/\\\//g, '/').replace(/&amp;/g, '&'))
    .filter((u) => !/static\.xx\.fbcdn\.net|rsrc\.php|\.ico($|\?)/i.test(u));
  const uniq = Array.from(new Set(found));
  // _n = version 1080px : on la prefere.
  uniq.sort((a, b) => (b.includes('_n.') ? 1 : 0) - (a.includes('_n.') ? 1 : 0));
  return uniq;
}

// Facebook sert une page differente (sans les liens CDN) quand on demande
// une image : pour extraire la photo il faut reclamer du HTML.
const HTML_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';

async function fetchPageHtml(url) {
  const headers = buildHeaders(url);
  headers.Accept = HTML_ACCEPT;
  try {
    const r = await fetchBufferOnce(url, headers);
    if ((r.contentType || '').startsWith('image/')) return null;
    return r.buffer.toString('utf8');
  } catch (e) {
    try {
      const r = await fetchBufferOnce(url, { 'User-Agent': BROWSE_UA, Accept: HTML_ACCEPT });
      if ((r.contentType || '').startsWith('image/')) return null;
      return r.buffer.toString('utf8');
    } catch (e2) {
      return null;
    }
  }
}

async function fetchImageBytes(url) {
  // 1) L'URL est deja une image
  const first = await fetchBuffer(url);
  const ct = first.contentType || '';
  if (ct.startsWith('image/')) return first.buffer;

  // 2) Page web : og:image puis extraction des liens CDN (Facebook, Instagram)
  const html = await fetchPageHtml(url);
  if (html) {
    const candidates = [];
    const og = extractOgImage(html);
    if (og) candidates.push(og);
    candidates.push(...extractSocialImages(html));

    for (const candidate of candidates) {
      try {
        const img = await fetchBuffer(candidate);
        if ((img.contentType || '').startsWith('image/')) return img.buffer;
      } catch (e) {
        // candidat suivant
      }
    }
  }
  return null;
}

function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'jci-uploads/news', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.on('error', reject);
    stream.end(buffer);
  });
}

async function normalizeImageUrl(url) {
  // Pas d'image fournie : aucune image par defaut n'est injectee.
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (/^default-(news|event)\.jpg$/i.test(u)) return null;
  if (!/^https?:\/\//i.test(u)) return null;
  if (u.includes('res.cloudinary.com')) return u;
  try {
    const result = await cloudinary.uploader.upload(u, {
      folder: 'jci-uploads/news',
      resource_type: 'image',
      secure: true,
    });
    if (result && result.secure_url) return result.secure_url;
  } catch (e) {
    console.warn('normalizeImageUrl remote upload error:', u, e.message);
  }
  try {
    const bytes = await fetchImageBytes(u);
    if (bytes) {
      return await uploadImage(bytes);
    }
  } catch (e) {
    console.warn('normalizeImageUrl fetch+upload error:', u, e.message);
  }
  // Import impossible : on n'enregistre aucune image plutot qu'une image statique.
  return null;
}

module.exports = { normalizeImageUrl };