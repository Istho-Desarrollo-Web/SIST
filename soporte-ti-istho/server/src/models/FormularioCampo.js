const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioCampo extends Model {}

FormularioCampo.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  formularioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'formulario_id',
  },
  seccionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'seccion_id',
  },
  tipo: {
    type: DataTypes.ENUM(
      'texto_corto', 'texto_largo', 'numero', 'fecha',
      'seleccion_unica', 'seleccion_multiple', 'archivo', 'firma', 'grilla'
    ),
    allowNull: false,
  },
  etiqueta: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  placeholder: { type: DataTypes.STRING(200) },
  requerido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  opciones: { type: DataTypes.JSON },
  condiciones: { type: DataTypes.JSON },
}, {
  sequelize,
  modelName: 'FormularioCampo',
  tableName: 'formulario_campos',
  underscored: true,
});

module.exports = FormularioCampo;
