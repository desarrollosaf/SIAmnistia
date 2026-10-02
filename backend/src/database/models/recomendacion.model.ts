import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { OPCIONES_TABLA } from './opciones-tabla';

@Table({ tableName: 'recomendacion', ...OPCIONES_TABLA })
export class Recomendacion extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare estado: string;
}
