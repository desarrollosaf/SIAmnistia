import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany,
} from 'sequelize-typescript';
import { OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { Solicitud } from './solicitud.model';
import { RazonSolicitud } from './razon-solicitud.model';
import { CarpetaDelito } from './carpeta-delito.model';

// Carpeta de investigación (o causa) incluida en la solicitud, con sus delitos.
@Table({ tableName: 'solicitudes_carpetas', ...OPCIONES_TABLA_PARANOID })
export class SolicitudCarpeta extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare carpeta: string;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare tomo: string | null;

  @Column({ type: DataType.STRING(191), allowNull: true })
  declare foja: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare conoce_ubicacion: boolean;

  @ForeignKey(() => Solicitud)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare solicitud_id: number | null;

  @BelongsTo(() => Solicitud)
  declare solicitud: Solicitud;

  @ForeignKey(() => RazonSolicitud)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, defaultValue: 1 })
  declare razon_solicitud_id: number;

  @BelongsTo(() => RazonSolicitud)
  declare razon_solicitud: RazonSolicitud;

  @HasMany(() => CarpetaDelito)
  declare delitos: CarpetaDelito[];
}
