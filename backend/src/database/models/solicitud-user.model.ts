import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { Solicitud } from './solicitud.model';
import { Usuario } from './usuario.model';
import { EstatusTurno } from './estatus-turno.model';
import { Recomendacion } from './recomendacion.model';

/** Turno de una solicitud a un usuario de otra institución para que emita opinión consultiva. */
@Table({ tableName: 'solicitud_users', ...OPCIONES_TABLA_PARANOID })
export class SolicitudUser extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Solicitud)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare solicitud_id: number;

  @BelongsTo(() => Solicitud)
  declare solicitud: Solicitud;

  @ForeignKey(() => Usuario)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare user_id: number;

  @BelongsTo(() => Usuario)
  declare user: Usuario;

  @ForeignKey(() => EstatusTurno)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, defaultValue: 1 })
  declare estatus_turno_id: number;

  @BelongsTo(() => EstatusTurno)
  declare estatus: EstatusTurno;

  @ForeignKey(() => Recomendacion)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare recomendacion_id: number | null;

  @BelongsTo(() => Recomendacion)
  declare recomendacion: Recomendacion | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare fecha_evaluacion: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare fecha_termino: Date | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare prevencion: boolean;

  declare created_at: Date;
}
