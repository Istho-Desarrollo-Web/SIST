'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('formularios', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      descripcion: { type: Sequelize.TEXT },
      acceso: {
        type: Sequelize.ENUM('publico', 'autenticado'),
        allowNull: false,
        defaultValue: 'autenticado',
      },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      creado_por: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('formularios', ['creado_por']);
    await queryInterface.addIndex('formularios', ['acceso']);
    await queryInterface.addIndex('formularios', ['activo']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('formularios');
  },
};
