'use strict';

const { id, timestamps, fk } = require('../migration-helpers');

/**
 * Datos del beneficiario que pide el formato "Solicitud de amnistía" y que el registro público
 * no capturaba (comunidad, intérprete, discapacidad, segunda instancia, amparo, etc.).
 * Es una fila por solicitud (solicitud_id único). Todas las columnas son opcionales porque las
 * solicitudes anteriores no tienen estos datos.
 *
 * Los "sí / no" son BOOLEAN (NULL = sin responder). Las opciones únicas (comunidad, situación de
 * libertad, resolución de la apelación) son texto con valores fijos para no depender de ENUM.
 * Los archivos de la documentación (identificación, acta, etc.) siguen en la tabla documentos.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('solicitud_datos_formato', {
      id: id(Sequelize),
      solicitud_id: { ...fk(Sequelize, 'solicitudes', { onDelete: 'CASCADE' }), unique: true },

      // Datos del beneficiario
      estado_se_encuentra: { type: Sequelize.STRING(191), allowNull: true },
      fecha_comision_delito: { type: Sequelize.DATEONLY, allowNull: true },
      // INDIGENA | AFROMEXICANA | NINGUNA
      comunidad: { type: Sequelize.STRING(20), allowNull: true },
      comunidad_indigena_cual: { type: Sequelize.STRING(191), allowNull: true },
      interprete: { type: Sequelize.BOOLEAN, allowNull: true },
      discapacidad: { type: Sequelize.BOOLEAN, allowNull: true },
      discapacidad_cual: { type: Sequelize.STRING(191), allowNull: true },
      enfermedad_cronica: { type: Sequelize.BOOLEAN, allowNull: true },
      enfermedad_cronica_cual: { type: Sequelize.STRING(191), allowNull: true },
      ocupacion_previa: { type: Sequelize.TEXT, allowNull: true },
      dependientes_economicos: { type: Sequelize.TEXT, allowNull: true },

      // Libertad. PRIVADO | NO_PRIVADO | MEDIDA_SEGURIDAD
      situacion_libertad: { type: Sequelize.STRING(20), allowNull: true },
      medida_seguridad_cual: { type: Sequelize.STRING(191), allowNull: true },

      // Situación jurídica "investigada(o) por el Ministerio Público"
      investigacion_numero: { type: Sequelize.STRING(191), allowNull: true },
      investigacion_agencia: { type: Sequelize.STRING(191), allowNull: true },

      // Sentencia
      pena_anios: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      pena_meses: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      multa: { type: Sequelize.BOOLEAN, allowNull: true },
      multa_monto: { type: Sequelize.DECIMAL(14, 2), allowNull: true },

      // Segunda instancia
      apelacion: { type: Sequelize.BOOLEAN, allowNull: true },
      apelacion_toca: { type: Sequelize.STRING(191), allowNull: true },
      apelacion_tribunal: { type: Sequelize.STRING(191), allowNull: true },
      // CONFIRMO | MODIFICO | REVOCO
      apelacion_resolucion: { type: Sequelize.STRING(20), allowNull: true },
      pena_modificada: { type: Sequelize.BOOLEAN, allowNull: true },
      pena_compurgar_anios: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      pena_compurgar_meses: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },

      // Amparo
      amparo: { type: Sequelize.BOOLEAN, allowNull: true },
      amparo_efectos: { type: Sequelize.STRING(191), allowNull: true },
      amparo_concedido: { type: Sequelize.BOOLEAN, allowNull: true },

      // Otros procesos
      sentenciado_antes_mismo_delito: { type: Sequelize.BOOLEAN, allowNull: true },
      otro_proceso: { type: Sequelize.BOOLEAN, allowNull: true },
      otro_proceso_expediente: { type: Sequelize.STRING(191), allowNull: true },
      otro_proceso_juzgado: { type: Sequelize.STRING(191), allowNull: true },

      // Documentación: descripción de "Otro:" (los archivos van en la tabla documentos)
      documento_otro: { type: Sequelize.STRING(191), allowNull: true },

      ...timestamps(Sequelize),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('solicitud_datos_formato');
  },
};
