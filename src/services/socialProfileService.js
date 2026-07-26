const { spawn } = require('child_process');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');
const he = require('he');

const IG_USERNAME = 'jci_sidi_mansour';
const LI_ORG_ID = 'jci-sidi-mansour';

let profilesCache = null;
let profilesCacheTime = 0;
const CACHE_TTL = 10 * 1000; // 10 secondes

const defaults = {
  instagram: {
    username: IG_USERNAME,
    name: 'JCI Sidi Mansour',
    biography: 'Compte officiel Instagram de JCI Sidi Mansour.',
    followers: null,
    follows: null,
    mediaCount: null,
    profilePicture: null,
    url: `https://www.instagram.com/${IG_USERNAME}/`,
    source: 'default',
  },
  linkedin: {
    name: 'JCI Sidi Mansour',
    description: 'Page officielle LinkedIn de JCI Sidi Mansour.',
    followers: null,
    logo: null,
    industry: null,
    coverImage: null,
    url: `https://www.linkedin.com/company/${LI_ORG_ID}/`,
    source: 'default',
  },
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function extractOG(html) {
  let ogTitle = '', ogDesc = '', ogImage = '';
  try {
    const $ = cheerio.load(html);
    ogTitle = he.decode($('meta[property="og:title"]').attr('content') || '');
    ogDesc = he.decode($('meta[property="og:description"]').attr('content') || '');
    ogImage = he.decode($('meta[property="og:image"]').attr('content') || '');
  } catch (e) { /* cheerio may fail on nonstandard HTML */ }
  if (!ogTitle && !ogImage) {
    const titleMatch = html.match(/og:title[^>]+content="([^"]+)"/);
    const descMatch = html.match(/og:description[^>]+content="([^"]+)"/);
    const imgMatch = html.match(/og:image[^>]+content="([^"]+)"/i);
    ogTitle = he.decode(titleMatch ? titleMatch[1] : ogTitle);
    ogDesc = he.decode(descMatch ? descMatch[1] : ogDesc);
    ogImage = imgMatch ? he.decode(imgMatch[1]) : ogImage;
  }
  return { ogTitle, ogDesc, ogImage };
}

async function fetchInstagramProfile(retries = 2) {
  const NM = path.resolve(__dirname, '..', '..', 'node_modules');
const scriptPath = 'C:\\Users\\salah\\AppData\\Local\\Temp\\opencode\\fetchIG.js';

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const jsonStr = await new Promise((resolve, reject) => {
        const child = spawn('node', [scriptPath, IG_USERNAME], {
          cwd: 'C:\\Users\\salah\\AppData\\Local\\Temp',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 20000,
          env: { PATH: process.env.PATH, NODE_PATH: NM },
        });
        let out = '', err = '';
        child.stdout.on('data', d => out += d.toString());
        child.stderr.on('data', d => err += d.toString());
        child.on('close', (code) => {
          if (code === 0 && out) resolve(out.trim());
          else reject(new Error(`exit ${code}: ${err || 'no output'}`));
        });
        child.on('error', reject);
      });


      const data = JSON.parse(jsonStr);

      if (data.source !== 'meta' || !data.ogTitle) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return { ...defaults.instagram, source: 'default' };
      }

      const ogTitle = he.decode(data.ogTitle);
      const ogDesc = he.decode(data.ogDesc);
      const ogImage = data.ogImage || '';

      const name = ogTitle.split('(@')[0]?.trim() || defaults.instagram.name;
      const followers = (() => {
        const m = ogDesc.match(/(\d[\d\s,]*?)\s*followers?/i);
        return m ? parseInt(m[1].replace(/[\s,]/g, '')) : null;
      })();
      const follows = (() => {
        const m = ogDesc.match(/(\d[\d\s,]*?)\s*suivis?/i);
        return m ? parseInt(m[1].replace(/[\s,]/g, '')) : null;
      })();
      const mediaCount = (() => {
        const m = ogDesc.match(/(\d[\d\s,]*?)\s*publications?/i);
        return m ? parseInt(m[1].replace(/[\s,]/g, '')) : null;
      })();
      const bio = ogDesc.split('- Voir')[0]?.trim() || defaults.instagram.biography;

      return {
        username: IG_USERNAME,
        name,
        biography: bio,
        followers,
        follows,
        mediaCount,
        profilePicture: ogImage || null,
        url: `https://www.instagram.com/${IG_USERNAME}/`,
        source: 'meta',
      };
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      console.warn('⚠️ Instagram OG meta error:', err.message);
      return { ...defaults.instagram, source: 'default' };
    }
  }
  return { ...defaults.instagram, source: 'default' };
}

async function fetchLinkedinProfile() {
  try {
    const liHtml = await new Promise((resolve, reject) => {
      const req = https.get(`https://www.linkedin.com/company/${LI_ORG_ID}/`, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' },
        timeout: 10000,
      }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
    const $ = cheerio.load(liHtml);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    const name = ogTitle.replace(' | LinkedIn', '').trim() || defaults.linkedin.name;
    const cleanDesc = ogDesc.replace(/\s*\|\s*[\d\s]+abonnés.*$/, '').trim();
    const followersMatch = ogDesc.match(/([\d\s]+)\s*abonnés/i);
    const followers = followersMatch ? parseInt(followersMatch[1].replace(/\s/g, '')) : null;

    return {
      name,
      description: cleanDesc || defaults.linkedin.description,
      followers,
      logo: ogImage || null,
      industry: null,
      coverImage: null,
      url: `https://www.linkedin.com/company/${LI_ORG_ID}/`,
      source: 'meta',
    };
  } catch (err) {
    console.warn('⚠️ LinkedIn OG meta error:', err.message);
    return { ...defaults.linkedin, source: 'default' };
  }
}

async function getProfiles() {
  const now = Date.now();
  if (profilesCache && (now - profilesCacheTime) < CACHE_TTL) {
    return profilesCache;
  }

  const [instagram, linkedin] = await Promise.allSettled([
    fetchInstagramProfile(),
    fetchLinkedinProfile(),
  ]);

  const data = {
    instagram: instagram.status === 'fulfilled' ? instagram.value : { ...defaults.instagram, source: 'default' },
    linkedin: linkedin.status === 'fulfilled' ? linkedin.value : { ...defaults.linkedin, source: 'default' },
  };

  // Merge with manual DB overrides (DB values win)
  try {
    const SocialProfile = require('../models/SocialProfile');
    const overrides = await SocialProfile.find().lean();
    for (const o of overrides) {
      if (data[o.platform]) {
        if (o.followers != null) data[o.platform].followers = o.followers;
        if (o.follows != null) data[o.platform].follows = o.follows;
        if (o.mediaCount != null) data[o.platform].mediaCount = o.mediaCount;
        data[o.platform].source = 'overridden';
      }
    }
  } catch (e) { /* DB pas disponible */ }

  if (data.instagram.source === 'meta' || data.instagram.source === 'overridden' ||
      data.linkedin.source === 'meta' || data.linkedin.source === 'overridden') {
    profilesCache = data;
    profilesCacheTime = now;
  }

  return data;
}

module.exports = { getProfiles, defaults };
