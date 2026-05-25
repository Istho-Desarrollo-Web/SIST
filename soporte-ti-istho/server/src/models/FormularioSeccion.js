const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioSeccion extends Model {}

FormularioSeccion.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  formularioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'formulario_id',
  },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  visibleParaUsuario: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'visible_para_usuario',
  },
}, {
  sequelize,
  modelName: 'FormularioSeccion',
  tableName: 'formulario_secciones',
  underscored: true,
});

module.exports = FormularioSeccion;
