const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { Usuario } = require('../models');

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token requerido' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    const user = await Usuario.findOne({ where: { id: decoded.id, activo: true } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado o inactivo' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// No rechaza si no hay token — lo adjunta a req.user si es válido y sigue
auth.optional = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    const user = await Usuario.findOne({ where: { id: decoded.id, activo: true } });
    req.user = user || null;
  } catch {
    // token inválido o expirado — continuar sin usuario
  }
  next();
};

module.exports = auth;
