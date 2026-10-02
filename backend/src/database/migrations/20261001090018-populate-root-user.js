'use strict';

const bcrypt = require('bcryptjs');

/**
 * Crea el usuario ROOT (Super usuario del Poder Legislativo) cuando la tabla users está vacía,
 * igual que la migración populate_root_user del sistema anterior. La contraseña sale de
 * ROOT_PASSWORD en el .env; cámbiala desde Administración > Usuarios al primer ingreso.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    const [usuarios] = await queryInterface.sequelize.query('SELECT COUNT(*) AS total FROM users');
    if (Number(usuarios[0].total) > 0) return;

    const [legislativo] = await queryInterface.sequelize.query(
      "SELECT id FROM instituciones WHERE nombre_institucion = 'PODER LEGISLATIVO DEL ESTADO DE MÉXICO'",
    );
    const [superUsuario] = await queryInterface.sequelize.query("SELECT id FROM roles WHERE name = 'Super usuario'");
    if (legislativo.length === 0 || superUsuario.length === 0) return;

    const password = process.env.ROOT_PASSWORD;
    if (!password) {
      throw new Error('Define ROOT_PASSWORD en backend/.env para crear el usuario ROOT.');
    }

    const ahora = new Date();
    await queryInterface.bulkInsert('users', [{
      nombre: 'ROOT',
      primer_apellido: 'SUPER',
      segundo_apellido: 'USUARIO',
      email: 'root@amnistia.gob.mx',
      telefono: '0000000000',
      celular: '0000000000',
      email_verified_at: ahora,
      password: await bcrypt.hash(password, 10),
      institucion_id: legislativo[0].id,
      created_at: ahora,
      updated_at: ahora,
    }]);

    const [root] = await queryInterface.sequelize.query("SELECT id FROM users WHERE email = 'root@amnistia.gob.mx'");
    await queryInterface.bulkInsert('model_has_roles', [{
      role_id: superUsuario[0].id,
      model_type: 'App\\Models\\User',
      model_id: root[0].id,
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'root@amnistia.gob.mx' });
  },
};
