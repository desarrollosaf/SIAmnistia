import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Solicitud, nus } from '../database/models/solicitud.model';
import { SolicitudUser } from '../database/models/solicitud-user.model';
import { Suspencion } from '../database/models/suspencion.model';
import { Usuario } from '../database/models/usuario.model';
import { Institucion } from '../database/models/institucion.model';
import { MORPH } from '../database/models/opciones-tabla';
import { CatalogoNombresService } from '../comun/catalogo-nombres.service';
import { ESTATUS_SOLICITUD, ESTATUS_TURNO, HORAS_ACUSE_TURNO } from '../common/amnistia.constants';

const HORA_MS = 60 * 60 * 1000;

/** Milisegundos de [desde, hasta] que caen dentro de alguna suspensión (sin contar traslapes dos veces). */
export function msSuspendidos(desde: number, hasta: number, periodos: { inicio: number; fin: number }[]): number {
  const recortados = periodos
    .map((p) => ({ inicio: Math.max(p.inicio, desde), fin: Math.min(p.fin, hasta) }))
    .filter((p) => p.fin > p.inicio)
    .sort((a, b) => a.inicio - b.inicio);

  let total = 0;
  let cursor = desde;
  for (const p of recortados) {
    const inicio = Math.max(p.inicio, cursor);
    if (p.fin > inicio) {
      total += p.fin - inicio;
      cursor = p.fin;
    }
  }
  return total;
}

/**
 * Equivalente al comando solicitud:status_change de Laravel: si una institución no acusa de
 * recibido un turno en 72 horas, el turno se da por recibido y pasa a EN EVALUACIÓN. Los periodos
 * de suspensión de términos (de la solicitud o de la institución) no cuentan para el plazo.
 */
@Injectable()
export class CambioEstatusTurnosTask {
  private readonly logger = new Logger('CambioEstatusTurnos');
  private ejecutando = false;

  constructor(
    @InjectModel(SolicitudUser) private readonly turnoModel: typeof SolicitudUser,
    @InjectModel(Suspencion) private readonly suspencionModel: typeof Suspencion,
    private readonly nombres: CatalogoNombresService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async ejecutar(): Promise<void> {
    if (this.ejecutando) return;
    this.ejecutando = true;
    try {
      await this.revisarTurnos();
    } catch (error) {
      this.logger.error('Falló la revisión de turnos', (error as Error).stack);
    } finally {
      this.ejecutando = false;
    }
  }

  private async revisarTurnos(): Promise<void> {
    const enEvaluacionSolicitud = await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.enEvaluacion);
    const turnada = await this.nombres.estatusTurno(ESTATUS_TURNO.turnada);
    const enEvaluacionTurno = await this.nombres.estatusTurno(ESTATUS_TURNO.enEvaluacion);

    const turnos = await this.turnoModel.findAll({
      where: { estatus_turno_id: turnada },
      include: [
        { model: Solicitud, required: true, where: { estatus_solicitud_id: enEvaluacionSolicitud, suspendida: false } },
        { model: Usuario, include: [Institucion] },
      ],
    });
    if (!turnos.length) return;

    const ahora = Date.now();
    for (const turno of turnos) {
      const desde = new Date(turno.created_at).getTime();
      const suspensiones = await this.suspencionModel.findAll({
        where: {
          [Op.or]: [
            { suspencion_type: MORPH.solicitud, suspencion_id: turno.solicitud_id },
            { suspencion_type: MORPH.institucion, suspencion_id: turno.user?.institucion_id ?? 0 },
          ],
          fecha_fin: { [Op.gt]: new Date(desde) },
        },
      });
      const periodos = suspensiones.map((s) => ({
        inicio: new Date(s.fecha_inicio).getTime(),
        fin: new Date(s.fecha_fin).getTime(),
      }));

      const horasCorridas = (ahora - desde - msSuspendidos(desde, ahora, periodos)) / HORA_MS;
      if (horasCorridas < HORAS_ACUSE_TURNO) continue;

      await turno.update({ estatus_turno_id: enEvaluacionTurno, fecha_evaluacion: new Date() });
      this.logger.log(
        `Se confirmó la solicitud ${nus(turno.solicitud)} para ${turno.user?.institucion?.nombre_institucion ?? 'la institución'}`,
      );
    }
  }
}
