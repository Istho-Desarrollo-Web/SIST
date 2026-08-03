'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('formulario_pdf_generados', 'plantilla_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('formulario_pdf_generados', 'tipo', {
      type: Sequelize.ENUM('plantilla', 'nativo'),
      allowNull: false,
      defaultValue: 'plantilla',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('formulario_pdf_generados', 'tipo');
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_formulario_pdf_generados_tipo\";").catch(() => {});
    await queryInterface.changeColumn('formulario_pdf_generados', 'plantilla_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
