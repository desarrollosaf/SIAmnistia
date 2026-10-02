import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, BelongsToMany,
} from 'sequelize-typescript';
import { MORPH, OPCIONES_TABLA } from './opciones-tabla';
import { Institucion } from './institucion.model';
import { Rol } from './rol.model';
import { ModelHasRole } from './model-has-role.model';

// Tabla "users": usuarios internos (Poder Legislativo y las instituciones a las que se turna).
@Table({
  tableName: 'users',
  ...OPCIONES_TABLA,
  defaultScope: { attributes: { exclude: ['password', 'remember_token'] } },
  scopes: { conPassword: { attributes: { include: ['password'] } } },
})
export class Usuario extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare primer_apellido: string;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare segundo_apellido: string | null;

  @Column({ type: DataType.STRING(191), allowNull: false, unique: true })
  declare email: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare telefono: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare celular: string;

  @Column({ type: DataType.DATE, allowNull: true })
  declare email_verified_at: Date | null;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare password: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare remember_token: string | null;

  @ForeignKey(() => Institucion)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare institucion_id: number;

  @BelongsTo(() => Institucion)
  declare institucion: Institucion;

  @BelongsToMany(() => Rol, {
    through: { model: () => ModelHasRole, unique: false, scope: { model_type: MORPH.usuario } },
    foreignKey: 'model_id',
    otherKey: 'role_id',
    constraints: false,
  })
  declare roles: Rol[];
}

export function nombreCompleto(p: {
  nombre?: string | null;
  primer_apellido?: string | null;
  segundo_apellido?: string | null;
} | null | undefined): string {
  if (!p) return '';
  return [p.nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ').trim();
}
