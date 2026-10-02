'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delitos', {
      id: id(Sequelize),
      delito: { type: Sequelize.STRING(191), allowNull: false },
      obligatorio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps(Sequelize, { paranoid: true }),
    });

    await queryInterface.createTable('modalidades_delitos', {
      id: id(Sequelize),
      delito_id: fk(Sequelize, 'delitos'),
      nombre: { type: Sequelize.TEXT, allowNull: false },
      ...timestamps(Sequelize, { paranoid: true }),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('modalidades_delitos');
    await queryInterface.dropTable('delitos');
  },
};
