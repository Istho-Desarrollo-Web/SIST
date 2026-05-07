const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const c = require('../controllers/usuarioController');

router.use(auth);

router.get('/tecnicos', c.listarTecnicos);
router.get('/', authorize('admin'), c.listar);
router.get('/:id', authorize('admin'), c.obtener);

router.post('/', authorize('admin'), [
  body('identificacion').notEmpty().trim(),
  body('nombre').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('rol').isIn(['admin', 'tecnico', 'usuario']),
  validate,
], c.crear);

router.put('/:id', authorize('admin'), [
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 8 }),
  validate,
], c.actualizar);

router.delete('/:id', authorize('admin'), c.desactivar);

module.exports = router;
