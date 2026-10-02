'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('solicitudes_carpetas', {
      id: id(Sequelize),
      carpeta: { type: Sequelize.STRING(191), allowNull: false },
      tomo: { type: Sequelize.STRING(191), allowNull: true },
      foja: { type: Sequelize.STRING(191), allowNull: true },
      conoce_ubicacion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      solicitud_id: fk(Sequelize, 'solicitudes', { allowNull: true, onDelete: 'CASCADE' }),
      ...timestamps(Sequelize, { paranoid: true }),
      razon_solicitud_id: { ...fk(Sequelize, 'razones_solicitudes'), defaultValue: 1 },
    });

    await queryInterface.createTable('carpetas_delitos', {
      id: id(Sequelize),
      solicitud_carpeta_id: fk(Sequelize, 'solicitudes_carpetas', { allowNull: true, onDelete: 'CASCADE' }),
      ...timestamps(Sequelize, { paranoid: true }),
      // Texto ya armado "DELITO - MODALIDAD" (o el delito libre cuando es "OTRO").
      delito: { type: Sequelize.TEXT, allowNull: false },
      delito_id: fk(Sequelize, 'delitos', { allowNull: true }),
      modalidad_id: fk(Sequelize, 'modalidades_delitos', { allowNull: true }),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('carpetas_delitos');
    await queryInterface.dropTable('solicitudes_carpetas');
  },
};
