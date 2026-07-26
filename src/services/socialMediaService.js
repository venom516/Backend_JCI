const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const cloudinary = require('../config/cloudinary');

const FACEBOOK_API = 'https://graph.facebook.com/v22.0';
const LINKEDIN_API = 'https://api.linkedin.com/v2';

function getConfig() {
  return {
    facebookPageId: process.env.FACEBOOK_PAGE_ID,
    facebookToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    instagramId: process.env.INSTAGRAM_BUSINESS_ID,
    linkedinToken: process.env.LINKEDIN_ACCESS_TOKEN,
    linkedinOrgId: process.env.LINKEDIN_ORGANIZATION_ID,
  };
}

async function getFileStream(fileUrl) {
  if (fileUrl.startsWith('http')) {
    const response = await axios.get(fileUrl, { responseType: 'stream' });
    return response.data;
  }
  return fs.createReadStream(fileUrl);
}

async function getFileBuffer(fileUrl) {
  if (fileUrl.startsWith('http')) {
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
  return fs.readFileSync(fileUrl);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo', '.webm': 'video/webm',
  };
  return map[ext] || 'application/octet-stream';
}

function isVideo(mime) {
  return mime.startsWith('video/');
}

async function downloadToTemp(fileUrl) {
  const ext = path.extname(new URL(fileUrl).pathname) || '.jpg';
  const tempPath = path.join(os.tmpdir(), 'jci-temp-' + Date.now() + ext);
  const buffer = await getFileBuffer(fileUrl);
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

async function publishToFacebook(config, publication, fileUrl) {
  if (!config.facebookToken || !config.facebookPageId) {
    return { success: false, error: 'FACEBOOK_PAGE_ACCESS_TOKEN ou FACEBOOK_PAGE_ID non configuré' };
  }
  try {
    const mime = getMimeType(fileUrl);
    const isVideoType = isVideo(mime);
    const endpoint = isVideoType ? 'videos' : 'photos';
    const captionField = isVideoType ? 'description' : 'message';

    const fileStream = await getFileStream(fileUrl);
    const form = new FormData();
    form.append('source', fileStream, {
      filename: path.basename(fileUrl),
      contentType: mime,
    });
    form.append(captionField, publication.caption || publication.titre || '');
    form.append('access_token', config.facebookToken);

    const url = `${FACEBOOK_API}/${config.facebookPageId}/${endpoint}`;
    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });

    console.log(`✅ Facebook: publication ${isVideoType ? 'vidéo' : 'photo'} postée (ID: ${response.data.id})`);
    return { success: true, postId: response.data.id, platform: 'Facebook' };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('❌ Facebook API error:', msg);
    return { success: false, error: msg, platform: 'Facebook' };
  }
}

async function publishToInstagram(config, publication, fileUrl) {
  if (!config.instagramId || !config.facebookToken) {
    return { success: false, error: 'INSTAGRAM_BUSINESS_ID ou token Facebook non configuré' };
  }
  try {
    const mime = getMimeType(fileUrl);
    const isVideoType = isVideo(mime);

    if (fileUrl.includes('localhost') || fileUrl.includes('127.0.0.1')) {
      return { success: false, error: 'Instagram nécessite une URL publique. Utilisez Cloudinary ou un tunnel (ngrok).' };
    }

    const containerBody = isVideoType
      ? { media_type: 'REELS', video_url: fileUrl, caption: publication.caption || publication.titre || '' }
      : { image_url: fileUrl, caption: publication.caption || publication.titre || '' };

    const containerRes = await axios.post(
      `${FACEBOOK_API}/${config.instagramId}/media`,
      containerBody,
      { params: { access_token: config.facebookToken } }
    );

    const creationId = containerRes.data.id;
    console.log(`✅ Instagram: conteneur média créé (ID: ${creationId})`);

    await new Promise(r => setTimeout(r, 5000));

    const publishRes = await axios.post(
      `${FACEBOOK_API}/${config.instagramId}/media_publish`,
      { creation_id: creationId },
      { params: { access_token: config.facebookToken } }
    );

    console.log(`✅ Instagram: média publié (ID: ${publishRes.data.id})`);
    return { success: true, postId: publishRes.data.id, platform: 'Instagram' };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('❌ Instagram API error:', msg);
    return { success: false, error: msg, platform: 'Instagram' };
  }
}

