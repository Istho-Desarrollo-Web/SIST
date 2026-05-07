'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auditoria', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      tabla: { type: Sequelize.STRING(50), allowNull: false },
      registro_id: { type: Sequelize.INTEGER, allowNull: false },
      operacion: { type: Sequelize.ENUM('INSERT', 'UPDATE', 'DELETE'), allowNull: false },
      datos_anteriores: { type: Sequelize.JSON },
      datos_nuevos: { type: Sequelize.JSON },
      campo_modificado: { type: Sequelize.STRING(100) },
      usuario_id: {
        type: Sequelize.INTEGER,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
      },
      ip_address: { type: Sequelize.STRING(45) },
      user_agent: { type: Sequelize.STRING(500) },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('auditoria', ['tabla', 'registro_id']);
    await queryInterface.addIndex('auditoria', ['usuario_id']);
    await queryInterface.addIndex('auditoria', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auditoria');
  },
};
