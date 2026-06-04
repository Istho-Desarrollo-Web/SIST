'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('formulario_secciones', 'condiciones', {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_secciones', 'condiciones');
  },
};
