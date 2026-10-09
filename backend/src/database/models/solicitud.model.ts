import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, HasOne,
} from 'sequelize-typescript';
import { MORPH, OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { Persona } from './persona.model';
import { SituacionJuridica } from './situacion-juridica.model';
import { TipoDefensor } from './tipo-defensor.model';
import { PerfilCriminologico } from './perfil-criminologico.model';
import { NivelDelito } from './nivel-delito.model';
import { RazonSolicitud } from './razon-solicitud.model';
import { EstatusSolicitud } from './estatus-solicitud.model';
import { Recomendacion } from './recomendacion.model';
import { SolicitudCarpeta } from './solicitud-carpeta.model';
import { SolicitudUser } from './solicitud-user.model';
import { Documento } from './documento.model';
import { Suspencion } from './suspencion.model';
import { SolicitudDatosFormato } from './solicitud-datos-formato.model';

@Table({ tableName: 'solicitudes', ...OPCIONES_TABLA_PARANOID })
export class Solicitud extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.BIGINT, allowNull: true })
  declare folio: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare anio: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare estatus: number | null;

  @ForeignKey(() => Persona)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare solicitante_id: number;

  @BelongsTo(() => Persona, 'solicitante_id')
  declare solicitante: Persona;

  @ForeignKey(() => Persona)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare beneficiario_id: number;

  @BelongsTo(() => Persona, 'beneficiario_id')
  declare beneficiario: Persona;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare cprs: string;

  @ForeignKey(() => SituacionJuridica)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare situacion_juridica_id: number;

  @BelongsTo(() => SituacionJuridica)
  declare situacion_juridica: SituacionJuridica;

  @ForeignKey(() => TipoDefensor)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare tipo_defensor_id: number;

  @BelongsTo(() => TipoDefensor)
  declare tipo_defensor: TipoDefensor;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare juzgado: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare procedimiento_abreviado: boolean;

  @ForeignKey(() => PerfilCriminologico)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare perfil_criminologico_id: number;

  @BelongsTo(() => PerfilCriminologico)
  declare perfil_criminologico: PerfilCriminologico;

  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare resolucion_id: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare turnado: boolean;

  @ForeignKey(() => NivelDelito)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare nivel_delito_id: number | null;

  @BelongsTo(() => NivelDelito)
  declare nivel_delito: NivelDelito | null;

  @ForeignKey(() => RazonSolicitud)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare razon_solicitud_id: number | null;

  @ForeignKey(() => EstatusSolicitud)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, defaultValue: 1 })
  declare estatus_solicitud_id: number;

  @BelongsTo(() => EstatusSolicitud)
  declare estatus_solicitud: EstatusSolicitud;

  @ForeignKey(() => Recomendacion)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare recomendacion_id: number | null;

  @BelongsTo(() => Recomendacion)
  declare recomendacion: Recomendacion | null;

  @Column({ type: DataType.TEXT('long'), allowNull: true })
  declare informacion_complementaria: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare fecha_aprovacion: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare fecha_finalizo: Date | null;

  @Column({ type: DataType.TEXT('long'), allowNull: true })
  declare observaciones_hechos: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare suspendida: boolean;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare otro_situacion_juridica: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare cadena_validacion: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare cadena_validacion_codificada: string | null;

  @HasMany(() => SolicitudCarpeta)
  declare solicitud_carpetas: SolicitudCarpeta[];

  @HasOne(() => SolicitudDatosFormato)
  declare datos_formato: SolicitudDatosFormato | null;

  @HasMany(() => SolicitudUser)
  declare solicitud_usuarios: SolicitudUser[];

  @HasMany(() => Documento, {
    foreignKey: 'documentable_id',
    constraints: false,
    scope: { documentable_type: MORPH.solicitud },
  })
  declare documentos: Documento[];

  @HasMany(() => Suspencion, {
    foreignKey: 'suspencion_id',
    constraints: false,
    scope: { suspencion_type: MORPH.solicitud },
  })
  declare suspenciones: Suspencion[];

  declare created_at: Date;
  declare updated_at: Date;
}

/** NUS: número único de solicitud. */
export function nus(s: { folio: number | null; anio: number | null }): string {
  return `${s.folio ?? ''}/${s.anio ?? ''}`;
}
