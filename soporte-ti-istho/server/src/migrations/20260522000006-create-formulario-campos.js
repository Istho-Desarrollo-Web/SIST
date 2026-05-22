'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('formulario_campos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      formulario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formularios', key: 'id' },
        onDelete: 'CASCADE',
      },
      tipo: {
        type: Sequelize.ENUM(
          'texto_corto', 'texto_largo', 'numero', 'fecha',
          'seleccion_unica', 'seleccion_multiple', 'archivo', 'firma'
        ),
        allowNull: false,
      },
      etiqueta: { type: Sequelize.STRING(200), allowNull: false },
      descripcion: { type: Sequelize.TEXT },
      placeholder: { type: Sequelize.STRING(200) },
      requerido: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      opciones: { type: Sequelize.JSON },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('formulario_campos', ['formulario_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('formulario_campos');
  },
};
