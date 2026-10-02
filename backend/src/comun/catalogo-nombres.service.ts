import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EstatusSolicitud } from '../database/models/estatus-solicitud.model';
import { EstatusTurno } from '../database/models/estatus-turno.model';
import { Recomendacion } from '../database/models/recomendacion.model';
import { TipoPersona } from '../database/models/tipo-persona.model';
import { Institucion } from '../database/models/institucion.model';

/**
 * Resuelve ids de catálogo a partir del nombre (como hacía Laravel con whereNombre), porque los
 * ids pueden variar entre una base nueva y una importada. Se cachean: son catálogos fijos.
 */
@Injectable()
export class CatalogoNombresService {
  private readonly cache = new Map<string, number>();

  constructor(
    @InjectModel(EstatusSolicitud) private readonly estatusSolicitudModel: typeof EstatusSolicitud,
    @InjectModel(EstatusTurno) private readonly estatusTurnoModel: typeof EstatusTurno,
    @InjectModel(Recomendacion) private readonly recomendacionModel: typeof Recomendacion,
    @InjectModel(TipoPersona) private readonly tipoPersonaModel: typeof TipoPersona,
    @InjectModel(Institucion) private readonly institucionModel: typeof Institucion,
  ) {}

  estatusSolicitud(nombre: string): Promise<number> {
    return this.resolver('es', nombre, () => this.estatusSolicitudModel.findOne({ where: { nombre } }));
  }

  estatusTurno(nombre: string): Promise<number> {
    return this.resolver('et', nombre, () => this.estatusTurnoModel.findOne({ where: { nombre } }));
  }

  recomendacion(estado: string): Promise<number> {
    return this.resolver('re', estado, () => this.recomendacionModel.findOne({ where: { estado } }));
  }

  tipoPersona(nombre: string): Promise<number> {
    return this.resolver('tp', nombre, () => this.tipoPersonaModel.findOne({ where: { nombre } }));
  }

  institucion(nombre: string): Promise<number> {
    return this.resolver('in', nombre, () =>
      this.institucionModel.findOne({ where: { nombre_institucion: nombre } }),
    );
  }

  private async resolver(
    prefijo: string,
    nombre: string,
    buscar: () => Promise<{ id: number } | null>,
  ): Promise<number> {
    const clave = `${prefijo}:${nombre}`;
    const enCache = this.cache.get(clave);
    if (enCache !== undefined) return enCache;

    const fila = await buscar();
    if (!fila) {
      throw new InternalServerErrorException(`Falta el registro "${nombre}" en el catálogo`);
    }
    this.cache.set(clave, fila.id);
    return fila.id;
  }
}
