'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('formulario_pdf_mapeos', 'formato_fecha', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'formato_fecha');
  },
};
