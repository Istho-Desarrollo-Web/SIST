const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioRespuesta extends Model {}

FormularioRespuesta.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  formularioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'formulario_id',
  },
  solicitudId: {
    type: DataTypes.INTEGER,
    field: 'solicitud_id',
  },
  respondidoPor: {
    type: DataTypes.INTEGER,
    field: 'respondido_por',
  },
  ipRespondente: {
    type: DataTypes.STRING(45),
    field: 'ip_respondente',
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'completado'),
    allowNull: false,
    defaultValue: 'pendiente',
  },
}, {
  sequelize,
  modelName: 'FormularioRespuesta',
  tableName: 'formulario_respuestas',
  underscored: true,
});

module.exports = FormularioRespuesta;
