const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Empleado extends Model {}

Empleado.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  identificacion: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  nombreCompleto: { type: DataTypes.STRING(150), allowNull: false },
  area: { type: DataTypes.STRING(100), allowNull: false },
  cargo: { type: DataTypes.STRING(100) },
  email: { type: DataTypes.STRING(100) },
  telefono: { type: DataTypes.STRING(20) },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  sequelize,
  modelName: 'Empleado',
  tableName: 'empleados',
});

module.exports = Empleado;
