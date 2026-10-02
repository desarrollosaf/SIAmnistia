import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { OPCIONES_TABLA } from './opciones-tabla';
import { TipoContador } from './tipo-contador.model';

/** Consecutivo anual del folio; "numero" es el siguiente folio que se va a entregar. */
@Table({ tableName: 'contadores', ...OPCIONES_TABLA })
export class Contador extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare numero: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare anio: number;

  @ForeignKey(() => TipoContador)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare tipo_contador_id: number;

  @BelongsTo(() => TipoContador)
  declare tipo_contador: TipoContador;
}
