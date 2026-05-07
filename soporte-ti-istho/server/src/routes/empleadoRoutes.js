const router = require('express').Router();
const multer = require('multer');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const c = require('../controllers/empleadoController');

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /xlsx|xls/.test(file.originalname.toLowerCase());
    ok ? cb(null, true) : cb(new Error('Solo se permiten archivos Excel (.xlsx)'));
  },
});

const bodyRules = [
  body('identificacion').notEmpty().trim(),
  body('nombreCompleto').notEmpty().trim(),
  body('area').notEmpty().trim(),
  validate,
];

// Ruta pública: empleados buscan su perfil sin token para llenar el formulario
router.get('/buscar', c.buscar);

router.use(auth);

router.get('/', c.listar);
router.get('/plantilla', authorize('admin', 'tecnico'), c.descargarPlantilla);
router.get('/:id', c.obtener);
router.post('/', authorize('admin', 'tecnico'), bodyRules, c.crear);
router.post('/importar', authorize('admin', 'tecnico'), uploadMemory.single('archivo'), c.importar);
router.put('/:id', authorize('admin', 'tecnico'), bodyRules, c.actualizar);
router.delete('/:id', authorize('admin'), c.desactivar);

module.exports = router;
