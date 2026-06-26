'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('formulario_respuestas', 'nombre_respondente', {
      type: Sequelize.STRING(200),
      allowNull: true,
      defaultValue: null,
      after: 'ip_respondente',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_respuestas', 'nombre_respondente');
  },
};
