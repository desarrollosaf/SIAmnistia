import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { OPCIONES_TABLA } from './opciones-tabla';
import { Solicitud } from './solicitud.model';

export type ComunidadBeneficiario = 'INDIGENA' | 'AFROMEXICANA' | 'NINGUNA';
export type SituacionLibertad = 'PRIVADO' | 'NO_PRIVADO' | 'MEDIDA_SEGURIDAD';
export type ResolucionApelacion = 'CONFIRMO' | 'MODIFICO' | 'REVOCO';

/**
 * Datos del beneficiario que completan el formato "Solicitud de amnistía" (una fila por
 * solicitud). Todo es opcional: las solicitudes anteriores no los tienen. Los "sí / no" son
 * boolean (null = sin responder); los decimales de Sequelize llegan como texto.
 */
@Table({ tableName: 'solicitud_datos_formato', ...OPCIONES_TABLA })
export class SolicitudDatosFormato extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Solicitud)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true })
  declare solicitud_id: number;

  @BelongsTo(() => Solicitud)
  declare solicitud: Solicitud;

  // Titular o representante legal del organismo (peticionario persona jurídica colectiva).
  @Column({ type: DataType.STRING(191), allowNull: true })
  declare titular_nombre: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare titular_primer_apellido: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare titular_segundo_apellido: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare estado_se_encuentra: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare fecha_comision_delito: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare comunidad: ComunidadBeneficiario | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare comunidad_indigena_cual: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare interprete: boolean | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare discapacidad: boolean | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare discapacidad_cual: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare enfermedad_cronica: boolean | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare enfermedad_cronica_cual: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare ocupacion_previa: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare dependientes_economicos: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare situacion_libertad: SituacionLibertad | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare medida_seguridad_cual: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare investigacion_numero: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare investigacion_agencia: string | null;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: true })
  declare pena_anios: number | null;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: true })
  declare pena_meses: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare multa: boolean | null;

  @Column({ type: DataType.DECIMAL(14, 2), allowNull: true })
  declare multa_monto: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare apelacion: boolean | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare apelacion_toca: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare apelacion_tribunal: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare apelacion_resolucion: ResolucionApelacion | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare pena_modificada: boolean | null;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: true })
  declare pena_compurgar_anios: number | null;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: true })
  declare pena_compurgar_meses: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare amparo: boolean | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare amparo_efectos: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare amparo_concedido: boolean | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare sentenciado_antes_mismo_delito: boolean | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare otro_proceso: boolean | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare otro_proceso_expediente: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare otro_proceso_juzgado: string | null;
}
