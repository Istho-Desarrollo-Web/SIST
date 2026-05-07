const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const c = require('../controllers/reportesController');

router.use(auth);
router.use(authorize('admin', 'tecnico'));

router.get('/', c.listar);
router.get('/resumen', c.resumen);
router.get('/exportar', c.exportarExcel);

module.exports = router;
