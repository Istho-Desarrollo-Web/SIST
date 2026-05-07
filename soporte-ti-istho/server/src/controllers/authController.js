const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { Usuario } = require('../models');
const { registrarAuditoria } = require('../services/auditoriaService');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await Usuario.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      return res.status(403).json({ success: false, message: 'Cuenta bloqueada temporalmente' });
    }

    if (!user.activo) {
      return res.status(403).json({ success: false, message: 'Usuario inactivo' });
    }

    if (!user.validarPassword(password)) {
      const intentos = (user.intentos_fallidos || 0) + 1;
      const updates = { intentos_fallidos: intentos };
      if (intentos >= 5) updates.bloqueado_hasta = new Date(Date.now() + 30 * 60000);
      await user.update(updates);
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    await user.update({ intentos_fallidos: 0, ultimo_acceso: new Date() });

    const token = jwt.sign({ id: user.id, rol: user.rol }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

    res.json({ success: true, data: { token, user } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ success: true, data: req.user });
}

async function cambiarPassword(req, res, next) {
  try {
    const { passwordActual, passwordNuevo } = req.body;
    const user = await Usuario.findByPk(req.user.id);

    if (!user.validarPassword(passwordActual)) {
      return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
    }

    await user.update({ password_hash: passwordNuevo });

    await registrarAuditoria({
      tabla: 'usuarios', registro_id: user.id, operacion: 'UPDATE',
      datos_nuevos: { campo: 'password_hash' }, usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, cambiarPassword };
