'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/**
 * Consecutivo anual del folio (NUS). "numero" es el siguiente folio a entregar en ese año.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contadores', {
      id: id(Sequelize),
      numero: { type: Sequelize.INTEGER, allowNull: false },
      anio: { type: Sequelize.INTEGER, allowNull: false },
      tipo_contador_id: fk(Sequelize, 'tipos_contadores'),
      ...timestamps(Sequelize),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contadores');
  },
};
