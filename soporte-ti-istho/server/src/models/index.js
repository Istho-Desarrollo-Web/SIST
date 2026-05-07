const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Empleado = require('./Empleado');
const Solicitud = require('./Solicitud');
const Auditoria = require('./Auditoria');

// Asociaciones
Empleado.hasMany(Solicitud, { foreignKey: 'empleado_id', as: 'solicitudes' });
Solicitud.belongsTo(Empleado, { foreignKey: 'empleado_id', as: 'empleado' });

Usuario.hasMany(Solicitud, { foreignKey: 'tecnicoAsignado', as: 'ticketsAsignados' });
Solicitud.belongsTo(Usuario, { foreignKey: 'tecnicoAsignado', as: 'tecnico' });

Usuario.hasMany(Auditoria, { foreignKey: 'usuario_id', as: 'auditorias' });
Auditoria.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

module.exports = { sequelize, Usuario, Empleado, Solicitud, Auditoria };
