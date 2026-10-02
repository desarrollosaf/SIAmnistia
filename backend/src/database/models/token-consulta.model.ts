import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { OPCIONES_TABLA } from './opciones-tabla';

/** Liga temporal con la que el peticionario consulta sus solicitudes sin cuenta de usuario. */
@Table({ tableName: 'tokens_consulta', ...OPCIONES_TABLA })
export class TokenConsulta extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(64), allowNull: false, unique: true })
  declare token: string;

  @Column({ type: DataType.STRING(191), allowNull: false })
  declare email: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expira_en: Date;
}
