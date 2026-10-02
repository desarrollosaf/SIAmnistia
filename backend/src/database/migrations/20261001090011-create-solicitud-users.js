'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/**
 * Turnos: a qué usuario (y por tanto a qué institución) se envió una solicitud para que
 * emita su opinión consultiva, y en qué estatus va ese turno.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('solicitud_users', {
      id: id(Sequelize),
      solicitud_id: fk(Sequelize, 'solicitudes', { onDelete: 'CASCADE' }),
      user_id: fk(Sequelize, 'users'),
      ...timestamps(Sequelize, { paranoid: true }),
      estatus_turno_id: { ...fk(Sequelize, 'estatus_turnos'), defaultValue: 1 },
      recomendacion_id: fk(Sequelize, 'recomendacion', { allowNull: true }),
      fecha_evaluacion: { type: Sequelize.DATE, allowNull: true },
      fecha_termino: { type: Sequelize.DATE, allowNull: true },
      prevencion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('solicitud_users');
  },
};
