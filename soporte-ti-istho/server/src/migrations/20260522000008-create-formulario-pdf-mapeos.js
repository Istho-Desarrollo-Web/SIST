'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('formulario_pdf_mapeos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      plantilla_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formulario_pdf_plantillas', key: 'id' },
        onDelete: 'CASCADE',
      },
      campo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formulario_campos', key: 'id' },
        onDelete: 'CASCADE',
      },
      pdf_campo_nombre: { type: Sequelize.STRING(200) },
      pagina: { type: Sequelize.INTEGER },
      pos_x: { type: Sequelize.FLOAT },
      pos_y: { type: Sequelize.FLOAT },
      ancho: { type: Sequelize.FLOAT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('formulario_pdf_mapeos', ['plantilla_id']);
    await queryInterface.addIndex('formulario_pdf_mapeos', ['campo_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('formulario_pdf_mapeos');
  },
};
