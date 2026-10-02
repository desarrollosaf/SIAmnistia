'use strict';

const { id, timestamps } = require('../migration-helpers');

/**
 * Mismas tablas que usaba spatie/laravel-permission ("roles" y "model_has_roles") para que las
 * asignaciones de rol de la base anterior sigan funcionando sin migrar datos.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: id(Sequelize),
      name: { type: Sequelize.STRING(191), allowNull: false },
      guard_name: { type: Sequelize.STRING(191), allowNull: false, defaultValue: 'web' },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('model_has_roles', {
      role_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Siempre 'App\Models\User': se conserva por compatibilidad con la base anterior.
      model_type: { type: Sequelize.STRING(191), allowNull: false, primaryKey: true },
      model_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, primaryKey: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('model_has_roles');
    await queryInterface.dropTable('roles');
  },
};
