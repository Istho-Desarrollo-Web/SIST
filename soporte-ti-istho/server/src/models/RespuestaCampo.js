const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class RespuestaCampo extends Model {}

RespuestaCampo.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  respuestaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'respuesta_id',
  },
  campoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'campo_id',
  },
  valor: { type: DataTypes.TEXT },
  archivoUrl: {
    type: DataTypes.STRING(500),
    field: 'archivo_url',
  },
  archivoPublicId: {
    type: DataTypes.STRING(300),
    field: 'archivo_public_id',
  },
}, {
  sequelize,
  modelName: 'RespuestaCampo',
  tableName: 'respuesta_campos',
  underscored: true,
});

module.exports = RespuestaCampo;