async function publishToLinkedIn(config, publication, fileUrl) {
  if (!config.linkedinToken || !config.linkedinOrgId) {
    return { success: false, error: 'LINKEDIN_ACCESS_TOKEN ou LINKEDIN_ORGANIZATION_ID non configuré' };
  }
  try {
    const orgUrn = `urn:li:organization:${config.linkedinOrgId}`;
    const mime = getMimeType(fileUrl);
    const isVideoType = isVideo(mime);

    if (isVideoType) {
      return { success: false, error: 'LinkedIn: la publication vidéo n\'est pas encore supportée' };
    }

    if (fileUrl.includes('localhost') || fileUrl.includes('127.0.0.1')) {
      return { success: false, error: 'LinkedIn nécessite une URL publique. Utilisez Cloudinary ou un tunnel (ngrok).' };
    }

    const registerRes = await axios.post(
      `${LINKEDIN_API}/images?urn=li:organization:${config.linkedinOrgId}`,
      { registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: orgUrn,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        }],
      }},
      { headers: { 'Authorization': `Bearer ${config.linkedinToken}` } }
    );

    const uploadUrl = registerRes.data.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
    const assetUrn = registerRes.data.value?.asset;

    if (!uploadUrl || !assetUrn) {
      return { success: false, error: 'LinkedIn: échec de l\'enregistrement du upload' };
    }

    console.log(`✅ LinkedIn: upload enregistré, téléversement du fichier...`);

    const fileBuffer = await getFileBuffer(fileUrl);
    await axios.put(uploadUrl, fileBuffer, {
      headers: {
        'Authorization': `Bearer ${config.linkedinToken}`,
        'Content-Type': mime,
      },
    });

    console.log(`✅ LinkedIn: fichier téléversé`);

    await axios.post(
      `${LINKEDIN_API}/posts`,
      {
        author: orgUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: publication.caption || publication.titre || '' },
            shareMediaCategory: 'IMAGE',
            media: [{ status: 'READY', media: assetUrn }],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      },
      { headers: { 'Authorization': `Bearer ${config.linkedinToken}`, 'X-Restli-Protocol-Version': '2.0.0' } }
    );

    console.log(`✅ LinkedIn: publication créée`);
    return { success: true, platform: 'LinkedIn' };
  } catch (error) {
    const msg = error.response?.data?.message || error.response?.data?.error?.message || error.message;
    console.error('❌ LinkedIn API error:', msg);
    return { success: false, error: msg, platform: 'LinkedIn' };
  }
}

async function publishPublication(publication) {
  const config = getConfig();
  const platforms = Array.isArray(publication.socialMedia) ? publication.socialMedia : [];
  const results = [];

  if (platforms.length === 0) {
    console.log('📭 Aucune plateforme sociale sélectionnée pour cette publication');
    return results;
  }

  const fileUrl = publication.fichier;
  console.log(`📤 Publication sociale pour "${publication.titre}" sur: ${platforms.join(', ')}`);

  for (const platform of platforms) {
    switch (platform.toLowerCase()) {
      case 'facebook':
        results.push(await publishToFacebook(config, publication, fileUrl));
        break;
      case 'instagram':
        results.push(await publishToInstagram(config, publication, fileUrl));
        break;
      case 'linkedin':
        results.push(await publishToLinkedIn(config, publication, fileUrl));
        break;
      case 'twitter':
      case 'youtube':
        console.log(`⚠️ ${platform}: pas encore implémenté`);
        results.push({ success: false, error: 'Non implémenté', platform });
        break;
    }
  }

  const succeeded = results.filter(r => r.success).length;
  console.log(`✅ Publication sociale terminée: ${succeeded}/${results.length} réussi(s)`);
  return results;
}

async function publishDirect({ caption, titre, type, platforms, filePaths }) {
  const config = getConfig();
  const results = [];

  if (!platforms || platforms.length === 0) {
    return [{ success: false, error: 'Aucune plateforme sélectionnée', platform: 'all' }];
  }
  if (!filePaths || filePaths.length === 0) {
    return [{ success: false, error: 'Aucun fichier à publier', platform: 'all' }];
  }

  const pubData = { caption: caption || '', titre: titre || '' };

  for (const platform of platforms) {
    for (const filePath of filePaths) {
      const fileUrl = filePath.startsWith('http') ? filePath : filePath;
      switch (platform.toLowerCase()) {
        case 'facebook':
          results.push(await publishToFacebook(config, pubData, fileUrl));
          break;
        case 'instagram':
          results.push(await publishToInstagram(config, pubData, fileUrl));
          break;
        case 'linkedin':
          results.push(await publishToLinkedIn(config, pubData, fileUrl));
          break;
        default:
          results.push({ success: false, error: 'Non implémenté', platform });
      }
    }
  }

  const succeeded = results.filter(r => r.success).length;
  console.log(`✅ Publication directe terminée: ${succeeded}/${results.length} réussi(s)`);
  return results;
}

module.exports = { publishPublication, publishDirect, publishToFacebook, publishToInstagram, publishToLinkedIn };
