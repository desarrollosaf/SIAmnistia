import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { OPCIONES_TABLA } from './opciones-tabla';

// Tabla "roles" de spatie/laravel-permission; "name" es el nombre visible del rol.
@Table({ tableName: 'roles', ...OPCIONES_TABLA })
export class Rol extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(191), allowNull: false, defaultValue: 'web' })
  declare guard_name: string;
}
