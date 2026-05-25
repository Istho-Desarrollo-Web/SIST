const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Empleado = require('./Empleado');
const Solicitud = require('./Solicitud');
const Auditoria = require('./Auditoria');
const Formulario = require('./Formulario');
const FormularioCampo = require('./FormularioCampo');
const FormularioSeccion = require('./FormularioSeccion');
const FormularioPdfPlantilla = require('./FormularioPdfPlantilla');
const FormularioPdfMapeo = require('./FormularioPdfMapeo');
const FormularioRespuesta = require('./FormularioRespuesta');
const RespuestaCampo = require('./RespuestaCampo');
const FormularioPdfGenerado = require('./FormularioPdfGenerado');

// Solicitudes
Empleado.hasMany(Solicitud, { foreignKey: 'empleado_id', as: 'solicitudes' });
Solicitud.belongsTo(Empleado, { foreignKey: 'empleado_id', as: 'empleado' });
Usuario.hasMany(Solicitud, { foreignKey: 'tecnicoAsignado', as: 'ticketsAsignados' });
Solicitud.belongsTo(Usuario, { foreignKey: 'tecnicoAsignado', as: 'tecnico' });
Usuario.hasMany(Auditoria, { foreignKey: 'usuario_id', as: 'auditorias' });
Auditoria.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Formularios
Formulario.belongsTo(Usuario, { foreignKey: 'creado_por', as: 'creador' });
Usuario.hasMany(Formulario, { foreignKey: 'creado_por', as: 'formularios' });

Formulario.hasMany(FormularioCampo, { foreignKey: 'formulario_id', as: 'campos' });
FormularioCampo.belongsTo(Formulario, { foreignKey: 'formulario_id', as: 'formulario' });

Formulario.hasMany(FormularioSeccion, { foreignKey: 'formulario_id', as: 'secciones' });
FormularioSeccion.belongsTo(Formulario, { foreignKey: 'formulario_id', as: 'formulario' });

FormularioSeccion.hasMany(FormularioCampo, { foreignKey: 'seccion_id', as: 'campos' });
FormularioCampo.belongsTo(FormularioSeccion, { foreignKey: 'seccion_id', as: 'seccion' });

Formulario.hasMany(FormularioPdfPlantilla, { foreignKey: 'formulario_id', as: 'plantillas' });
FormularioPdfPlantilla.belongsTo(Formulario, { foreignKey: 'formulario_id', as: 'formulario' });

FormularioPdfPlantilla.hasMany(FormularioPdfMapeo, { foreignKey: 'plantilla_id', as: 'mapeos' });
FormularioPdfMapeo.belongsTo(FormularioPdfPlantilla, { foreignKey: 'plantilla_id', as: 'plantilla' });

FormularioCampo.hasMany(FormularioPdfMapeo, { foreignKey: 'campo_id', as: 'mapeos' });
FormularioPdfMapeo.belongsTo(FormularioCampo, { foreignKey: 'campo_id', as: 'campo' });

Formulario.hasMany(FormularioRespuesta, { foreignKey: 'formulario_id', as: 'respuestas' });
FormularioRespuesta.belongsTo(Formulario, { foreignKey: 'formulario_id', as: 'formulario' });

FormularioRespuesta.hasMany(RespuestaCampo, { foreignKey: 'respuesta_id', as: 'campos' });
RespuestaCampo.belongsTo(FormularioRespuesta, { foreignKey: 'respuesta_id', as: 'respuesta' });

FormularioRespuesta.hasOne(FormularioPdfGenerado, { foreignKey: 'respuesta_id', as: 'pdf' });
FormularioPdfGenerado.belongsTo(FormularioRespuesta, { foreignKey: 'respuesta_id', as: 'respuesta' });

FormularioRespuesta.belongsTo(Usuario, { foreignKey: 'respondido_por', as: 'respondedor' });
Usuario.hasMany(FormularioRespuesta, { foreignKey: 'respondido_por', as: 'respuestasFormularios' });

module.exports = {
  sequelize,
  Usuario, Empleado, Solicitud, Auditoria,
  Formulario, FormularioCampo, FormularioSeccion,
  FormularioPdfPlantilla, FormularioPdfMapeo,
  FormularioRespuesta, RespuestaCampo, FormularioPdfGenerado,
};
