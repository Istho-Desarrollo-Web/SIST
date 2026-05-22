'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('respuesta_campos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      respuesta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formulario_respuestas', key: 'id' },
        onDelete: 'CASCADE',
      },
      campo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formulario_campos', key: 'id' },
        onDelete: 'RESTRICT',
      },
      valor: { type: Sequelize.TEXT },
      archivo_url: { type: Sequelize.STRING(500) },
      archivo_public_id: { type: Sequelize.STRING(300) },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('respuesta_campos', ['respuesta_id']);
    await queryInterface.addIndex('respuesta_campos', ['campo_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('respuesta_campos');
  },
};
