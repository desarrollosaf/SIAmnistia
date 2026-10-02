'use strict';

/**
 * Ajustes para una base importada del sistema Laravel en producción: ahí nunca se corrieron
 * las migraciones que agregaban la prevención de turnos ni el estatus CONCLUIDA, y el código
 * los usa. En una base nueva (creada por estas migraciones) todo esto ya existe y no hace nada.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columnas = await queryInterface.describeTable('solicitud_users');
    if (!columnas.prevencion) {
      await queryInterface.addColumn('solicitud_users', 'prevencion', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    const asegurarNombre = async (tabla, nombre) => {
      const [filas] = await queryInterface.sequelize.query(
        `SELECT id FROM \`${tabla}\` WHERE nombre = ?`,
        { replacements: [nombre] },
      );
      if (filas.length === 0) {
        const ahora = new Date();
        await queryInterface.bulkInsert(tabla, [{ nombre, created_at: ahora, updated_at: ahora }]);
      }
    };
    await asegurarNombre('estatus_turnos', 'PREVENCIÓN');
    await asegurarNombre('estatus_solicitudes', 'CONCLUIDA');

    const [registro] = await queryInterface.sequelize.query("SELECT id FROM roles WHERE name = 'Registro'");
    if (registro.length === 0) {
      const ahora = new Date();
      await queryInterface.bulkInsert('roles', [{ name: 'Registro', guard_name: 'web', created_at: ahora, updated_at: ahora }]);
    }
  },

  async down() {
    // No se revierte: quitar estatus o la columna dejaría registros apuntando a nada.
  },
};
