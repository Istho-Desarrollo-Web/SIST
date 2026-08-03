const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioPdfGenerado extends Model {}

FormularioPdfGenerado.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  respuestaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'respuesta_id',
  },
  plantillaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'plantilla_id',
  },
  tipo: {
    type: DataTypes.ENUM('plantilla', 'nativo'),
    allowNull: false,
    defaultValue: 'plantilla',
  },
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
}, {
  sequelize,
  modelName: 'FormularioPdfGenerado',
  tableName: 'formulario_pdf_generados',
  underscored: true,
  updatedAt: false,
});

module.exports = FormularioPdfGenerado;
