'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('empleados', [
      {
        identificacion: '1000000010',
        nombreCompleto: 'Juan Pérez',
        area: 'Operaciones',
        cargo: 'Auxiliar Logístico',
        email: 'juan.perez@istho.com.co',
        activo: true,
        created_at: now,
        updated_at: now,
      },
      {
        identificacion: '1000000011',
        nombreCompleto: 'Ana García',
        area: 'Administrativa',
        cargo: 'Asistente',
        email: 'ana.garcia@istho.com.co',
        activo: true,
        created_at: now,
        updated_at: now,
      },
      {
        identificacion: '1000000012',
        nombreCompleto: 'Pedro López',
        area: 'Almacén',
        cargo: 'Coordinador Bodega',
        email: 'pedro.lopez@istho.com.co',
        activo: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('empleados', {
      identificacion: ['1000000010', '1000000011', '1000000012'],
    });
  },
};
