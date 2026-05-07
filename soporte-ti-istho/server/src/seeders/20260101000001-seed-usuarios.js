'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const hash = (pwd) => bcrypt.hashSync(pwd, 10);
    const now = new Date();

    await queryInterface.bulkInsert('usuarios', [
      {
        identificacion: '1000000001',
        nombre: 'Administrador Sistema',
        email: 'admin@istho.com.co',
        password_hash: hash('Admin2026*'),
        rol: 'admin',
        area: 'Tecnología',
        activo: true,
        intentos_fallidos: 0,
        created_at: now,
        updated_at: now,
      },
      {
        identificacion: '1000000002',
        nombre: 'Carlos Técnico',
        email: 'carlos.tecnico@istho.com.co',
        password_hash: hash('Tecnico2026*'),
        rol: 'tecnico',
        area: 'Tecnología',
        especialidad: 'Hardware',
        capacidad_max: 10,
        activo: true,
        intentos_fallidos: 0,
        created_at: now,
        updated_at: now,
      },
      {
        identificacion: '1000000003',
        nombre: 'María Técnico',
        email: 'maria.tecnico@istho.com.co',
        password_hash: hash('Tecnico2026*'),
        rol: 'tecnico',
        area: 'Tecnología',
        especialidad: 'Software',
        capacidad_max: 10,
        activo: true,
        intentos_fallidos: 0,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuarios', {
      email: ['admin@istho.com.co', 'carlos.tecnico@istho.com.co', 'maria.tecnico@istho.com.co'],
    });
  },
};
