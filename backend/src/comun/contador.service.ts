import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Contador } from '../database/models/contador.model';
import { fechaHoyMexico } from '../common/fecha-mexico.util';

export const TIPO_CONTADOR_SOLICITUDES = 1;

/**
 * Folio consecutivo por año (NUS = folio/año). El contador guarda el siguiente número a
 * entregar; al cambiar de año se reinicia en 1. La fila se bloquea dentro de la transacción
 * para que dos registros simultáneos no tomen el mismo folio.
 */
@Injectable()
export class ContadorService {
  constructor(
    @InjectModel(Contador)
    private readonly contadorModel: typeof Contador,
  ) {}

  async siguienteFolio(transaction: Transaction, tipoContadorId = TIPO_CONTADOR_SOLICITUDES) {
    const anio = Number(fechaHoyMexico().slice(0, 4));
    const contador = await this.contadorModel.findOne({
      where: { anio, tipo_contador_id: tipoContadorId },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!contador) {
      await this.contadorModel.create({ anio, tipo_contador_id: tipoContadorId, numero: 2 }, { transaction });
      return { folio: 1, anio };
    }

    const folio = contador.numero;
    await contador.update({ numero: folio + 1 }, { transaction });
    return { folio, anio };
  }
}
