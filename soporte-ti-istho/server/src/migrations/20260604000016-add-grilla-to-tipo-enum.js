'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.changeColumn('formulario_campos', 'tipo', {
      type: DataTypes.ENUM(
        'texto_corto', 'texto_largo', 'numero', 'fecha',
        'seleccion_unica', 'seleccion_multiple', 'archivo', 'firma', 'grilla'
      ),
      allowNull: false,
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE formulario_campos SET tipo = 'texto_corto' WHERE tipo = 'grilla'`
    );
    await queryInterface.changeColumn('formulario_campos', 'tipo', {
      type: DataTypes.ENUM(
        'texto_corto', 'texto_largo', 'numero', 'fecha',
        'seleccion_unica', 'seleccion_multiple', 'archivo', 'firma'
      ),
      allowNull: false,
    });
  },
};
