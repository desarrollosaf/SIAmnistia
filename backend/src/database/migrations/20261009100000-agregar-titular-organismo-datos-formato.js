'use strict';

/**
 * Titular o representante legal del organismo (peticionario persona jurídica colectiva): el
 * formato "Solicitud de amnistía" de organismos públicos defensores de Derechos Humanos empieza
 * con su nombre y lo firma. En personas solo se guarda el nombre del organismo y su RFC.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tabla = 'solicitud_datos_formato';
    await queryInterface.addColumn(tabla, 'titular_nombre', { type: Sequelize.STRING(191), allowNull: true });
    await queryInterface.addColumn(tabla, 'titular_primer_apellido', { type: Sequelize.STRING(191), allowNull: true });
    await queryInterface.addColumn(tabla, 'titular_segundo_apellido', { type: Sequelize.STRING(191), allowNull: true });
  },

  async down(queryInterface) {
    const tabla = 'solicitud_datos_formato';
    await queryInterface.removeColumn(tabla, 'titular_segundo_apellido');
    await queryInterface.removeColumn(tabla, 'titular_primer_apellido');
    await queryInterface.removeColumn(tabla, 'titular_nombre');
  },
};
