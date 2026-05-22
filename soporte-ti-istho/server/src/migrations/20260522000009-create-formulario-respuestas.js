'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('formulario_respuestas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      formulario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formularios', key: 'id' },
        onDelete: 'RESTRICT',
      },
      solicitud_id: {
        type: Sequelize.INTEGER,
        references: { model: 'solicitudes', key: 'id' },
        onDelete: 'SET NULL',
      },
      respondido_por: {
        type: Sequelize.INTEGER,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
      },
      ip_respondente: { type: Sequelize.STRING(45) },
      estado: {
        type: Sequelize.ENUM('pendiente', 'completado'),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('formulario_respuestas', ['formulario_id']);
    await queryInterface.addIndex('formulario_respuestas', ['respondido_por']);
    await queryInterface.addIndex('formulario_respuestas', ['solicitud_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('formulario_respuestas');
  },
};
