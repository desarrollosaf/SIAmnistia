import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { OPCIONES_TABLA } from './opciones-tabla';
import { Municipio } from './municipio.model';

@Table({ tableName: 'entidades', ...OPCIONES_TABLA })
export class Entidad extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare clave: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare entidad: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare abreviatura: string;

  @HasMany(() => Municipio)
  declare municipios: Municipio[];
}
