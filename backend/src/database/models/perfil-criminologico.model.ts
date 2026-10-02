import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { OPCIONES_TABLA } from './opciones-tabla';

@Table({ tableName: 'perfiles_criminologicos', ...OPCIONES_TABLA })
export class PerfilCriminologico extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare nombre: string;
}
