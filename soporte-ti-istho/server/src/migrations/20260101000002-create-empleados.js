'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('empleados', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      identificacion: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      nombreCompleto: { type: Sequelize.STRING(150), allowNull: false },
      area: { type: Sequelize.STRING(100), allowNull: false },
      cargo: { type: Sequelize.STRING(100) },
      email: { type: Sequelize.STRING(100) },
      telefono: { type: Sequelize.STRING(20) },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('empleados', ['identificacion']);
    await queryInterface.addIndex('empleados', ['area']);
    await queryInterface.addIndex('empleados', ['activo']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('empleados');
  },
};
