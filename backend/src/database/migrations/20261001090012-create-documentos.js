'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/**
 * Documentos polimórficos (documentable_type = 'App\Models\Solicitud' como en Laravel).
 * "ruta" es relativa a la carpeta uploads/ del backend (antes storage/app/ de Laravel), así que
 * los archivos existentes se migran copiando storage/app/solicitud a backend/uploads/solicitud.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('documentos', {
      id: id(Sequelize),
      documentable_id: { type: Sequelize.BIGINT, allowNull: false },
      documentable_type: { type: Sequelize.STRING(191), allowNull: false },
      ruta: { type: Sequelize.STRING(191), allowNull: false },
      nombre_documento: { type: Sequelize.STRING(191), allowNull: false },
      descripcion: { type: Sequelize.STRING(191), allowNull: false },
      tamano: { type: Sequelize.STRING(191), allowNull: false },
      ...timestamps(Sequelize, { paranoid: true }),
      nombre: { type: Sequelize.STRING(191), allowNull: false },
      user_id: fk(Sequelize, 'users', { allowNull: true, onDelete: 'SET NULL' }),
      uuid: { type: Sequelize.CHAR(36), allowNull: false },
      ficha_tecnica: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    });
    await queryInterface.addIndex('documentos', ['documentable_type', 'documentable_id']);
    await queryInterface.addIndex('documentos', ['uuid']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('documentos');
  },
};
