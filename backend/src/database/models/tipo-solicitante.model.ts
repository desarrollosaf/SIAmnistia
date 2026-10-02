import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { OPCIONES_TABLA_PARANOID } from './opciones-tabla';

@Table({ tableName: 'tipo_solicitantes', ...OPCIONES_TABLA_PARANOID })
export class TipoSolicitante extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare nombre: string;
}
