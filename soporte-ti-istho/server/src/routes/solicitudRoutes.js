const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const upload = require('../config/multer');
const c = require('../controllers/solicitudController');

// Ruta pública (sin autenticación) para que empleados envíen solicitudes
router.post('/publica', upload.array('archivos', 3), [
  body('identificacion').notEmpty().trim().withMessage('Identificación requerida'),
  body('tipoSolicitud').notEmpty().withMessage('Tipo de solicitud requerido'),
  body('prioridad').optional().isIn(['critica', 'alta', 'media', 'baja']),
  body('descripcion').notEmpty().trim().isLength({ min: 10 }).withMessage('Descripción muy corta'),
  validate,
], c.crearPublica);

router.use(auth);

router.get('/mis-tickets', authorize('tecnico'), c.misTickets);
router.get('/', authorize('admin', 'tecnico'), c.listar);
router.get('/:id', c.obtener);

router.post('/', upload.array('archivos', 3), [
  body('empleado_id').isInt(),
  body('tipoSolicitud').notEmpty(),
  body('prioridad').isIn(['critica', 'alta', 'media', 'baja']),
  body('descripcion').notEmpty().trim(),
  validate,
], c.crear);

router.patch('/bulk', authorize('admin', 'tecnico'), [
  body('ids').isArray({ min: 1, max: 50 }).withMessage('ids debe ser un array de 1 a 50 elementos'),
  body('ids.*').isInt({ min: 1 }),
  body('accion').isIn(['cambiar_estado', 'asignar_tecnico']).withMessage('Acción no válida'),
  body('valor').notEmpty().withMessage('valor es requerido'),
  body('valor').custom((valor, { req }) => {
    if (req.body.accion === 'asignar_tecnico') {
      const n = Number(valor);
      if (!Number.isInteger(n) || n < 1) throw new Error('El técnico debe ser un ID numérico válido');
    }
    return true;
  }),
  validate,
], c.bulkAction);

router.put('/:id', authorize('admin', 'tecnico'), c.actualizar);
router.put('/:id/estado', authorize('admin', 'tecnico'), [
  body('estado').isIn(['abierto', 'en_proceso', 'pendiente_usuario', 'pendiente_externo', 'resuelto', 'cerrado', 'cancelado']),
  validate,
], c.cambiarEstado);

router.put('/:id/asignar', authorize('admin', 'tecnico'), [
  body('tecnicoId').isInt(),
  validate,
], c.asignarTecnico);

router.post('/:id/comentario', [
  body('texto').notEmpty().trim(),
  validate,
], c.agregarComentario);

router.put('/:id/calificar', [
  body('calificacion').isInt({ min: 1, max: 5 }),
  validate,
], c.calificar);

module.exports = router;
