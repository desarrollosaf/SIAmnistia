import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Suspencion } from '../database/models/suspencion.model';
import { Solicitud } from '../database/models/solicitud.model';
import { Institucion } from '../database/models/institucion.model';
import { MORPH } from '../database/models/opciones-tabla';

export type TipoSuspension = 'solicitud' | 'institucion';

const MORPH_POR_TIPO: Record<TipoSuspension, string> = {
  solicitud: MORPH.solicitud,
  institucion: MORPH.institucion,
};

/** Fecha "YYYY-MM-DD" a medianoche/fin de día en hora de México. */
const inicioDia = (fecha: string) => new Date(`${fecha}T00:00:00-06:00`);
const finDia = (fecha: string) => new Date(`${fecha}T23:59:59-06:00`);

@Injectable()
export class SuspensionesService {
  constructor(
    @InjectModel(Suspencion) private readonly suspencionModel: typeof Suspencion,
    @InjectModel(Solicitud) private readonly solicitudModel: typeof Solicitud,
    @InjectModel(Institucion) private readonly institucionModel: typeof Institucion,
  ) {}

  async listar(tipo: TipoSuspension, id: number) {
    const filas = await this.suspencionModel.findAll({
      where: { suspencion_type: this.morph(tipo), suspencion_id: id },
      order: [['fecha_inicio', 'DESC']],
    });
    return filas.map((s) => ({
      id: s.id,
      fechaInicio: s.fecha_inicio,
      fechaFin: s.fecha_fin,
      justificacion: s.justificacion,
    }));
  }

  async crear(tipo: TipoSuspension, id: number, fechaInicio: string, fechaFin: string, justificacion: string) {
    const existe = tipo === 'solicitud'
      ? await this.solicitudModel.count({ where: { id } })
      : await this.institucionModel.count({ where: { id } });
    if (!existe) throw new NotFoundException('No existe el registro a suspender');
    if (fechaFin < fechaInicio) throw new BadRequestException('La fecha de término no puede ser anterior a la de inicio');

    const s = await this.suspencionModel.create({
      suspencion_type: this.morph(tipo),
      suspencion_id: id,
      fecha_inicio: inicioDia(fechaInicio),
      fecha_fin: finDia(fechaFin),
      justificacion: justificacion.trim(),
    });
    return { id: s.id };
  }

  async eliminar(id: number) {
    const s = await this.suspencionModel.findByPk(id);
    if (!s) throw new NotFoundException('No existe la suspensión');
    await s.destroy();
    return { ok: true };
  }

  private morph(tipo: TipoSuspension): string {
    const morph = MORPH_POR_TIPO[tipo];
    if (!morph) throw new BadRequestException('Tipo de suspensión inválido');
    return morph;
  }
}
