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
    // Las filas nativas (tipo='nativo') existen solo por esta funcionalidad y no
    // tienen plantilla_id (es NULL por diseño). Sin la columna `tipo` no hay forma
    // de distinguirlas, y forzar plantilla_id a NOT NULL con filas NULL presentes
    // falla en modo estricto de MySQL (o corrompe datos coaccionando NULL a 0,
    // violando la FK hacia formulario_pdf_plantillas). Se eliminan antes de revertir.
    await queryInterface.sequelize.query("DELETE FROM formulario_pdf_generados WHERE tipo = 'nativo'");
    await queryInterface.removeColumn('formulario_pdf_generados', 'tipo');
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_formulario_pdf_generados_tipo\";").catch(() => {});
    await queryInterface.changeColumn('formulario_pdf_generados', 'plantilla_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
