'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('formulario_pdf_generados', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      respuesta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formulario_respuestas', key: 'id' },
        onDelete: 'CASCADE',
      },
      plantilla_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formulario_pdf_plantillas', key: 'id' },
        onDelete: 'RESTRICT',
      },
      url_cloudinary: { type: Sequelize.STRING(500), allowNull: false },
      public_id: { type: Sequelize.STRING(300), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('formulario_pdf_generados', ['respuesta_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('formulario_pdf_generados');
  },
};
