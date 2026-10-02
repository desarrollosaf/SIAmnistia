import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { MORPH, OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { Entidad } from './entidad.model';
import { Municipio } from './municipio.model';

@Table({ tableName: 'domicilios', ...OPCIONES_TABLA_PARANOID })
export class Domicilio extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.BIGINT, allowNull: false })
  declare domiciliable_id: number;

  @Column({ type: DataType.STRING(191), allowNull: false, defaultValue: MORPH.persona })
  declare domiciliable_type: string;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare calle: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare num_ext: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare num_int: string | null;

  @ForeignKey(() => Entidad)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare entidad_id: number | null;

  @BelongsTo(() => Entidad)
  declare entidad: Entidad | null;

  @ForeignKey(() => Municipio)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare municipio_id: number | null;

  @BelongsTo(() => Municipio)
  declare municipio: Municipio | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare codigo_postal: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare colonia: string | null;
}
