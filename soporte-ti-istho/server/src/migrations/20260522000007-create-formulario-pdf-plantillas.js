'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('formulario_pdf_plantillas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      formulario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formularios', key: 'id' },
        onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      url_cloudinary: { type: Sequelize.STRING(500), allowNull: false },
      public_id: { type: Sequelize.STRING(300), allowNull: false },
      tiene_acroform: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('formulario_pdf_plantillas', ['formulario_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('formulario_pdf_plantillas');
  },
};
