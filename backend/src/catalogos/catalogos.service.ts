import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Genero } from '../database/models/genero.model';
import { TipoSolicitante } from '../database/models/tipo-solicitante.model';
import { Entidad } from '../database/models/entidad.model';
import { Municipio } from '../database/models/municipio.model';
import { SituacionJuridica } from '../database/models/situacion-juridica.model';
import { TipoDefensor } from '../database/models/tipo-defensor.model';
import { PerfilCriminologico } from '../database/models/perfil-criminologico.model';
import { NivelDelito } from '../database/models/nivel-delito.model';
import { RazonSolicitud } from '../database/models/razon-solicitud.model';
import { Parentesco } from '../database/models/parentesco.model';
import { Delito } from '../database/models/delito.model';
import { ModalidadDelito } from '../database/models/modalidad-delito.model';
import { Institucion } from '../database/models/institucion.model';
import { Recomendacion } from '../database/models/recomendacion.model';
import { EstatusSolicitud } from '../database/models/estatus-solicitud.model';
import { Usuario, nombreCompleto } from '../database/models/usuario.model';
import { RECOMENDACION_OPINION_CONSULTIVA } from '../common/amnistia.constants';

export interface OpcionCatalogo {
  id: number;
  nombre: string;
  clave?: string;
}

const porId = { order: [['id', 'ASC']] as [string, string][] };

@Injectable()
export class CatalogosService {
  constructor(
    @InjectModel(Genero) private readonly generoModel: typeof Genero,
    @InjectModel(TipoSolicitante) private readonly tipoSolicitanteModel: typeof TipoSolicitante,
    @InjectModel(Entidad) private readonly entidadModel: typeof Entidad,
    @InjectModel(Municipio) private readonly municipioModel: typeof Municipio,
    @InjectModel(SituacionJuridica) private readonly situacionModel: typeof SituacionJuridica,
    @InjectModel(TipoDefensor) private readonly tipoDefensorModel: typeof TipoDefensor,
    @InjectModel(PerfilCriminologico) private readonly perfilModel: typeof PerfilCriminologico,
    @InjectModel(NivelDelito) private readonly nivelModel: typeof NivelDelito,
    @InjectModel(RazonSolicitud) private readonly razonModel: typeof RazonSolicitud,
    @InjectModel(Parentesco) private readonly parentescoModel: typeof Parentesco,
    @InjectModel(Delito) private readonly delitoModel: typeof Delito,
    @InjectModel(Institucion) private readonly institucionModel: typeof Institucion,
    @InjectModel(Recomendacion) private readonly recomendacionModel: typeof Recomendacion,
    @InjectModel(EstatusSolicitud) private readonly estatusModel: typeof EstatusSolicitud,
    @InjectModel(Usuario) private readonly usuarioModel: typeof Usuario,
  ) {}

  /** Todo lo que necesita el formulario público de solicitud, en una sola llamada. */
  async formulario() {
    const nombre = (rows: { id: number; nombre: string }[]): OpcionCatalogo[] =>
      rows.map((r) => ({ id: r.id, nombre: r.nombre }));

    const [
      generos, tiposSolicitante, entidades, situaciones, defensores, perfiles, niveles,
      razones, parentescos, delitos,
    ] = await Promise.all([
      this.generoModel.findAll(porId),
      this.tipoSolicitanteModel.findAll(porId),
      this.entidadModel.findAll(porId),
      this.situacionModel.findAll(porId),
      this.tipoDefensorModel.findAll(porId),
      this.perfilModel.findAll(porId),
      this.nivelModel.findAll(porId),
      this.razonModel.findAll(porId),
      this.parentescoModel.findAll(porId),
      this.delitoModel.findAll({ ...porId, include: [ModalidadDelito] }),
    ]);

    return {
      generos: nombre(generos),
      tiposSolicitante: nombre(tiposSolicitante),
      entidades: entidades.map((e) => ({ id: e.id, nombre: e.entidad })),
      situacionesJuridicas: nombre(situaciones),
      tiposDefensores: nombre(defensores),
      perfilesCriminologicos: nombre(perfiles),
      nivelesDelito: nombre(niveles),
      razonesSolicitud: razones.map((r) => ({ id: r.id, nombre: r.valor, clave: r.clave })),
      parentescos: parentescos.map((p) => ({ id: p.id, nombre: p.valor, clave: p.clave })),
      delitos: delitos.map((d) => ({
        id: d.id,
        nombre: d.delito,
        modalidades: (d.modalidades ?? [])
          .sort((a, b) => a.id - b.id)
          .map((m) => ({ id: m.id, nombre: m.nombre })),
      })),
    };
  }

  async municipios(entidadId: number): Promise<OpcionCatalogo[]> {
    const rows = await this.municipioModel.findAll({ where: { entidad_id: entidadId }, order: [['municipio', 'ASC']] });
    return rows.map((m) => ({ id: m.id, nombre: m.municipio }));
  }

  async instituciones(): Promise<OpcionCatalogo[]> {
    const rows = await this.institucionModel.findAll(porId);
    return rows.map((i) => ({ id: i.id, nombre: i.nombre_institucion }));
  }

  /** Usuarios de una institución, para turnarles una solicitud. */
  async usuariosInstitucion(institucionId: number) {
    const rows = await this.usuarioModel.findAll({ where: { institucion_id: institucionId }, order: [['nombre', 'ASC']] });
    return rows.map((u) => ({ id: u.id, nombre: nombreCompleto(u), email: u.email }));
  }

  /** Tipos de resolución que puede emitir el Legislativo (la opinión consultiva es de las instituciones). */
  async recomendaciones(): Promise<OpcionCatalogo[]> {
    const rows = await this.recomendacionModel.findAll({
      where: { estado: { [Op.ne]: RECOMENDACION_OPINION_CONSULTIVA } },
      ...porId,
    });
    return rows.map((r) => ({ id: r.id, nombre: r.estado.trim() }));
  }

  async estatusSolicitud(): Promise<OpcionCatalogo[]> {
    const rows = await this.estatusModel.findAll(porId);
    return rows.map((r) => ({ id: r.id, nombre: r.nombre }));
  }
}
