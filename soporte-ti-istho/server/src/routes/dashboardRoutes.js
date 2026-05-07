const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const c = require('../controllers/dashboardController');

router.use(auth, authorize('admin', 'tecnico'));

router.get('/resumen', c.resumen);
router.get('/tecnicos', c.porTecnico);
router.get('/sla', c.metricasSLA);
router.get('/tendencias', c.tendencias);

module.exports = router;
