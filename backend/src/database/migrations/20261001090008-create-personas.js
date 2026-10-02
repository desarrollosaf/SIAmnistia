'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/**
 * Solicitante (peticionario) y beneficiario se guardan en la misma tabla; tipo_persona_id
 * distingue cuál es cuál. Para persona jurídica colectiva, "nombre" guarda el nombre de la
 * institución y "curp" su RFC (así lo dejaba el sistema anterior).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('personas', {
      id: id(Sequelize),
      nombre: { type: Sequelize.STRING(191), allowNull: true },
      primer_apellido: { type: Sequelize.STRING(191), allowNull: true },
      segundo_apellido: { type: Sequelize.STRING(191), allowNull: true },
      email: { type: Sequelize.STRING(191), allowNull: true },
      telefono: { type: Sequelize.STRING(191), allowNull: true },
      celular: { type: Sequelize.STRING(191), allowNull: true },
      ocupacion: { type: Sequelize.STRING(191), allowNull: true },
      nacionalidad: { type: Sequelize.STRING(191), allowNull: true },
      fecha_nacimiento: { type: Sequelize.DATEONLY, allowNull: true },
      genero_id: fk(Sequelize, 'generos', { allowNull: true }),
      tipo_persona_id: fk(Sequelize, 'tipos_personas', { allowNull: true }),
      ...timestamps(Sequelize, { paranoid: true }),
      curp: { type: Sequelize.STRING(191), allowNull: true },
      relacion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      parentesco_id: fk(Sequelize, 'parentescos', { allowNull: true }),
      parentesco_otro: { type: Sequelize.STRING(191), allowNull: true },
      genero_otro: { type: Sequelize.STRING(191), allowNull: true },
    });

    // Domicilio polimórfico: domiciliable_type guarda 'App\Models\Persona' como en Laravel.
    await queryInterface.createTable('domicilios', {
      id: id(Sequelize),
      domiciliable_id: { type: Sequelize.BIGINT, allowNull: false },
      domiciliable_type: { type: Sequelize.STRING(191), allowNull: false },
      calle: { type: Sequelize.STRING(191), allowNull: true },
      num_ext: { type: Sequelize.STRING(191), allowNull: true },
      num_int: { type: Sequelize.STRING(191), allowNull: true },
      entidad_id: fk(Sequelize, 'entidades', { allowNull: true }),
      municipio_id: fk(Sequelize, 'municipios', { allowNull: true }),
      codigo_postal: { type: Sequelize.STRING(191), allowNull: true },
      colonia: { type: Sequelize.STRING(191), allowNull: true },
      ...timestamps(Sequelize, { paranoid: true }),
    });
    await queryInterface.addIndex('domicilios', ['domiciliable_type', 'domiciliable_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('domicilios');
    await queryInterface.dropTable('personas');
  },
};
