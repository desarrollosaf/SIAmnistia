import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, HasOne,
} from 'sequelize-typescript';
import { MORPH, OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { Genero } from './genero.model';
import { TipoPersona } from './tipo-persona.model';
import { Parentesco } from './parentesco.model';
import { Domicilio } from './domicilio.model';
import { Solicitud } from './solicitud.model';

export const TIPO_PERSONA_SOLICITANTE = 'Solicitante';
export const TIPO_PERSONA_BENEFICIARIO = 'Beneficiario';

/**
 * Solicitante (peticionario) o beneficiario. Para persona jurídica colectiva el sistema anterior
 * guardaba el nombre de la institución en "nombre" y su RFC en "curp", sin apellidos: por eso
 * "es persona física" se deduce de que tenga primer apellido.
 */
@Table({ tableName: 'personas', ...OPCIONES_TABLA_PARANOID })
export class Persona extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare nombre: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare primer_apellido: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare segundo_apellido: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare email: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare telefono: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare celular: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare ocupacion: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare nacionalidad: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare fecha_nacimiento: string | null;

  @ForeignKey(() => Genero)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare genero_id: number | null;

  @BelongsTo(() => Genero)
  declare genero: Genero | null;

  @ForeignKey(() => TipoPersona)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare tipo_persona_id: number | null;

  @BelongsTo(() => TipoPersona)
  declare tipo_persona: TipoPersona | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare curp: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare relacion: boolean;

  @ForeignKey(() => Parentesco)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare parentesco_id: number | null;

  @BelongsTo(() => Parentesco)
  declare parentesco: Parentesco | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare parentesco_otro: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare genero_otro: string | null;

  @HasOne(() => Domicilio, {
    foreignKey: 'domiciliable_id',
    constraints: false,
    scope: { domiciliable_type: MORPH.persona },
  })
  declare domicilio: Domicilio | null;

  @HasMany(() => Solicitud, 'solicitante_id')
  declare solicitudes_peticionario: Solicitud[];
}
