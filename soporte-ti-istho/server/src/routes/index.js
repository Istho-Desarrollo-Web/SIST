const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/usuarios', require('./usuarioRoutes'));
router.use('/empleados', require('./empleadoRoutes'));
router.use('/solicitudes', require('./solicitudRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/reportes', require('./reportesRoutes'));

router.use('/formularios', require('./formularioRoutes'));

router.get('/health', (req, res) => res.json({ success: true, message: 'OK', timestamp: new Date() }));

router.use('/', (_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint no encontrado' });
});

module.exports = router;
