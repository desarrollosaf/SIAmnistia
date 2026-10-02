'use strict';

/**
 * Utilidades compartidas por las migraciones. Vive fuera de migrations/ porque sequelize-cli
 * intenta ejecutar como migración cualquier .js de esa carpeta.
 *
 * El esquema replica tal cual las tablas del sistema Laravel de amnistía (mismos nombres de
 * tabla y columna) para que un respaldo de esa base se pueda importar sin transformaciones.
 * createTable de Sequelize genera "CREATE TABLE IF NOT EXISTS", así que correr las migraciones
 * sobre una base ya importada no truena: solo agrega lo que falte.
 */

function id(Sequelize) {
  return {
    type: Sequelize.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  };
}

function timestamps(Sequelize, { paranoid = false } = {}) {
  const columnas = {
    created_at: { type: Sequelize.DATE, allowNull: true, defaultValue: Sequelize.NOW },
    updated_at: { type: Sequelize.DATE, allowNull: true, defaultValue: Sequelize.NOW },
  };
  if (paranoid) {
    columnas.deleted_at = { type: Sequelize.DATE, allowNull: true };
  }
  return columnas;
}

function fk(Sequelize, tabla, { allowNull = false, onDelete = 'RESTRICT' } = {}) {
  return {
    type: Sequelize.BIGINT.UNSIGNED,
    allowNull,
    references: { model: tabla, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete,
  };
}

/** Inserta las filas solo si la tabla está vacía (no duplica catálogos de una base importada). */
async function insertarSiVacia(queryInterface, tabla, filas) {
  const [resultado] = await queryInterface.sequelize.query(`SELECT COUNT(*) AS total FROM \`${tabla}\``);
  if (Number(resultado[0].total) > 0 || filas.length === 0) return;
  const ahora = new Date();
  await queryInterface.bulkInsert(
    tabla,
    filas.map((fila) => ({ created_at: ahora, updated_at: ahora, ...fila })),
  );
}

module.exports = { id, timestamps, fk, insertarSiVacia };
