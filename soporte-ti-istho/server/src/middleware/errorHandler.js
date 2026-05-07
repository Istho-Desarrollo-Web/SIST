const logger = require('../utils/logger');

function reqContext(req) {
  return {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    ...(req.user?.id && { userId: req.user.id }),
  };
}

module.exports = (err, req, res, next) => {
  const ctx = reqContext(req);

  // Sequelize: validación y unicidad
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map(e => ({ field: e.path, message: e.message }));
    logger.warn('Validation error', { ...ctx, errors });
    return res.status(400).json({ success: false, message: 'Error de validación', errors });
  }

  // Sequelize: problemas de BD
  if (err.name === 'SequelizeDatabaseError') {
    logger.error('Database error', { ...ctx, error: err.message });
    return res.status(500).json({ success: false, message: 'Error en la base de datos' });
  }
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    logger.error('DB connection error', { ...ctx, error: err.message });
    return res.status(503).json({ success: false, message: 'Servicio no disponible, intenta más tarde' });
  }

  // JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Sesión expirada, inicia sesión nuevamente' });
  }

  // Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'El archivo supera el tamaño máximo permitido (10 MB)' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, message: 'Máximo 3 archivos por solicitud' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message === 'Tipo de archivo no permitido') {
    return res.status(400).json({ success: false, message: 'Tipo de archivo no permitido' });
  }

  // CORS
  if (err.message === 'Not allowed by CORS') {
    logger.warn('CORS blocked', { ...ctx, origin: req.headers.origin });
    return res.status(403).json({ success: false, message: 'Origen no permitido' });
  }

  // Errores 4xx conocidos (lanzados manualmente con err.status)
  if (err.status >= 400 && err.status < 500) {
    logger.warn('Client error', { ...ctx, status: err.status, message: err.message });
    return res.status(err.status).json({ success: false, message: err.message });
  }

  // Error inesperado — loguear con stack completo
  logger.error('Unhandled error', {
    ...ctx,
    error: err.message,
    name: err.name,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
};
