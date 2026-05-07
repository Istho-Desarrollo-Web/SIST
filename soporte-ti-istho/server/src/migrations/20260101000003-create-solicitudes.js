'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('solicitudes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      numero: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      empleado_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'empleados', key: 'id' },
        onDelete: 'RESTRICT',
      },
      tipoSolicitud: {
        type: Sequelize.ENUM(
          'soporte_hardware', 'soporte_software', 'redes_conectividad', 'accesos_permisos',
          'correo_electronico', 'impresoras', 'telefonia', 'capacitacion', 'otro'
        ),
        allowNull: false,
      },
      prioridad: {
        type: Sequelize.ENUM('critica', 'alta', 'media', 'baja'),
        allowNull: false,
        defaultValue: 'media',
      },
      descripcion: { type: Sequelize.TEXT, allowNull: false },
      estado: {
        type: Sequelize.ENUM('abierto', 'en_proceso', 'pendiente_usuario', 'pendiente_externo', 'resuelto', 'cerrado', 'cancelado'),
        allowNull: false,
        defaultValue: 'abierto',
      },
      tecnicoAsignado: {
        type: Sequelize.INTEGER,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
      },
      archivosAdjuntos: { type: Sequelize.JSON, defaultValue: [] },
      fechaCreacion: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      fechaLimiteRespuesta: { type: Sequelize.DATE },
      fechaLimiteResolucion: { type: Sequelize.DATE },
      fechaPrimeraRespuesta: { type: Sequelize.DATE },
      fechaResolucion: { type: Sequelize.DATE },
      tiempoResolucionMinutos: { type: Sequelize.INTEGER },
      porcentajeSLA: { type: Sequelize.DECIMAL(5, 2) },
      comentarios: { type: Sequelize.JSON, defaultValue: [] },
      calificacion: { type: Sequelize.INTEGER },
      comentarioCalificacion: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('solicitudes', ['numero']);
    await queryInterface.addIndex('solicitudes', ['estado']);
    await queryInterface.addIndex('solicitudes', ['prioridad']);
    await queryInterface.addIndex('solicitudes', ['tecnicoAsignado']);
    await queryInterface.addIndex('solicitudes', ['fechaCreacion']);
    await queryInterface.addIndex('solicitudes', ['fechaLimiteResolucion']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('solicitudes');
  },
};
