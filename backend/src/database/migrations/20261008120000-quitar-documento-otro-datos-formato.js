'use strict';

/**
 * Los documentos "Otro" ahora se guardan en la tabla documentos (uno por archivo, con su propia
 * descripción), así que la columna única documento_otro de solicitud_datos_formato ya no se usa.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('solicitud_datos_formato', 'documento_otro');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('solicitud_datos_formato', 'documento_otro', {
      type: Sequelize.STRING(191),
      allowNull: true,
    });
  },
};
