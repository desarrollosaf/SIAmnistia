'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: id(Sequelize),
      nombre: { type: Sequelize.STRING(191), allowNull: false },
      primer_apellido: { type: Sequelize.STRING(191), allowNull: false },
      segundo_apellido: { type: Sequelize.STRING(191), allowNull: true },
      email: { type: Sequelize.STRING(191), allowNull: false, unique: true },
      telefono: { type: Sequelize.STRING(191), allowNull: false },
      celular: { type: Sequelize.STRING(191), allowNull: false },
      email_verified_at: { type: Sequelize.DATE, allowNull: true },
      // Hash bcrypt. Los usuarios migrados de Laravel traen el prefijo $2y$, compatible.
      password: { type: Sequelize.STRING(191), allowNull: false },
      remember_token: { type: Sequelize.STRING(100), allowNull: true },
      ...timestamps(Sequelize),
      institucion_id: fk(Sequelize, 'instituciones'),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
