import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { MORPH, OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { Usuario } from './usuario.model';

/** Nombres fijos con los que el sistema identifica los documentos que genera o pide. */
export const DOC = {
  acuse: 'acuse.pdf',
  fichaTecnica: 'ficha_tecnica.pdf',
  formatoSolicitud: 'formato_solicitud.pdf',
  verdadHechos: 'Verdad de hechos.pdf',
  observacionesHechos: 'observaciones hechos.pdf',
  informacionComplementaria: 'información complementaria.pdf',
  sentencia: 'sentencia.pdf',
  designacionRepresentante: 'Designación de representante legal.pdf',
  autorizacionOrganismo: 'Autorización al organismo.pdf',
  acreditacionTitular: 'Acreditación del titular del organismo.pdf',
  averiguacionPrevia: 'Averiguación previa.pdf',
  constanciasProceso: 'Constancias del proceso penal.pdf',
  noReincidencia: 'No reincidencia.pdf',
  situacionSocioeconomica: 'Situación socioeconómica.pdf',
  calidadIndigena: 'Calidad de indígena.pdf',
  otroDocumento: 'Otro documento.pdf',
} as const;

@Table({ tableName: 'documentos', ...OPCIONES_TABLA_PARANOID })
export class Documento extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.BIGINT, allowNull: false })
  declare documentable_id: number;

  @Column({ type: DataType.STRING(191), allowNull: false, defaultValue: MORPH.solicitud })
  declare documentable_type: string;

  // Relativa a backend/uploads (antes storage/app en Laravel). Nunca se expone al cliente.
  @Column({ type: DataType.STRING(191), allowNull: false })
  declare ruta: string;

  // Nombre "lógico" del documento (acuse.pdf, sentencia.pdf, el nombre original del archivo...).
  @Column({ type: DataType.STRING(191), allowNull: false })
  declare nombre_documento: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare descripcion: string;

  // Tamaño en KB.
  @Column({ type: DataType.STRING(191), allowNull: false })
  declare tamano: string;

  // Nombre físico del archivo dentro de la carpeta de la solicitud.
  @Column({ type: DataType.STRING(191), allowNull: false })
  declare nombre: string;

  // null = lo subió el peticionario desde el formulario público.
  @ForeignKey(() => Usuario)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare user_id: number | null;

  @BelongsTo(() => Usuario)
  declare user: Usuario | null;

  @Column({ type: DataType.CHAR(36), allowNull: false })
  declare uuid: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare ficha_tecnica: boolean;

  declare created_at: Date;
}
