'use strict';

const { id, timestamps } = require('../migration-helpers');

/**
 * Tokens de la consulta pública de solicitudes: el peticionario captura su correo, se le envía
 * una liga con el token y con ella ve el estatus de sus solicitudes. En Laravel vivían en el
 * cache; aquí se guardan en tabla para que sobrevivan a un reinicio del servidor.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tokens_consulta', {
      id: id(Sequelize),
      token: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      email: { type: Sequelize.STRING(191), allowNull: false },
      expira_en: { type: Sequelize.DATE, allowNull: false },
      ...timestamps(Sequelize),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tokens_consulta');
  },
};
