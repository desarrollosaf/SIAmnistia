'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabla heredada del sistema anterior; solicitudes.resolucion_id apunta aquí.
    await queryInterface.createTable('resolucion', {
      id: id(Sequelize),
      recomendacion_id: fk(Sequelize, 'recomendacion'),
      descripcion: { type: Sequelize.STRING(191), allowNull: false },
      ...timestamps(Sequelize, { paranoid: true }),
    });

    await queryInterface.createTable('solicitudes', {
      id: id(Sequelize),
      // NUS (número único de solicitud) = folio/anio.
      folio: { type: Sequelize.BIGINT, allowNull: true },
      anio: { type: Sequelize.INTEGER, allowNull: true },
      estatus: { type: Sequelize.INTEGER, allowNull: true },
      solicitante_id: fk(Sequelize, 'personas'),
      beneficiario_id: fk(Sequelize, 'personas'),
      cprs: { type: Sequelize.STRING(191), allowNull: false },
      situacion_juridica_id: fk(Sequelize, 'situaciones_juridicas'),
      tipo_defensor_id: fk(Sequelize, 'tipos_defensores'),
      juzgado: { type: Sequelize.STRING(191), allowNull: false },
      procedimiento_abreviado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      perfil_criminologico_id: fk(Sequelize, 'perfiles_criminologicos'),
      resolucion_id: fk(Sequelize, 'resolucion', { allowNull: true }),
      ...timestamps(Sequelize, { paranoid: true }),
      turnado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      nivel_delito_id: fk(Sequelize, 'niveles_delitos', { allowNull: true }),
      razon_solicitud_id: fk(Sequelize, 'razones_solicitudes', { allowNull: true }),
      estatus_solicitud_id: { ...fk(Sequelize, 'estatus_solicitudes'), defaultValue: 1 },
      recomendacion_id: fk(Sequelize, 'recomendacion', { allowNull: true }),
      informacion_complementaria: { type: Sequelize.TEXT('long'), allowNull: true },
      // "aprovacion" con v: así se llama la columna en la base original.
      fecha_aprovacion: { type: Sequelize.DATE, allowNull: true },
      fecha_finalizo: { type: Sequelize.DATE, allowNull: true },
      observaciones_hechos: { type: Sequelize.TEXT('long'), allowNull: true },
      suspendida: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      otro_situacion_juridica: { type: Sequelize.STRING(191), allowNull: true },
      cadena_validacion: { type: Sequelize.TEXT, allowNull: true },
      cadena_validacion_codificada: { type: Sequelize.STRING(191), allowNull: true },
    });
    await queryInterface.addIndex('solicitudes', ['cadena_validacion_codificada']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('solicitudes');
    await queryInterface.dropTable('resolucion');
  },
};
