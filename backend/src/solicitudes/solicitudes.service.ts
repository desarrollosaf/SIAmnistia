import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize, WhereOptions } from 'sequelize';
import * as XLSX from 'xlsx';
import { Solicitud, nus } from '../database/models/solicitud.model';
import { Persona } from '../database/models/persona.model';
import { Domicilio } from '../database/models/domicilio.model';
import { Entidad } from '../database/models/entidad.model';
import { Municipio } from '../database/models/municipio.model';
import { Genero } from '../database/models/genero.model';
import { Parentesco } from '../database/models/parentesco.model';
import { SituacionJuridica } from '../database/models/situacion-juridica.model';
import { TipoDefensor } from '../database/models/tipo-defensor.model';
import { PerfilCriminologico } from '../database/models/perfil-criminologico.model';
import { NivelDelito } from '../database/models/nivel-delito.model';
import { EstatusSolicitud } from '../database/models/estatus-solicitud.model';
import { EstatusTurno } from '../database/models/estatus-turno.model';
import { Recomendacion } from '../database/models/recomendacion.model';
import { SolicitudCarpeta } from '../database/models/solicitud-carpeta.model';
import { CarpetaDelito } from '../database/models/carpeta-delito.model';
import { RazonSolicitud } from '../database/models/razon-solicitud.model';
import { SolicitudUser } from '../database/models/solicitud-user.model';
import { Usuario, nombreCompleto } from '../database/models/usuario.model';
import { Institucion } from '../database/models/institucion.model';
import { Documento } from '../database/models/documento.model';
import { MORPH } from '../database/models/opciones-tabla';
import { ArchivosService } from '../comun/archivos.service';
import { CatalogoNombresService } from '../comun/catalogo-nombres.service';
import { CorreoService } from '../comun/correo.service';
import { DocumentosGeneradosService } from '../comun/documentos-generados.service';
import {
  ESTATUS_SOLICITUD, ESTATUS_TURNO, INSTITUCION, RECOMENDACION_OPINION_CONSULTIVA,
} from '../common/amnistia.constants';
import { esPrivilegiado, UsuarioActual } from '../auth/usuario-actual';
import { ActualizarSolicitudDto } from './dto/solicitudes.dto';

export type Semaforo = 'verde' | 'amarillo' | 'naranja' | 'rojo' | null;

const DIA_MS = 24 * 60 * 60 * 1000;

