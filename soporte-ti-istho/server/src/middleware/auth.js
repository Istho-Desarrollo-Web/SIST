const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { Usuario } = require('../models');

module.exports = async (req, res, next) => {
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
