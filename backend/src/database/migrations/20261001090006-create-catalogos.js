'use strict';

const { id, timestamps } = require('../migration-helpers');

/**
 * Catálogos simples del formulario de solicitud. Cada uno conserva el nombre de tabla y de
 * columna ("nombre", "valor", "estado") que tenía en el sistema Laravel.
 */
const CATALOGOS_NOMBRE = [
  'generos',
  'tipos_personas',
  'situaciones_juridicas',
  'tipos_defensores',
  'perfiles_criminologicos',
  'niveles_delitos',
  'estatus_solicitudes',
  'estatus_turnos',
  'tipos_contadores',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tabla of CATALOGOS_NOMBRE) {
      await queryInterface.createTable(tabla, {
        id: id(Sequelize),
        nombre: { type: Sequelize.STRING(191), allowNull: false },
        ...timestamps(Sequelize),
      });
    }

    await queryInterface.createTable('tipo_solicitantes', {
      id: id(Sequelize),
      nombre: { type: Sequelize.STRING(191), allowNull: false },
      ...timestamps(Sequelize, { paranoid: true }),
    });

    for (const tabla of ['parentescos', 'razones_solicitudes']) {
      await queryInterface.createTable(tabla, {
        id: id(Sequelize),
        clave: { type: Sequelize.STRING(191), allowNull: false },
        valor: { type: Sequelize.STRING(191), allowNull: false },
        ...timestamps(Sequelize, { paranoid: true }),
      });
    }

    await queryInterface.createTable('recomendacion', {
      id: id(Sequelize),
      estado: { type: Sequelize.STRING(191), allowNull: false },
      ...timestamps(Sequelize),
    });
  },

  async down(queryInterface) {
    const tablas = [...CATALOGOS_NOMBRE, 'tipo_solicitantes', 'parentescos', 'razones_solicitudes', 'recomendacion'];
    for (const tabla of tablas.reverse()) {
      await queryInterface.dropTable(tabla);
    }
  },
};
