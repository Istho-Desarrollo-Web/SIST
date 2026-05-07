const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH)
  : path.join(__dirname, '..', '..', 'uploads', 'solicitudes');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

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
