'use strict';

const { id, timestamps } = require('../migration-helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('instituciones', {
      id: id(Sequelize),
      nombre_institucion: { type: Sequelize.STRING(191), allowNull: false },
      email_institucion: { type: Sequelize.STRING(191), allowNull: false },
      ...timestamps(Sequelize, { paranoid: true }),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('instituciones');
  },
};
