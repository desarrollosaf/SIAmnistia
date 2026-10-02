import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { MORPH, OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { Usuario } from './usuario.model';
import { Suspencion } from './suspencion.model';

@Table({ tableName: 'instituciones', ...OPCIONES_TABLA_PARANOID })
export class Institucion extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare nombre_institucion: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare email_institucion: string;

  @HasMany(() => Usuario)
  declare usuarios: Usuario[];

  @HasMany(() => Suspencion, {
    foreignKey: 'suspencion_id',
    constraints: false,
    scope: { suspencion_type: MORPH.institucion },
  })
  declare suspenciones: Suspencion[];
}
