'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      identificacion: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      rol: { type: Sequelize.ENUM('admin', 'tecnico', 'usuario'), allowNull: false, defaultValue: 'usuario' },
      area: { type: Sequelize.STRING(100) },
      especialidad: { type: Sequelize.STRING(100) },
      capacidad_max: { type: Sequelize.INTEGER, defaultValue: 10 },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      ultimo_acceso: { type: Sequelize.DATE },
      intentos_fallidos: { type: Sequelize.INTEGER, defaultValue: 0 },
      bloqueado_hasta: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('usuarios', ['email']);
    await queryInterface.addIndex('usuarios', ['rol']);
    await queryInterface.addIndex('usuarios', ['activo']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  },
};
