import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { OPCIONES_TABLA_PARANOID } from './opciones-tabla';

@Table({ tableName: 'razones_solicitudes', ...OPCIONES_TABLA_PARANOID })
export class RazonSolicitud extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare clave: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare valor: string;
}
