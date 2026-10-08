const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const resourceTypeFor = (req, file) => {
  const mime = (file && file.mimetype) || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'raw';
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'jci-uploads',
    resource_type: (req, file) => resourceTypeFor(req, file),
    public_id: (req, file) => 'jci-' + Date.now() + '-' + Math.round(Math.random() * 1E9),
  },
});

const limits = { fileSize: 10 * 1024 * 1024 };

const MIMES_DOCUMENT = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const filtreDocument = (req, file, cb) => {
  if (MIMES_DOCUMENT.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Type de fichier non supporté. Utilisez PDF ou DOCX uniquement.'), false);
};

const filtreMedia = (req, file, cb) => {
  const mime = file.mimetype || '';
  if (mime.startsWith('image/') || mime.startsWith('video/')) return cb(null, true);
  cb(new Error('Type de fichier non supporté. Utilisez une image ou une vidéo.'), false);
};

const uploadDocument = multer({ storage, limits, fileFilter: filtreDocument });
const uploadMedia = multer({ storage, limits, fileFilter: filtreMedia });

module.exports = { uploadDocument, uploadMedia };