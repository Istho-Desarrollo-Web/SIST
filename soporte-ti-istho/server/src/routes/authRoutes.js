const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const c = require('../controllers/authController');

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], c.login);

router.get('/me', auth, c.me);

router.put('/cambiar-password', auth, [
  body('passwordActual').notEmpty(),
  body('passwordNuevo').isLength({ min: 8 }),
  validate,
], c.cambiarPassword);

module.exports = router;
