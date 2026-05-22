const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioPdfMapeo extends Model {}

FormularioPdfMapeo.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  plantillaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'plantilla_id',
  },
  campoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'campo_id',
  },
  pdfCampoNombre: {
    type: DataTypes.STRING(200),
    field: 'pdf_campo_nombre',
  },
  pagina: { type: DataTypes.INTEGER },
  posX: { type: DataTypes.FLOAT, field: 'pos_x' },
  posY: { type: DataTypes.FLOAT, field: 'pos_y' },
  ancho: { type: DataTypes.FLOAT },
  alto: { type: DataTypes.FLOAT },
  fontTamano: { type: DataTypes.INTEGER, field: 'font_tamano' },
  formatoFecha: { type: DataTypes.STRING(20), field: 'formato_fecha' },
}, {
  sequelize,
  modelName: 'FormularioPdfMapeo',
  tableName: 'formulario_pdf_mapeos',
  underscored: true,
});

module.exports = FormularioPdfMapeo;
