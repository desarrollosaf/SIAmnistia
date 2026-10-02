'use strict';

const { id, timestamps } = require('../migration-helpers');

/**
 * Suspensión de términos: periodos en los que no corre el plazo de 72 horas para que una
 * institución acuse de recibido un turno. Polimórfica: aplica a una solicitud o a toda una
 * institución (suspencion_type = 'App\Models\Solicitud' | 'App\Models\Institucion').
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('suspenciones', {
      id: id(Sequelize),
      fecha_inicio: { type: Sequelize.DATE, allowNull: false },
      fecha_fin: { type: Sequelize.DATE, allowNull: false },
      justificacion: { type: Sequelize.STRING(191), allowNull: false },
      ...timestamps(Sequelize, { paranoid: true }),
      suspencion_id: { type: Sequelize.BIGINT, allowNull: false },
      suspencion_type: { type: Sequelize.STRING(191), allowNull: false },
    });
    await queryInterface.addIndex('suspenciones', ['suspencion_type', 'suspencion_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('suspenciones');
  },
};
