module.exports = {
  secret: process.env.JWT_SECRET || 'dev_secret_cambiar_en_produccion',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};
