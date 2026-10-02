import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { MORPH } from './opciones-tabla';

// Pivote usuario-rol de spatie/laravel-permission (llave compuesta, sin timestamps).
@Table({ tableName: 'model_has_roles', timestamps: false })
export class ModelHasRole extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true })
  declare role_id: number;

  @Column({ type: DataType.STRING(191), primaryKey: true, defaultValue: MORPH.usuario })
  declare model_type: string;

  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true })
  declare model_id: number;
}
