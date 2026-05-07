require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Base de datos conectada');
    app.listen(PORT, () => {
      logger.info('Servidor iniciado', { port: PORT, env: process.env.NODE_ENV });
    });
  } catch (err) {
    logger.error('Error al conectar la base de datos', { error: err.message });
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => {
  logger.error('Excepción no capturada', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Promesa rechazada sin manejar', { error: String(reason) });
});

start();
