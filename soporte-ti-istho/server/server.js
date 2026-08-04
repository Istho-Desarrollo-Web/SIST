require('dotenv').config();
const { execSync } = require('child_process');
const app = require('./src/app');
const sequelize = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

function migrarYSembrar() {
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
  try {
    execSync('npx sequelize-cli db:seed:all', { stdio: 'inherit' });
  } catch (err) {
    logger.warn('Seed falló, se continúa el arranque (los seeders son datos iniciales, no deben bloquear el servidor)', { error: err.message });
  }
}

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Base de datos conectada');
    migrarYSembrar();
    app.listen(PORT, () => {
      logger.info('Servidor iniciado', { port: PORT, env: process.env.NODE_ENV });
    });
  } catch (err) {
    logger.error('Error al iniciar el servidor', { error: err.message });
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
