'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('formulario_pdf_mapeos', 'transform_texto', {
      type: Sequelize.ENUM('ninguno', 'mayusculas', 'minusculas', 'capitalizar'),
      allowNull: false,
      defaultValue: 'ninguno',
      after: 'font_color',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'transform_texto');
  },
};
