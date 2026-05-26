const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Auditoria extends Model {}

Auditoria.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  tabla: { type: DataTypes.STRING(50), allowNull: false },
  registro_id: { type: DataTypes.INTEGER, allowNull: false },
  operacion: { type: DataTypes.ENUM('INSERT', 'UPDATE', 'DELETE'), allowNull: false },
  datos_anteriores: { type: DataTypes.JSON },
  datos_nuevos: { type: DataTypes.JSON },
  campo_modificado: { type: DataTypes.STRING(100) },
  usuario_id: { type: DataTypes.INTEGER, references: { model: 'usuarios', key: 'id' } },
  ip_address: { type: DataTypes.STRING(45) },
  user_agent: { type: DataTypes.STRING(500) },
}, {
  sequelize,
  modelName: 'Auditoria',
  tableName: 'auditoria',
  underscored: true,
  updatedAt: false,
});

module.exports = Auditoria;
