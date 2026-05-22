'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('formulario_pdf_mapeos', 'alto', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn('formulario_pdf_mapeos', 'font_tamano', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'alto');
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'font_tamano');
  },
};
