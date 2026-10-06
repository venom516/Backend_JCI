const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const DOSSIER = 'jci-uploads';
const TAILLE_MAX = 10 * 1024 * 1024;

// Un module sans filtre qui lui est propre herite du filtre d'un autre et casse
// en silence des qu'un seul change ses regles : deux filtres distincts (§1.2).
const construireStorage = (prefixe) => new CloudinaryStorage({
  cloudinary,
  params: {
    folder: DOSSIER,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
    resource_type: 'raw',
    public_id: (req, file) => `${prefixe}-` + Date.now() + '-' + Math.round(Math.random() * 1E9)
  }
});

const storageDocument = construireStorage('doc');
const storageMedia = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: DOSSIER,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm'],
    resource_type: 'auto',
    public_id: (req, file) => 'media-' + Date.now() + '-' + Math.round(Math.random() * 1E9)
  }
});

// Table de correspondance extension -> MIME declares.
// Verifier l'extension ET le MIME dans deux listes separees laisse passer un
// .txt contenant un PDF ; le MIME doit correspondre a l'extension (§1.2).
const MIME_PDF = 'application/pdf';
const MIME_DOC = 'application/msword';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_XLS = 'application/vnd.ms-excel';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIME_TXT = 'text/plain';

const DOCUMENTS = new Map([
  ['.pdf', new Set([MIME_PDF])],
  ['.doc', new Set([MIME_DOC])],
  ['.docx', new Set([MIME_DOCX])],
  ['.xls', new Set([MIME_XLS])],
  ['.xlsx', new Set([MIME_XLSX])],
  ['.txt', new Set([MIME_TXT])]
]);

// Le module publications accepte aussi des pieces jointes : son filtre est
// propre a uploadMedia, il n'est pas partage avec uploadDocument.
const MEDIA = new Map([
  ['.jpg', new Set(['image/jpeg'])],
  ['.jpeg', new Set(['image/jpeg'])],
  ['.png', new Set(['image/png'])],
  ['.gif', new Set(['image/gif'])],
  ['.webp', new Set(['image/webp'])],
  ['.mp4', new Set(['video/mp4'])],
  ['.mov', new Set(['video/quicktime'])],
  ['.avi', new Set(['video/x-msvideo'])],
  ['.webm', new Set(['video/webm'])],
  ['.pdf', new Set([MIME_PDF])],
  ['.doc', new Set([MIME_DOC])],
  ['.docx', new Set([MIME_DOCX])],
  ['.xls', new Set([MIME_XLS])],
  ['.xlsx', new Set([MIME_XLSX])],
  ['.txt', new Set([MIME_TXT])]
]);

const extensionDe = (nom) => {
  const i = nom.lastIndexOf('.');
  return i === -1 ? '' : nom.slice(i).toLowerCase();
};

const filtre = (table, message) => (req, file, cb) => {
  const mimesAutorises = table.get(extensionDe(file.originalname || ''));
  if (mimesAutorises && mimesAutorises.has(file.mimetype)) return cb(null, true);
  return cb(new Error(message));
};

const uploadDocument = multer({
  storage: storageDocument,
  limits: { fileSize: TAILLE_MAX },
  fileFilter: filtre(
    DOCUMENTS,
    'Type de fichier non supporté. Utilisez PDF, DOC, DOCX, XLS, XLSX ou TXT.'
  )
});

const uploadMedia = multer({
  storage: storageMedia,
  limits: { fileSize: TAILLE_MAX },
  fileFilter: filtre(
    MEDIA,
    'Type de fichier non supporté. Utilisez JPG, PNG, GIF, WEBP, MP4, MOV, AVI, WEBM, PDF, DOC ou DOCX.'
  )
});

module.exports = { uploadDocument, uploadMedia };