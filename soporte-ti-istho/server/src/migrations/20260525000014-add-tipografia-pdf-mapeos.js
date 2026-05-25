'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('formulario_pdf_mapeos', 'font_familia', {
      type: Sequelize.ENUM('Helvetica', 'TimesRoman', 'Courier'),
      allowNull: false,
      defaultValue: 'Helvetica',
      after: 'font_tamano',
    });
    await queryInterface.addColumn('formulario_pdf_mapeos', 'font_negrita', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'font_familia',
    });
    await queryInterface.addColumn('formulario_pdf_mapeos', 'font_cursiva', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'font_negrita',
    });
    await queryInterface.addColumn('formulario_pdf_mapeos', 'font_color', {
      type: Sequelize.STRING(7),
      allowNull: false,
      defaultValue: '#000000',
      after: 'font_cursiva',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'font_color');
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'font_cursiva');
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'font_negrita');
    // ENUM requires dropping the type too in MySQL
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'font_familia');
  },
};
