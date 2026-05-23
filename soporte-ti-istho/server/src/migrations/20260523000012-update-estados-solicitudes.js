'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Paso 1: ampliar ENUM para aceptar los nuevos valores sin romper datos existentes
    await queryInterface.changeColumn('solicitudes', 'estado', {
      type: Sequelize.ENUM(
        'abierto', 'en_analisis', 'en_proceso',
        'pendiente_usuario', 'pendiente_externo',
        'resuelto', 'cerrado', 'cancelado', 'rechazado'
      ),
      allowNull: false,
      defaultValue: 'abierto',
    });

    // Paso 2: migrar datos — cancelado → rechazado
    await queryInterface.sequelize.query(
      "UPDATE solicitudes SET estado = 'rechazado' WHERE estado = 'cancelado'"
    );

    // Paso 3: limpiar ENUM — quitar cancelado
    await queryInterface.changeColumn('solicitudes', 'estado', {
      type: Sequelize.ENUM(
        'abierto', 'en_analisis', 'en_proceso',
        'pendiente_usuario', 'pendiente_externo',
        'resuelto', 'cerrado', 'rechazado'
      ),
      allowNull: false,
      defaultValue: 'abierto',
    });
  },

  async down(queryInterface, Sequelize) {
    // Paso 1: agregar cancelado de vuelta
    await queryInterface.changeColumn('solicitudes', 'estado', {
      type: Sequelize.ENUM(
        'abierto', 'en_analisis', 'en_proceso',
        'pendiente_usuario', 'pendiente_externo',
        'resuelto', 'cerrado', 'cancelado', 'rechazado'
      ),
      allowNull: false,
      defaultValue: 'abierto',
    });

    // Paso 2: revertir datos — rechazado → cancelado
    await queryInterface.sequelize.query(
      "UPDATE solicitudes SET estado = 'cancelado' WHERE estado = 'rechazado'"
    );

    // Paso 3: limpiar ENUM — quitar en_analisis y rechazado
    await queryInterface.changeColumn('solicitudes', 'estado', {
      type: Sequelize.ENUM(
        'abierto', 'en_proceso',
        'pendiente_usuario', 'pendiente_externo',
        'resuelto', 'cerrado', 'cancelado'
      ),
      allowNull: false,
      defaultValue: 'abierto',
    });
  },
};
