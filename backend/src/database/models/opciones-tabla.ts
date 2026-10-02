import type { TableOptions } from 'sequelize-typescript';

/**
 * Las tablas vienen del sistema Laravel: timestamps created_at/updated_at (y deleted_at en las
 * que usaban SoftDeletes). Se nombran igual en los atributos del modelo para que el JSON de la
 * API conserve los mismos nombres de campo que las columnas.
 */
export const OPCIONES_TABLA: TableOptions = {
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export const OPCIONES_TABLA_PARANOID: TableOptions = {
  ...OPCIONES_TABLA,
  paranoid: true,
  deletedAt: 'deleted_at',
};

/** Valores de *_type de las relaciones polimórficas, idénticos a los que guardaba Laravel. */
export const MORPH = {
  solicitud: 'App\\Models\\Solicitud',
  persona: 'App\\Models\\Persona',
  institucion: 'App\\Models\\Institucion',
  usuario: 'App\\Models\\User',
} as const;
