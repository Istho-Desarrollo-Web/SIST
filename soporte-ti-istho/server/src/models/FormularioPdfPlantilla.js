const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioPdfPlantilla extends Model {}

FormularioPdfPlantilla.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  formularioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'formulario_id',
  },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  urlCloudinary: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'url_cloudinary',
  },
  publicId: {
    type: DataTypes.STRING(300),
    allowNull: false,
    field: 'public_id',
  },
  tieneAcroform: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'tiene_acroform',
  },
}, {
  sequelize,
  modelName: 'FormularioPdfPlantilla',
  tableName: 'formulario_pdf_plantillas',
  underscored: true,
});

module.exports = FormularioPdfPlantilla;
