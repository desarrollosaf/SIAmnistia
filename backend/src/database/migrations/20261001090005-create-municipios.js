'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('municipios', {
      id: id(Sequelize),
      clave: { type: Sequelize.STRING(191), allowNull: false },
      municipio: { type: Sequelize.STRING(191), allowNull: false },
      entidad_id: fk(Sequelize, 'entidades'),
      clave_estado: { type: Sequelize.STRING(191), allowNull: false },
      ...timestamps(Sequelize, { paranoid: true }),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('municipios');
  },
};