/** Ve todas las solicitudes: el Poder Legislativo y los roles privilegiados. */
const veTodas = (user: UsuarioActual) => user.legislativo || esPrivilegiado(user);

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(Solicitud) private readonly solicitudModel: typeof Solicitud,
    @InjectModel(SolicitudUser) private readonly turnoModel: typeof SolicitudUser,
    @InjectModel(Usuario) private readonly usuarioModel: typeof Usuario,
    @InjectModel(Persona) private readonly personaModel: typeof Persona,
    @InjectModel(Domicilio) private readonly domicilioModel: typeof Domicilio,
    @InjectModel(Documento) private readonly documentoModel: typeof Documento,
    @InjectModel(Recomendacion) private readonly recomendacionModel: typeof Recomendacion,
    @InjectModel(EstatusSolicitud) private readonly estatusSolicitudModel: typeof EstatusSolicitud,
    private readonly archivos: ArchivosService,
    private readonly nombres: CatalogoNombresService,
    private readonly correo: CorreoService,
    private readonly generados: DocumentosGeneradosService,
  ) {}

  // ---------------------------------------------------------------------------------------
  // Listado
  // ---------------------------------------------------------------------------------------

  async listar(user: UsuarioActual, estatusId: number) {
    const where: WhereOptions = {};
    let turnoWhere: WhereOptions | undefined;

    if (estatusId) {
      where['estatus_solicitud_id'] = estatusId;
      if (!veTodas(user)) turnoWhere = { user_id: user.sub };
    } else if (!veTodas(user)) {
      // Bandeja de la institución: lo turnado que sigue vivo (en evaluación o terminada).
      where['estatus_solicitud_id'] = {
        [Op.in]: [
          await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.enEvaluacion),
          await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.terminada),
        ],
      };
      turnoWhere = {
        user_id: user.sub,
        estatus_turno_id: {
          [Op.in]: [
            await this.nombres.estatusTurno(ESTATUS_TURNO.turnada),
            await this.nombres.estatusTurno(ESTATUS_TURNO.enEvaluacion),
            await this.nombres.estatusTurno(ESTATUS_TURNO.terminada),
          ],
        },
      };
    }

    // Filtra por turno del usuario con un subquery para no recortar el include de turnos.
    if (turnoWhere) {
      const turnos = await this.turnoModel.findAll({ attributes: ['solicitud_id'], where: turnoWhere });
      where['id'] = { [Op.in]: turnos.map((t) => t.solicitud_id) };
    }

    const solicitudes = await this.solicitudModel.findAll({
      where,
      include: [
        { model: Persona, as: 'beneficiario', attributes: ['nombre', 'primer_apellido', 'segundo_apellido'] },
        { model: Persona, as: 'solicitante', attributes: ['nombre', 'primer_apellido', 'segundo_apellido'] },
        EstatusSolicitud,
        { model: SolicitudUser, attributes: ['user_id', 'estatus_turno_id', 'prevencion'] },
        { model: Documento, attributes: ['uuid'], where: { ficha_tecnica: true }, required: false },
      ],
      order: [['id', 'DESC']],
    });

    const ids = await this.idsEstatus();
    return solicitudes.map((s) => {
      const miTurno = s.solicitud_usuarios?.find((t) => t.user_id === user.sub);
      return {
        id: s.id,
        nus: nus(s),
        beneficiario: nombreCompleto(s.beneficiario),
        solicitante: nombreCompleto(s.solicitante),
        fechaRegistro: s.created_at,
        estatusId: s.estatus_solicitud_id,
        estatus: s.estatus_solicitud?.nombre ?? '',
        miTurno: miTurno ? this.etiquetaTurno(miTurno, ids) : null,
        semaforo: this.semaforo(s, ids),
        fichaUuid: [...(s.documentos ?? [])].pop()?.uuid ?? null,
      };
    });
  }

  /** Conteos para los filtros del listado y el inicio. */
  async resumen(user: UsuarioActual) {
    const estatus = await this.estatusSolicitudModel.findAll({ order: [['id', 'ASC']] });
    let idsPermitidos: number[] | null = null;
    if (!veTodas(user)) {
      const turnos = await this.turnoModel.findAll({ attributes: ['solicitud_id'], where: { user_id: user.sub } });
      idsPermitidos = turnos.map((t) => t.solicitud_id);
    }
    const filtroIds = idsPermitidos ? { id: { [Op.in]: idsPermitidos } } : {};

    const conteos = await this.solicitudModel.findAll({
      attributes: ['estatus_solicitud_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']],
      where: filtroIds,
      group: ['estatus_solicitud_id'],
      raw: true,
    }) as unknown as { estatus_solicitud_id: number; total: number }[];
    const porEstatus = new Map(conteos.map((c) => [Number(c.estatus_solicitud_id), Number(c.total)]));

    const turnosPendientes = await this.turnoModel.count({
      where: {
        user_id: user.sub,
        estatus_turno_id: {
          [Op.in]: [
            await this.nombres.estatusTurno(ESTATUS_TURNO.turnada),
            await this.nombres.estatusTurno(ESTATUS_TURNO.enEvaluacion),
          ],
        },
      },
    });

    return {
      total: [...porEstatus.values()].reduce((a, b) => a + b, 0),
      estatus: estatus.map((e) => ({ id: e.id, nombre: e.nombre, total: porEstatus.get(e.id) ?? 0 })),
      turnosPendientes,
    };
  }

  async excel(): Promise<Buffer> {
    const solicitudes = await this.solicitudModel.findAll({
      include: [
        { model: Persona, as: 'beneficiario' },
        { model: Persona, as: 'solicitante' },
        EstatusSolicitud,
        { model: SolicitudCarpeta, include: [CarpetaDelito] },
        { model: SolicitudUser, include: [{ model: Usuario, include: [Institucion] }] },
      ],
      order: [['id', 'ASC']],
    });

    const filas = solicitudes.map((s) => ({
      NUS: nus(s),
      'Fecha registro': s.created_at,
      Beneficiario: nombreCompleto(s.beneficiario),
      Solicitante: nombreCompleto(s.solicitante),
      Estatus: s.estatus_solicitud?.nombre ?? '',
      'Delito(s)': (s.solicitud_carpetas ?? []).flatMap((c) => (c.delitos ?? []).map((d) => d.delito)).join('; '),
      'Instituciones turnadas': (s.solicitud_usuarios ?? [])
        .map((t) => t.user?.institucion?.nombre_institucion)
        .filter(Boolean)
        .join(', '),
    }));

    const libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet(filas, { cellDates: true });
    hoja['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 36 }, { wch: 36 }, { wch: 16 }, { wch: 60 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(libro, hoja, 'Solicitudes');
    return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ---------------------------------------------------------------------------------------
  // Detalle
  // ---------------------------------------------------------------------------------------

  async detalle(id: number, user: UsuarioActual) {
    const s = await this.solicitudModel.findByPk(id, {
      include: [
        {
          model: Persona,
          as: 'solicitante',
          include: [Genero, Parentesco, { model: Domicilio, include: [Entidad, Municipio] }],
        },
        { model: Persona, as: 'beneficiario', include: [Genero] },
        SituacionJuridica,
        TipoDefensor,
        PerfilCriminologico,
        NivelDelito,
        EstatusSolicitud,
        Recomendacion,
        { model: SolicitudCarpeta, include: [RazonSolicitud, CarpetaDelito] },
        { model: SolicitudUser, include: [EstatusTurno] },
      ],
    });
    if (!s) throw new NotFoundException('No existe la solicitud');
    const miTurno = s.solicitud_usuarios?.find((t) => t.user_id === user.sub) ?? null;
    if (!veTodas(user) && !miTurno) throw new ForbiddenException('Esta solicitud no se te ha turnado');

    const ids = await this.idsEstatus();
    const estatus = s.estatus_solicitud?.nombre ?? '';
    const turnoEnEvaluacion = miTurno?.estatus_turno_id === ids.turno.enEvaluacion;
    const puedeConcluir = user.judicial && turnoEnEvaluacion && s.estatus_solicitud_id === ids.solicitud.terminada;

    const sol = s.solicitante;
    const dom = sol.domicilio;
    return {
      id: s.id,
      nus: nus(s),
      estatus,
      estatusId: s.estatus_solicitud_id,
      fechaRegistro: s.created_at,
      fechaAprobacion: s.fecha_aprovacion,
      fechaFinalizo: s.fecha_finalizo,
      recomendacion: s.recomendacion?.estado ?? null,
      semaforo: this.semaforo(s, ids),
      beneficiario: {
        nombre: s.beneficiario.nombre,
        primerApellido: s.beneficiario.primer_apellido,
        segundoApellido: s.beneficiario.segundo_apellido,
        fechaNacimiento: s.beneficiario.fecha_nacimiento,
        genero: s.beneficiario.genero_otro || s.beneficiario.genero?.nombre || '',
        curp: s.beneficiario.curp,
      },
      solicitante: {
        personaFisica: !!sol.primer_apellido,
        nombre: sol.nombre,
        primerApellido: sol.primer_apellido,
        segundoApellido: sol.segundo_apellido,
        rfc: sol.primer_apellido ? null : sol.curp,
        genero: sol.genero_otro || sol.genero?.nombre || '',
        parentesco: sol.relacion ? (sol.parentesco_otro || sol.parentesco?.valor || '') : null,
        email: sol.email,
        telefono: sol.telefono,
        celular: sol.celular,
        domicilio: dom
          ? {
              calle: dom.calle,
              numExt: dom.num_ext,
              numInt: dom.num_int,
              colonia: dom.colonia,
              entidadId: dom.entidad_id,
              entidad: dom.entidad?.entidad ?? '',
              municipioId: dom.municipio_id,
              municipio: dom.municipio?.municipio ?? '',
            }
          : null,
      },
      detalle: {
        cprs: s.cprs,
        situacionJuridica: s.otro_situacion_juridica || s.situacion_juridica?.nombre || '',
        tipoDefensor: s.tipo_defensor?.nombre ?? '',
        juzgado: s.juzgado,
        perfilCriminologico: s.perfil_criminologico?.nombre ?? '',
        nivelDelito: s.nivel_delito?.nombre ?? '',
        procedimientoAbreviado: s.procedimiento_abreviado,
        observacionesHechos: s.observaciones_hechos,
        informacionComplementaria: s.informacion_complementaria,
      },
      carpetas: (s.solicitud_carpetas ?? []).map((c) => ({
        id: c.id,
        carpeta: c.carpeta,
        razon: c.razon_solicitud?.valor ?? '',
        tomo: c.tomo,
        foja: c.foja,
        delitos: (c.delitos ?? []).map((d) => ({ id: d.id, delito: d.delito })),
      })),
      miTurno: miTurno
        ? { id: miTurno.id, estatus: miTurno.estatus?.nombre ?? '', prevencion: miTurno.prevencion }
        : null,
      acciones: {
        aceptar: user.legislativo && s.estatus_solicitud_id === ids.solicitud.registrada,
        negar: user.legislativo && s.estatus_solicitud_id === ids.solicitud.registrada,
        resolver: user.legislativo && s.estatus_solicitud_id === ids.solicitud.enEvaluacion,
        turnar: user.legislativo && s.estatus_solicitud_id === ids.solicitud.enEvaluacion,
        editar: user.legislativo,
        regenerarDocumentos: user.legislativo,
        indicarRecepcion: miTurno?.estatus_turno_id === ids.turno.turnada,
        prevenir: turnoEnEvaluacion && !puedeConcluir,
        opinar: turnoEnEvaluacion && !puedeConcluir,
        concluir: puedeConcluir,
      },
    };
  }

  async actualizar(id: number, dto: ActualizarSolicitudDto) {
    const s = await this.solicitudModel.findByPk(id, {
      include: [{ model: Persona, as: 'solicitante', include: [Domicilio] }, { model: Persona, as: 'beneficiario' }],
    });
    if (!s) throw new NotFoundException('No existe la solicitud');

    const quitarIndefinidos = <T extends object>(o: T) =>
      Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

    await this.sequelize.transaction(async (transaction) => {
      await s.beneficiario.update(quitarIndefinidos({
        nombre: dto.beneficiarioNombre,
        primer_apellido: dto.beneficiarioPrimerApellido,
        segundo_apellido: dto.beneficiarioSegundoApellido,
        fecha_nacimiento: dto.beneficiarioFechaNacimiento?.slice(0, 10),
        curp: dto.beneficiarioCurp,
      }), { transaction });

      await s.solicitante.update(quitarIndefinidos({
        nombre: dto.solicitanteNombre,
        primer_apellido: s.solicitante.primer_apellido ? dto.solicitantePrimerApellido : undefined,
        segundo_apellido: s.solicitante.primer_apellido ? dto.solicitanteSegundoApellido : undefined,
        email: dto.solicitanteEmail?.toLowerCase(),
        telefono: dto.solicitanteTelefono,
        celular: dto.solicitanteCelular,
      }), { transaction });

      const domicilio = quitarIndefinidos({
        calle: dto.calle,
        num_ext: dto.numExt,
        num_int: dto.numInt,
        colonia: dto.colonia,
        entidad_id: dto.entidadId,
        municipio_id: dto.municipioId,
      });
      if (s.solicitante.domicilio) {
        await s.solicitante.domicilio.update(domicilio, { transaction });
      } else if (Object.keys(domicilio).length) {
        await this.domicilioModel.create(
          { ...domicilio, domiciliable_id: s.solicitante.id, domiciliable_type: MORPH.persona },
          { transaction },
        );
      }

      await s.update(quitarIndefinidos({
        cprs: dto.cprs,
        juzgado: dto.juzgado,
        procedimiento_abreviado: dto.procedimientoAbreviado,
      }), { transaction });
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------------------
  // Flujo del Poder Legislativo
  // ---------------------------------------------------------------------------------------

  async aceptar(id: number) {
    const s = await this.solicitudEnEstatus(id, ESTATUS_SOLICITUD.registrada);
    await s.update({
      estatus_solicitud_id: await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.enEvaluacion),
      fecha_aprovacion: new Date(),
    });
    return { ok: true };
  }

  async negar(id: number, user: UsuarioActual, justificacion?: Express.Multer.File) {
    if (!justificacion) throw new BadRequestException('Adjunta el documento con la justificación');
    const s = await this.solicitudEnEstatus(id, ESTATUS_SOLICITUD.registrada);
    await this.sequelize.transaction(async (transaction) => {
      await s.update(
        {
          estatus_solicitud_id: await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.noProcede),
          fecha_aprovacion: new Date(),
        },
        { transaction },
      );
      await this.archivos.registrar({
        solicitudId: s.id,
        contenido: justificacion.buffer,
        nombreDocumento: 'justificacion_negacion.pdf',
        descripcion: 'Razón de negación de solicitud',
        userId: user.sub,
        transaction,
      });
    });
    return { ok: true };
  }

  /**
   * Resolución final del Legislativo: termina la solicitud con la recomendación elegida y
   * reabre (o crea) el turno del Poder Judicial para que la concluya.
   */
  async resolver(id: number, recomendacionId: number, user: UsuarioActual, archivo?: Express.Multer.File) {
    if (!archivo) throw new BadRequestException('Adjunta el documento de la resolución');
    const s = await this.solicitudEnEstatus(id, ESTATUS_SOLICITUD.enEvaluacion);
    const recomendacion = await this.recomendacionModel.findByPk(recomendacionId);
    if (!recomendacion || recomendacion.estado === RECOMENDACION_OPINION_CONSULTIVA) {
      throw new BadRequestException('Selecciona el tipo de resolución');
    }

    const judicial = await this.usuarioModel.findOne({
      where: { institucion_id: await this.nombres.institucion(INSTITUCION.judicial) },
      order: [['id', 'ASC']],
    });

    await this.sequelize.transaction(async (transaction) => {
      await s.update(
        {
          recomendacion_id: recomendacion.id,
          estatus_solicitud_id: await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.terminada),
          fecha_finalizo: new Date(),
        },
        { transaction },
      );

      if (judicial) {
        const enEvaluacion = await this.nombres.estatusTurno(ESTATUS_TURNO.enEvaluacion);
        const turno = await this.turnoModel.findOne({ where: { solicitud_id: s.id, user_id: judicial.id }, transaction });
        if (turno) await turno.update({ estatus_turno_id: enEvaluacion }, { transaction });
        else await this.turnoModel.create({ solicitud_id: s.id, user_id: judicial.id, estatus_turno_id: enEvaluacion }, { transaction });
      }

      await this.archivos.registrar({
        solicitudId: s.id,
        contenido: archivo.buffer,
        nombreDocumento: 'Resolución Poder Legislativo.pdf',
        descripcion: `RESPUESTA DE ${user.institucion}`,
        userId: user.sub,
        transaction,
      });
    });
    return { ok: true };
  }

  async regenerarDocumentos(id: number) {
    const s = await this.solicitudModel.findByPk(id, { include: [{ model: Persona, as: 'solicitante' }] });
    if (!s) throw new NotFoundException('No existe la solicitud');
    const acuse = await this.sequelize.transaction((transaction) => this.generados.generarAcuseYFicha(s.id, transaction));
    if (s.solicitante.email) {
      const nombre = s.solicitante.primer_apellido ? nombreCompleto(s.solicitante) : (s.solicitante.nombre ?? '');
      void this.correo.enviarSinFallar(s.solicitante.email, 'Recepción de solicitud', this.correo.acuseRecibido(nombre, acuse.uuid));
    }
    return { ok: true };
  }

  // ---------------------------------------------------------------------------------------
  // Turnos
  // ---------------------------------------------------------------------------------------

  async turnos(id: number, user: UsuarioActual) {
    await this.verificarAcceso(id, user);
    const turnos = await this.turnoModel.findAll({
      where: { solicitud_id: id },
      include: [EstatusTurno, Recomendacion, { model: Usuario, include: [Institucion] }],
      order: [['id', 'ASC']],
    });
    return turnos.map((t) => ({
      id: t.id,
      usuarioId: t.user_id,
      usuario: nombreCompleto(t.user),
      institucion: t.user?.institucion?.nombre_institucion ?? '',
      estatus: t.estatus?.nombre ?? '',
      prevencion: t.prevencion,
      recomendacion: t.recomendacion?.estado ?? 'EN ESPERA',
      fechaTurno: t.created_at,
      fechaEvaluacion: t.fecha_evaluacion,
      fechaTermino: t.fecha_termino,
    }));
  }

  async turnar(id: number, usuarioId: number) {
    const s = await this.solicitudEnEstatus(id, ESTATUS_SOLICITUD.enEvaluacion, [
      { model: Persona, as: 'solicitante' },
    ]);
    const usuario = await this.usuarioModel.findByPk(usuarioId);
    if (!usuario) throw new NotFoundException('No existe el usuario');

    const existentes = await this.turnoModel.findAll({ where: { solicitud_id: id }, include: [Usuario] });
    if (existentes.some((t) => t.user?.institucion_id === usuario.institucion_id)) {
      throw new ConflictException('Ya existe un usuario turnado de esta institución');
    }

    await this.turnoModel.create({
      solicitud_id: id,
      user_id: usuario.id,
      estatus_turno_id: await this.nombres.estatusTurno(ESTATUS_TURNO.turnada),
    });
    await s.update({ turnado: true });
    void this.correo.enviarSinFallar(
      usuario.email,
      'Solicitud de amnistía turnada',
      this.correo.turnoInstitucion(usuario.institucion_id, nombreCompleto(s.solicitante), nus(s)),
    );
    return { ok: true };
  }

  async quitarTurno(id: number, turnoId: number) {
    const turno = await this.turnoModel.findOne({ where: { id: turnoId, solicitud_id: id } });
    if (!turno) throw new NotFoundException('No existe el turno');
    await turno.destroy();
    return { ok: true };
  }

  /** El Legislativo atiende la prevención de una institución: el turno vuelve a evaluación. */
  async responderPrevencion(id: number, turnoId: number, user: UsuarioActual, archivo?: Express.Multer.File) {
    if (!archivo) throw new BadRequestException('Adjunta el documento de respuesta');
    const turno = await this.turnoModel.findOne({
      where: { id: turnoId, solicitud_id: id },
      include: [{ model: Usuario, include: [Institucion] }],
    });
    if (!turno) throw new NotFoundException('No existe el turno');
    if (turno.estatus_turno_id !== (await this.nombres.estatusTurno(ESTATUS_TURNO.prevencion))) {
      throw new BadRequestException('El turno no está en prevención');
    }

    await this.sequelize.transaction(async (transaction) => {
      await turno.update({ estatus_turno_id: await this.nombres.estatusTurno(ESTATUS_TURNO.enEvaluacion) }, { transaction });
      await this.archivos.registrar({
        solicitudId: id,
        contenido: archivo.buffer,
        nombreDocumento: 'Respuesta prevencion.pdf',
        descripcion: `RESPUESTA A PREVENCIÓN DE ${turno.user?.institucion?.nombre_institucion ?? ''}`,
        userId: user.sub,
        transaction,
      });
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------------------
  // Flujo de las instituciones turnadas
  // ---------------------------------------------------------------------------------------

  async indicarRecepcion(id: number, user: UsuarioActual) {
    const turno = await this.miTurno(id, user, ESTATUS_TURNO.turnada);
    await turno.update({
      estatus_turno_id: await this.nombres.estatusTurno(ESTATUS_TURNO.enEvaluacion),
      fecha_evaluacion: new Date(),
    });
    return { ok: true };
  }

  async prevenir(id: number, user: UsuarioActual, archivo?: Express.Multer.File) {
    if (!archivo) throw new BadRequestException('Adjunta el documento de prevención');
    const turno = await this.miTurno(id, user, ESTATUS_TURNO.enEvaluacion);
    await this.sequelize.transaction(async (transaction) => {
      await turno.update(
        { estatus_turno_id: await this.nombres.estatusTurno(ESTATUS_TURNO.prevencion), prevencion: true },
        { transaction },
      );
      await this.archivos.registrar({
        solicitudId: id,
        contenido: archivo.buffer,
        nombreDocumento: 'Prevencion.pdf',
        descripcion: `PREVENCIÓN DE ${user.institucion}`,
        userId: user.sub,
        transaction,
      });
    });
    return { ok: true };
  }

  /** Opinión consultiva de la institución: termina su turno. */
  async opinar(id: number, user: UsuarioActual, archivo?: Express.Multer.File) {
    if (!archivo) throw new BadRequestException('Adjunta el documento con la opinión consultiva');
    const turno = await this.miTurno(id, user, ESTATUS_TURNO.enEvaluacion);
    await this.sequelize.transaction(async (transaction) => {
      await turno.update(
        {
          estatus_turno_id: await this.nombres.estatusTurno(ESTATUS_TURNO.terminada),
          recomendacion_id: await this.nombres.recomendacion(RECOMENDACION_OPINION_CONSULTIVA),
          fecha_termino: new Date(),
        },
        { transaction },
      );
      await this.archivos.registrar({
        solicitudId: id,
        contenido: archivo.buffer,
        nombreDocumento: 'Opinion consultiva.pdf',
        descripcion: `RESPUESTA DE ${user.institucion}`,
        userId: user.sub,
        transaction,
      });
    });
    return { ok: true };
  }

  /** El Poder Judicial concluye una solicitud ya resuelta por el Legislativo. */
  async concluir(id: number, user: UsuarioActual, archivo?: Express.Multer.File) {
    if (!user.judicial) throw new ForbiddenException('Solo el Poder Judicial puede concluir la solicitud');
    if (!archivo) throw new BadRequestException('Adjunta el documento de conclusión');
    const s = await this.solicitudEnEstatus(id, ESTATUS_SOLICITUD.terminada);
    const turno = await this.miTurno(id, user, ESTATUS_TURNO.enEvaluacion);

    await this.sequelize.transaction(async (transaction) => {
      await s.update({ estatus_solicitud_id: await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.concluida) }, { transaction });
      await turno.update(
        { estatus_turno_id: await this.nombres.estatusTurno(ESTATUS_TURNO.terminada), fecha_termino: new Date() },
        { transaction },
      );
      await this.archivos.registrar({
        solicitudId: id,
        contenido: archivo.buffer,
        nombreDocumento: 'Conclusión solicitud.pdf',
        descripcion: `CONCLUSIÓN DE ${user.institucion}`,
        userId: user.sub,
        transaction,
      });
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------------------
  // Documentos
  // ---------------------------------------------------------------------------------------

  async documentos(id: number, user: UsuarioActual) {
    await this.verificarAcceso(id, user);
    const docs = await this.documentoModel.findAll({
      where: { documentable_id: id, documentable_type: MORPH.solicitud },
      include: [{ model: Usuario, include: [Institucion] }],
      order: [['id', 'DESC']],
    });
    return docs.map((d) => ({
      id: d.id,
      uuid: d.uuid,
      nombre: d.nombre_documento,
      descripcion: d.descripcion,
      tamanoKb: Number(d.tamano) || 0,
      fecha: d.created_at,
      fichaTecnica: d.ficha_tecnica,
      usuarioId: d.user_id,
      usuario: d.user ? nombreCompleto(d.user) : 'Usuario externo',
      institucion: d.user?.institucion?.nombre_institucion ?? 'Peticionario',
    }));
  }

  async subirDocumento(id: number, user: UsuarioActual, descripcion: string, archivo?: Express.Multer.File) {
    if (!archivo) throw new BadRequestException('Selecciona el documento');
    await this.verificarAcceso(id, user);
    const doc = await this.archivos.registrar({
      solicitudId: id,
      contenido: archivo.buffer,
      nombreDocumento: archivo.originalname,
      descripcion: descripcion.trim().toUpperCase(),
      userId: user.sub,
    });
    return { id: doc.id, uuid: doc.uuid };
  }

  async verificarAcceso(id: number, user: UsuarioActual) {
    const existe = await this.solicitudModel.count({ where: { id } });
    if (!existe) throw new NotFoundException('No existe la solicitud');
    if (veTodas(user)) return;
    const turno = await this.turnoModel.count({ where: { solicitud_id: id, user_id: user.sub } });
    if (!turno) throw new ForbiddenException('Esta solicitud no se te ha turnado');
  }

  // ---------------------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------------------

  private async solicitudEnEstatus(id: number, estatus: string, include: object[] = []) {
    const s = await this.solicitudModel.findByPk(id, { include });
    if (!s) throw new NotFoundException('No existe la solicitud');
    if (s.estatus_solicitud_id !== (await this.nombres.estatusSolicitud(estatus))) {
      throw new BadRequestException(`La solicitud debe estar en estatus ${estatus} para esta acción`);
    }
    return s;
  }

  private async miTurno(id: number, user: UsuarioActual, estatus: string) {
    const turno = await this.turnoModel.findOne({ where: { solicitud_id: id, user_id: user.sub } });
    if (!turno) throw new ForbiddenException('Esta solicitud no se te ha turnado');
    if (turno.estatus_turno_id !== (await this.nombres.estatusTurno(estatus))) {
      throw new BadRequestException(`Tu turno debe estar en estatus ${estatus} para esta acción`);
    }
    return turno;
  }

  private async idsEstatus() {
    return {
      solicitud: {
        registrada: await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.registrada),
        enEvaluacion: await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.enEvaluacion),
        terminada: await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.terminada),
        noProcede: await this.nombres.estatusSolicitud(ESTATUS_SOLICITUD.noProcede),
      },
      turno: {
        turnada: await this.nombres.estatusTurno(ESTATUS_TURNO.turnada),
        enEvaluacion: await this.nombres.estatusTurno(ESTATUS_TURNO.enEvaluacion),
        terminada: await this.nombres.estatusTurno(ESTATUS_TURNO.terminada),
      },
    };
  }

  private etiquetaTurno(turno: SolicitudUser, ids: Awaited<ReturnType<SolicitudesService['idsEstatus']>>) {
    if (turno.estatus_turno_id === ids.turno.enEvaluacion && turno.prevencion) return 'PREVENCIÓN ATENDIDA';
    if (turno.estatus_turno_id === ids.turno.terminada) return 'ATENDIDA';
    return 'PENDIENTE';
  }

  /**
   * Semáforo de atención: verde si ya salió de evaluación; si sigue en evaluación, se pinta por
   * días desde que se aceptó (≤20 amarillo, ≤40 naranja, más rojo). Registradas y no procedentes no llevan.
   */
  private semaforo(s: Solicitud, ids: Awaited<ReturnType<SolicitudesService['idsEstatus']>>): Semaforo {
    const estatus = s.estatus_solicitud_id;
    if (estatus === ids.solicitud.registrada || estatus === ids.solicitud.noProcede) return null;
    if (estatus !== ids.solicitud.enEvaluacion) return 'verde';
    const desde = s.fecha_aprovacion ?? s.created_at;
    const dias = Math.floor((Date.now() - new Date(desde).getTime()) / DIA_MS);
    if (dias <= 20) return 'amarillo';
    if (dias <= 40) return 'naranja';
    return 'rojo';
  }
}
