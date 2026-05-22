const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Formulario extends Model {}

Formulario.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  acceso: {
    type: DataTypes.ENUM('publico', 'autenticado'),
    allowNull: false,
    defaultValue: 'autenticado',
  },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  creadoPor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'creado_por',
    references: { model: 'usuarios', key: 'id' },
  },
}, {
  sequelize,
  modelName: 'Formulario',
  tableName: 'formularios',
  underscored: true,
});

module.exports = Formulario;
