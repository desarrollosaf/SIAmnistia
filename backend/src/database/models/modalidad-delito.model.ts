import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { Delito } from './delito.model';

@Table({ tableName: 'modalidades_delitos', ...OPCIONES_TABLA_PARANOID })
export class ModalidadDelito extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Delito)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare delito_id: number;

  @BelongsTo(() => Delito)
  declare delito: Delito;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare nombre: string;
}
