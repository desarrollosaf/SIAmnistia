import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { SolicitudCarpeta } from './solicitud-carpeta.model';
import { Delito } from './delito.model';
import { ModalidadDelito } from './modalidad-delito.model';

@Table({ tableName: 'carpetas_delitos', ...OPCIONES_TABLA_PARANOID })
export class CarpetaDelito extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => SolicitudCarpeta)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare solicitud_carpeta_id: number | null;

  // Texto ya armado ("DELITO - MODALIDAD", o el delito libre cuando es "OTRO").
  @Column({ type: DataType.TEXT, allowNull: false })
  declare delito: string;

  @ForeignKey(() => Delito)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare delito_id: number | null;

  @BelongsTo(() => Delito)
  declare delito_catalogo: Delito | null;

  @ForeignKey(() => ModalidadDelito)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare modalidad_id: number | null;

  @BelongsTo(() => ModalidadDelito)
  declare modalidad: ModalidadDelito | null;
}
