import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { OPCIONES_TABLA_PARANOID } from './opciones-tabla';
import { ModalidadDelito } from './modalidad-delito.model';

/** El formulario público detecta este delito por nombre y deja escribirlo a mano. */
export const NOMBRE_DELITO_OTRO = 'OTRO';

@Table({ tableName: 'delitos', ...OPCIONES_TABLA_PARANOID })
export class Delito extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare delito: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare obligatorio: boolean;

  @HasMany(() => ModalidadDelito)
  declare modalidades: ModalidadDelito[];
}
