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
  fontFamilia: {
    type: DataTypes.ENUM('Helvetica', 'TimesRoman', 'Courier'),
    allowNull: false,
    defaultValue: 'Helvetica',
    field: 'font_familia',
  },
  fontNegrita: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'font_negrita',
  },
  fontCursiva: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'font_cursiva',
  },
  fontColor: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#000000',
    field: 'font_color',
  },
}, {
  sequelize,
  modelName: 'FormularioPdfMapeo',
  tableName: 'formulario_pdf_mapeos',
  underscored: true,
});

module.exports = FormularioPdfMapeo;
