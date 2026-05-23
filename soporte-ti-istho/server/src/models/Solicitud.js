const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { TIPOS_SOLICITUD } = require('../utils/constants');

class Solicitud extends Model {}

Solicitud.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  numero: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  empleado_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'empleados', key: 'id' } },
  tipoSolicitud: {
    type: DataTypes.ENUM(...TIPOS_SOLICITUD),
    allowNull: false,
  },
  prioridad: {
    type: DataTypes.ENUM('critica', 'alta', 'media', 'baja'),
    allowNull: false,
    defaultValue: 'media',
  },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  estado: {
    type: DataTypes.ENUM(
      'abierto', 'en_analisis', 'en_proceso',
      'pendiente_usuario', 'pendiente_externo',
      'resuelto', 'cerrado', 'rechazado'
    ),
    allowNull: false,
    defaultValue: 'abierto',
  },
  tecnicoAsignado: { type: DataTypes.INTEGER, references: { model: 'usuarios', key: 'id' } },
  archivosAdjuntos: { type: DataTypes.JSON, defaultValue: [] },
  fechaCreacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  fechaLimiteRespuesta: { type: DataTypes.DATE },
  fechaLimiteResolucion: { type: DataTypes.DATE },
  fechaPrimeraRespuesta: { type: DataTypes.DATE },
  fechaResolucion: { type: DataTypes.DATE },
  tiempoResolucionMinutos: { type: DataTypes.INTEGER },
  porcentajeSLA: { type: DataTypes.DECIMAL(5, 2) },
  comentarios: { type: DataTypes.JSON, defaultValue: [] },
  calificacion: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
  comentarioCalificacion: { type: DataTypes.TEXT },
}, {
  sequelize,
  modelName: 'Solicitud',
  tableName: 'solicitudes',
});

module.exports = Solicitud;
