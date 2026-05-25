'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla formulario_secciones
    await queryInterface.createTable('formulario_secciones', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      formulario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formularios', key: 'id' },
        onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      visible_para_usuario: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('formulario_secciones', ['formulario_id']);

    // Agregar columna seccion_id a formulario_campos
    await queryInterface.addColumn('formulario_campos', 'seccion_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: { model: 'formulario_secciones', key: 'id' },
      onDelete: 'SET NULL',
      after: 'formulario_id',
    });
    await queryInterface.addIndex('formulario_campos', ['seccion_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_campos', 'seccion_id');
    await queryInterface.dropTable('formulario_secciones');
  },
};
