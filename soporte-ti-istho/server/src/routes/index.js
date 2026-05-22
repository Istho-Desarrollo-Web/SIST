const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/usuarios', require('./usuarioRoutes'));
router.use('/empleados', require('./empleadoRoutes'));
router.use('/solicitudes', require('./solicitudRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/reportes', require('./reportesRoutes'));

router.use('/formularios', require('./formularioRoutes'));

router.get('/health', (req, res) => res.json({ success: true, message: 'OK', timestamp: new Date() }));

module.exports = router;
