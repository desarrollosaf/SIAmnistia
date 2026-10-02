import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { Entidad } from './entidad.model';

@Table({ tableName: 'municipios', ...OPCIONES_TABLA_PARANOID })
export class Municipio extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare clave: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare municipio: string;

  @ForeignKey(() => Entidad)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare entidad_id: number;

  @BelongsTo(() => Entidad)
  declare entidad: Entidad;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare clave_estado: string;
}
