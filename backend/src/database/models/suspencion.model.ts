import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { OPCIONES_TABLA_PARANOID } from './opciones-tabla';

/** Suspensión de términos de una solicitud o de una institución completa (polimórfica). */
@Table({ tableName: 'suspenciones', ...OPCIONES_TABLA_PARANOID })
export class Suspencion extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.DATE, allowNull: false })
  declare fecha_inicio: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare fecha_fin: Date;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare justificacion: string;

  @Column({ type: DataType.BIGINT, allowNull: false })
  declare suspencion_id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare suspencion_type: string;
}
