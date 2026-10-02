'use strict';

const { id, timestamps } = require('../migration-helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('entidades', {
      id: id(Sequelize),
      clave: { type: Sequelize.STRING(191), allowNull: false },
      entidad: { type: Sequelize.STRING(191), allowNull: false },
      abreviatura: { type: Sequelize.STRING(191), allowNull: false },
      ...timestamps(Sequelize),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('entidades');
  },
};
