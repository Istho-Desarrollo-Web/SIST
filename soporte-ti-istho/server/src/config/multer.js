const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

let storage;

if (hasCloudinary) {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('./cloudinary');
  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      // Nombre base sanitizado: sin acentos, sin caracteres especiales
      const baseName = path.basename(file.originalname, path.extname(file.originalname))
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_{2,}/g, '_')
        .slice(0, 80);
      const suffix = uuidv4().slice(0, 8);
      return {
        folder: 'sist-solicitudes',
        public_id: isImage ? `${baseName}_${suffix}` : `${baseName}_${suffix}.${ext}`,
        resource_type: isImage ? 'image' : 'raw',
      };
    },
  });
} else {
  const uploadDir = path.join(__dirname, '../../uploads/solicitudes');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${uuidv4()}${ext}`;
      cb(null, name);
    },
  });
}

const ALLOWED_EXTS = new Set([
  'jpg','jpeg','png','gif','webp',
  'pdf',
  'doc','docx','xls','xlsx','ppt','pptx',
  'mp4','webm','avi','mov',
  'mp3','wav','ogg','m4a',
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (ALLOWED_EXTS.has(ext)) return cb(null, true);
  cb(new Error('Tipo de archivo no permitido. Se admiten: imágenes, PDF, Word, Excel, PPT, video y audio.'));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});
