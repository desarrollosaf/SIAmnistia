import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Op, Sequelize, Transaction } from 'sequelize';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { randomBytes } from 'crypto';
import { rm } from 'fs/promises';
import { join } from 'path';
import { Solicitud, nus } from '../database/models/solicitud.model';
import { Persona, TIPO_PERSONA_BENEFICIARIO, TIPO_PERSONA_SOLICITANTE } from '../database/models/persona.model';
import { Domicilio } from '../database/models/domicilio.model';
import { SolicitudCarpeta } from '../database/models/solicitud-carpeta.model';
import { CarpetaDelito } from '../database/models/carpeta-delito.model';
import { Delito, NOMBRE_DELITO_OTRO } from '../database/models/delito.model';
import { ModalidadDelito } from '../database/models/modalidad-delito.model';
import { TipoSolicitante } from '../database/models/tipo-solicitante.model';
import { SituacionJuridica } from '../database/models/situacion-juridica.model';
import { Parentesco } from '../database/models/parentesco.model';
import { SolicitudDatosFormato } from '../database/models/solicitud-datos-formato.model';
import { Genero } from '../database/models/genero.model';
import { Documento, DOC } from '../database/models/documento.model';
import { SolicitudUser } from '../database/models/solicitud-user.model';
import { Usuario, nombreCompleto } from '../database/models/usuario.model';
import { Institucion } from '../database/models/institucion.model';
import { EstatusSolicitud } from '../database/models/estatus-solicitud.model';
import { EstatusTurno } from '../database/models/estatus-turno.model';
import { Recomendacion } from '../database/models/recomendacion.model';
import { TokenConsulta } from '../database/models/token-consulta.model';
import { MORPH } from '../database/models/opciones-tabla';
import { ArchivosService, UPLOADS_ROOT } from '../comun/archivos.service';
import { CatalogoNombresService } from '../comun/catalogo-nombres.service';
import { ContadorService } from '../comun/contador.service';
import { CorreoService } from '../comun/correo.service';
import { DocumentosGeneradosService } from '../comun/documentos-generados.service';
import { DatosFormatoDto, OtroDocumentoDto, RegistroSolicitudDto, SolicitanteDto } from './dto/registro-solicitud.dto';

export interface ArchivosRegistro {
  identificacion?: Express.Multer.File[];
  curp?: Express.Multer.File[];
  acta_nacimiento?: Express.Multer.File[];
  designacion_representante?: Express.Multer.File[];
  autorizacion_organismo?: Express.Multer.File[];
  acreditacion_titular?: Express.Multer.File[];
  sentencia?: Express.Multer.File[];
  verdad_hechos?: Express.Multer.File[];
  averiguacion_previa?: Express.Multer.File[];
  constancias_proceso?: Express.Multer.File[];
  no_reincidencia?: Express.Multer.File[];
  situacion_socioeconomica?: Express.Multer.File[];
  calidad_indigena?: Express.Multer.File[];
  otros_documentos?: Express.Multer.File[];
}

const MINUTOS_TOKEN = 60;
const SITUACION_SENTENCIADO = 'Sentenciado';
const SITUACION_OTRO = 'Otro';
const CLAVE_PARENTESCO_OTRO = 'OTRO';
const GENERO_OTRO = 'OTRO';

function primerError(errores: ValidationError[]): string {
  for (const e of errores) {
    if (e.constraints) return Object.values(e.constraints)[0];
    if (e.children?.length) {
      const hijo = primerError(e.children);
      if (hijo) return hijo;
    }
  }
  return 'Los datos de la solicitud no son válidos';
}

/** Registro de solicitudes desde el formulario público y consulta de estatus por token. */
@Injectable()
export class PublicoService {
  private readonly logger = new Logger('Publico');

  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(Solicitud) private readonly solicitudModel: typeof Solicitud,
    @InjectModel(Persona) private readonly personaModel: typeof Persona,
    @InjectModel(Domicilio) private readonly domicilioModel: typeof Domicilio,
    @InjectModel(SolicitudCarpeta) private readonly carpetaModel: typeof SolicitudCarpeta,
    @InjectModel(CarpetaDelito) private readonly carpetaDelitoModel: typeof CarpetaDelito,
    @InjectModel(Delito) private readonly delitoModel: typeof Delito,
    @InjectModel(ModalidadDelito) private readonly modalidadModel: typeof ModalidadDelito,
    @InjectModel(TipoSolicitante) private readonly tipoSolicitanteModel: typeof TipoSolicitante,
    @InjectModel(SituacionJuridica) private readonly situacionModel: typeof SituacionJuridica,
    @InjectModel(Parentesco) private readonly parentescoModel: typeof Parentesco,
    @InjectModel(SolicitudDatosFormato) private readonly datosFormatoModel: typeof SolicitudDatosFormato,
    @InjectModel(Genero) private readonly generoModel: typeof Genero,
    @InjectModel(Documento) private readonly documentoModel: typeof Documento,
    @InjectModel(TokenConsulta) private readonly tokenModel: typeof TokenConsulta,
    private readonly archivos: ArchivosService,
    private readonly nombres: CatalogoNombresService,
    private readonly contador: ContadorService,
    private readonly correo: CorreoService,
    private readonly generados: DocumentosGeneradosService,
  ) {}

  async validarDatos(json: string | undefined): Promise<RegistroSolicitudDto> {
    let crudo: unknown;
    try {
      crudo = JSON.parse(json ?? '');
    } catch {
      throw new BadRequestException('Faltan los datos de la solicitud');
    }
    const dto = plainToInstance(RegistroSolicitudDto, crudo);
    const errores = await validate(dto, { whitelist: true });
    if (errores.length) throw new BadRequestException(primerError(errores));
    return dto;
  }

  async registrar(dto: RegistroSolicitudDto, archivos: ArchivosRegistro) {
    await this.validarReglas(dto, archivos);
    await this.validarDuplicado(dto.beneficiario.curp, dto.carpetas.map((c) => c.carpeta));

    const transaction = await this.sequelize.transaction();
    let solicitudId: number | null = null;
    try {
      const fisica = await this.esPersonaFisica(dto.solicitante.tipoSolicitanteId);
      const s = dto.solicitante;

      const solicitante = await this.personaModel.create(
        {
          tipo_persona_id: await this.nombres.tipoPersona(TIPO_PERSONA_SOLICITANTE),
          // Persona jurídica colectiva: nombre de la institución y su RFC en "curp" (como el sistema anterior).
          nombre: fisica ? s.nombre : s.nombreInstitucion,
          primer_apellido: fisica ? s.primerApellido : null,
          segundo_apellido: fisica ? (s.segundoApellido ?? null) : null,
          curp: fisica ? null : s.rfc,
          genero_id: fisica ? s.generoId : null,
          genero_otro: fisica ? (s.generoOtro ?? null) : null,
          relacion: fisica && s.relacion,
          parentesco_id: fisica && s.relacion ? (s.parentescoId ?? null) : null,
          parentesco_otro: fisica && s.relacion ? (s.parentescoOtro ?? null) : null,
          email: s.email,
          telefono: s.telefono,
          celular: s.celular,
        },
        { transaction },
      );

      const d = dto.domicilio;
      await this.domicilioModel.create(
        {
          domiciliable_id: solicitante.id,
          domiciliable_type: MORPH.persona,
          calle: d.calle,
          num_ext: d.numExt,
          num_int: d.numInt ?? null,
          colonia: d.colonia,
          codigo_postal: d.codigoPostal ?? null,
          entidad_id: d.entidadId,
          municipio_id: d.municipioId,
        },
        { transaction },
      );

      const b = dto.beneficiario;
      const beneficiario = await this.personaModel.create(
        {
          tipo_persona_id: await this.nombres.tipoPersona(TIPO_PERSONA_BENEFICIARIO),
          nombre: b.nombre,
          primer_apellido: b.primerApellido,
          segundo_apellido: b.segundoApellido ?? null,
          fecha_nacimiento: b.fechaNacimiento.slice(0, 10),
          genero_id: b.generoId,
          genero_otro: b.generoOtro ?? null,
          curp: b.curp,
        },
        { transaction },
      );

      const { folio, anio } = await this.contador.siguienteFolio(transaction);
      const sol = dto.solicitud;
      const solicitud = await this.solicitudModel.create(
        {
          folio,
          anio,
          solicitante_id: solicitante.id,
          beneficiario_id: beneficiario.id,
          cprs: sol.cprs,
          situacion_juridica_id: sol.situacionJuridicaId,
          otro_situacion_juridica: sol.otroSituacionJuridica ?? null,
          tipo_defensor_id: sol.tipoDefensorId,
          juzgado: sol.juzgado,
          perfil_criminologico_id: sol.perfilCriminologicoId,
          nivel_delito_id: sol.nivelDelitoId,
          procedimiento_abreviado: sol.procedimientoAbreviado,
          informacion_complementaria: dto.informacionComplementaria ?? null,
          observaciones_hechos: dto.observacionesHechos ?? null,
        },
        { transaction },
      );
      solicitudId = solicitud.id;

      await this.guardarCarpetas(solicitud.id, dto, transaction);
      await this.guardarDatosFormato(solicitud.id, dto.datosFormato, fisica ? null : s, transaction);
      await this.guardarArchivos(solicitud.id, archivos, dto.otrosDocumentos ?? [], s.acreditacionDescripcion, transaction);
      await this.generados.generarNarrativas(solicitud.id, transaction);
      const acuse = await this.generados.generarAcuseYFicha(solicitud.id, transaction);

      await transaction.commit();

      const formatoUuid = await this.generados.uuidFormato(solicitud.id);
      const nombreSolicitante = fisica ? nombreCompleto(solicitante) : (solicitante.nombre ?? '');
      void this.correo.enviarSinFallar(
        s.email,
        'Recepción de solicitud',
        this.correo.acuseRecibido(nombreSolicitante, acuse.uuid, formatoUuid),
      );

      return { uuid: acuse.uuid, folio: `${folio}/${anio}`, formatoUuid };
    } catch (error) {
      await transaction.rollback();
      // Los archivos ya escritos de esta solicitud quedarían huérfanos: la carpeta es nueva, se borra completa.
      if (solicitudId) {
        await rm(join(UPLOADS_ROOT, 'solicitud', String(solicitudId)), { recursive: true, force: true });
      }
      this.logger.error('No se pudo registrar la solicitud', (error as Error).stack);
      if (error instanceof BadRequestException || error instanceof ConflictException) throw error;
      throw new BadRequestException('Ocurrió un error al registrar la información. Intenta de nuevo.');
    }
  }

  /** Reglas que dependen de los catálogos o de los archivos (no caben en el DTO). */
  private async validarReglas(dto: RegistroSolicitudDto, archivos: ArchivosRegistro) {
    if ((archivos.otros_documentos?.length ?? 0) !== (dto.otrosDocumentos?.length ?? 0)) {
      throw new BadRequestException('Cada documento "Otro" debe llevar su descripción');
    }
    const s = dto.solicitante;
    const fisica = await this.esPersonaFisica(s.tipoSolicitanteId);

    if (fisica) {
      if (!s.nombre || !s.primerApellido) throw new BadRequestException('Captura el nombre y primer apellido del peticionario');
      if (!s.generoId) throw new BadRequestException('Selecciona el género del peticionario');
      await this.validarGeneroOtro(s.generoId, s.generoOtro);
      if (s.relacion) {
        if (!s.parentescoId) throw new BadRequestException('Selecciona el parentesco con el beneficiario');
        const parentesco = await this.parentescoModel.findByPk(s.parentescoId);
        if (parentesco?.clave === CLAVE_PARENTESCO_OTRO && !s.parentescoOtro) {
          throw new BadRequestException('Especifica el parentesco con el beneficiario');
        }
        if (!archivos.acta_nacimiento?.length) {
          throw new BadRequestException('Adjunta el acta de nacimiento que acredita el parentesco');
        }
      }
    } else {
      if (!s.nombreInstitucion || !s.rfc) throw new BadRequestException('Captura el nombre y RFC de la institución u organismo');
      if (!s.titularNombre || !s.titularPrimerApellido) {
        throw new BadRequestException('Captura el nombre y primer apellido del titular o representante legal del organismo');
      }
      if (archivos.acreditacion_titular?.length && !s.acreditacionDescripcion) {
        throw new BadRequestException('Describe el documento que acredita al titular o representante legal');
      }
    }

    await this.validarGeneroOtro(dto.beneficiario.generoId, dto.beneficiario.generoOtro);

    if (!archivos.identificacion?.length) throw new BadRequestException('Adjunta la identificación oficial o poder notarial');
    if (!archivos.curp?.length) throw new BadRequestException('Adjunta la constancia de CURP del beneficiario');

    const situacion = await this.situacionModel.findByPk(dto.solicitud.situacionJuridicaId);
    if (!situacion) throw new BadRequestException('Selecciona la situación jurídica');
    if (situacion.nombre === SITUACION_SENTENCIADO && !archivos.sentencia?.length) {
      throw new BadRequestException('Adjunta la sentencia definitiva');
    }
    if (situacion.nombre === SITUACION_OTRO && !dto.solicitud.otroSituacionJuridica) {
      throw new BadRequestException('Especifica la situación jurídica');
    }

    const carpetas = dto.carpetas.map((c) => c.carpeta);
    if (new Set(carpetas).size !== carpetas.length) throw new BadRequestException('Hay carpetas repetidas');
  }

  private async validarGeneroOtro(generoId: number, generoOtro?: string) {
    const genero = await this.generoModel.findByPk(generoId);
    if (!genero) throw new BadRequestException('El género seleccionado no existe');
    if (genero.nombre.trim().toUpperCase() === GENERO_OTRO && !generoOtro) {
      throw new BadRequestException('Especifica el género');
    }
  }

  /** No se admite otra solicitud del mismo beneficiario (CURP) por la misma carpeta. */
  private async validarDuplicado(curp: string, carpetas: string[]) {
    const repetida = await this.carpetaModel.findOne({
      where: { carpeta: { [Op.in]: carpetas } },
      include: [{
        model: Solicitud,
        required: true,
        include: [{ model: Persona, as: 'beneficiario', required: true, where: { curp } }],
      }],
    });
    if (repetida) {
      throw new ConflictException('Ya existe una solicitud para el mismo beneficiario y carpeta de investigación');
    }
  }

  private async esPersonaFisica(tipoSolicitanteId: number): Promise<boolean> {
    const tipo = await this.tipoSolicitanteModel.findByPk(tipoSolicitanteId);
    if (!tipo) throw new BadRequestException('Selecciona el tipo de persona');
    return tipo.nombre.trim().toUpperCase().startsWith('F');
  }

  private async guardarCarpetas(solicitudId: number, dto: RegistroSolicitudDto, transaction: Transaction) {
    for (const c of dto.carpetas) {
      const carpeta = await this.carpetaModel.create(
        {
          solicitud_id: solicitudId,
          carpeta: c.carpeta,
          tomo: c.conoceUbicacion ? (c.tomo ?? null) : null,
          foja: c.conoceUbicacion ? (c.foja ?? null) : null,
          conoce_ubicacion: c.conoceUbicacion,
          razon_solicitud_id: c.razonSolicitudId,
        },
        { transaction },
      );

      for (const d of c.delitos) {
        const delito = await this.delitoModel.findByPk(d.delitoId, { transaction });
        if (!delito) throw new BadRequestException('Uno de los delitos seleccionados no existe');

        if (delito.delito.trim().toUpperCase() === NOMBRE_DELITO_OTRO) {
          // "OTRO": se guarda el texto libre que escribió el peticionario.
          if (!d.delitoOtro) throw new BadRequestException('Falta el nombre del delito (Otro)');
          await this.carpetaDelitoModel.create(
            { solicitud_carpeta_id: carpeta.id, delito_id: delito.id, delito: d.delitoOtro },
            { transaction },
          );
          continue;
        }

        let modalidad: ModalidadDelito | null = null;
        if (d.modalidadId) {
          modalidad = await this.modalidadModel.findOne({ where: { id: d.modalidadId, delito_id: delito.id }, transaction });
          if (!modalidad) throw new BadRequestException('La modalidad no corresponde al delito');
        }
        await this.carpetaDelitoModel.create(
          {
            solicitud_carpeta_id: carpeta.id,
            delito_id: delito.id,
            modalidad_id: modalidad?.id ?? null,
            delito: modalidad ? `${delito.delito} - ${modalidad.nombre}` : delito.delito,
          },
          { transaction },
        );
      }
    }
  }

  /** Datos complementarios del beneficiario (formato de solicitud); se descartan las respuestas que dependen de un "No". */
  private async guardarDatosFormato(
    solicitudId: number,
    d: DatosFormatoDto | undefined,
    titular: SolicitanteDto | null,
    transaction: Transaction,
  ) {
    if (!d && !titular) return;
    d = d ?? {};
    const limpio: Record<string, unknown> = { ...d };
    if (titular) {
      limpio.titularNombre = titular.titularNombre;
      limpio.titularPrimerApellido = titular.titularPrimerApellido;
      limpio.titularSegundoApellido = titular.titularSegundoApellido;
    }
    const borrar = (...claves: (keyof DatosFormatoDto)[]) => claves.forEach((c) => (limpio[c] = null));
    if (d.comunidad !== 'INDIGENA') borrar('comunidadIndigenaCual');
    if (!d.discapacidad) borrar('discapacidadCual');
    if (!d.enfermedadCronica) borrar('enfermedadCronicaCual');
    if (d.situacionLibertad !== 'MEDIDA_SEGURIDAD') borrar('medidaSeguridadCual');
    if (!d.multa) borrar('multaMonto');
    if (!d.apelacion) borrar('apelacionToca', 'apelacionTribunal', 'apelacionResolucion', 'penaModificada', 'penaCompurgarAnios', 'penaCompurgarMeses');
    if (!d.penaModificada) borrar('penaCompurgarAnios', 'penaCompurgarMeses');
    if (!d.amparo) borrar('amparoEfectos', 'amparoConcedido');
    if (!d.otroProceso) borrar('otroProcesoExpediente', 'otroProcesoJuzgado');

    const columnas = Object.fromEntries(
      Object.entries(limpio).map(([k, v]) => [k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`), v === '' ? null : (v ?? null)]),
    );
    await this.datosFormatoModel.create({ solicitud_id: solicitudId, ...columnas }, { transaction });
  }

  private async guardarArchivos(
    solicitudId: number,
    archivos: ArchivosRegistro,
    otros: OtroDocumentoDto[],
    acreditacion: string | undefined,
    transaction: Transaction,
  ) {
    const adjuntos: [Express.Multer.File | undefined, string, string][] = [
      [archivos.identificacion?.[0], 'Identificacion.pdf', 'Documento que acredita la identidad física o moral'],
      [archivos.verdad_hechos?.[0], DOC.verdadHechos, 'Documento que indica la versión de la parte que solicita el beneficio de la amnistía'],
      [archivos.curp?.[0], 'curp.pdf', 'Documento CURP del beneficiario'],
      [archivos.sentencia?.[0], DOC.sentencia, 'Documento de sentencia definitiva'],
      [archivos.acta_nacimiento?.[0], 'acta_peticionario.pdf', 'Documento que acredita la relación con el beneficiario'],
      [archivos.designacion_representante?.[0], DOC.designacionRepresentante, 'Documental pública o escrito firmado por la persona interesada que designa al representante legal'],
      [archivos.autorizacion_organismo?.[0], DOC.autorizacionOrganismo, 'Documental pública o escrito firmado por la persona interesada que autoriza al organismo a realizar el trámite'],
      [archivos.acreditacion_titular?.[0], DOC.acreditacionTitular, acreditacion ?? 'Documental que acredita al titular o representante legal del organismo'],
      [archivos.averiguacion_previa?.[0], DOC.averiguacionPrevia, 'Averiguación previa o carpeta de investigación'],
      [archivos.constancias_proceso?.[0], DOC.constanciasProceso, 'Constancias del proceso penal ante el juez, sentencia de primera instancia, segunda instancia o amparo'],
      [archivos.no_reincidencia?.[0], DOC.noReincidencia, 'Documento que acredita la no reincidencia respecto al delito por el que se solicita la amnistía'],
      [archivos.situacion_socioeconomica?.[0], DOC.situacionSocioeconomica, 'Documento que acredita la situación socioeconómica'],
      [archivos.calidad_indigena?.[0], DOC.calidadIndigena, 'Documento que acredita la calidad de indígena'],
    ];
    for (const [archivo, nombreDocumento, descripcion] of adjuntos) {
      if (!archivo) continue;
      await this.archivos.registrar({ solicitudId, contenido: archivo.buffer, nombreDocumento, descripcion, transaction });
    }
    // Documentos "Otro": uno por archivo, con la descripción que capturó el peticionario.
    for (const [i, archivo] of (archivos.otros_documentos ?? []).entries()) {
      await this.archivos.registrar({
        solicitudId,
        contenido: archivo.buffer,
        nombreDocumento: DOC.otroDocumento,
        descripcion: otros[i].descripcion,
        transaction,
      });
    }
  }

  // ---------------------------------------------------------------------------------------
  // Acuse público
  // ---------------------------------------------------------------------------------------

  /** Solo se publica el acuse (no cualquier documento) por su uuid. */
  async acuse(uuid: string) {
    return this.documentoPublico(uuid, DOC.acuse, 'acuse', 'No se encontró el acuse');
  }

  /** Formato de solicitud de amnistía (persona física); se entrega solo a quien tiene su uuid, como el acuse. */
  async formato(uuid: string) {
    return this.documentoPublico(uuid, DOC.formatoSolicitud, 'formato-solicitud', 'No se encontró el formato de solicitud');
  }

  private async documentoPublico(uuid: string, nombreDocumento: string, prefijo: string, noExiste: string) {
    const doc = await this.documentoModel.findOne({ where: { uuid, nombre_documento: nombreDocumento } });
    if (!doc) throw new NotFoundException(noExiste);
    const solicitud = await this.solicitudModel.findByPk(doc.documentable_id, { attributes: ['folio', 'anio'] });
    const folio = solicitud ? `-${solicitud.folio}-${solicitud.anio}` : '';
    return { nombre: `${prefijo}${folio}.pdf`, contenido: await this.archivos.leer(doc.ruta) };
  }

  /** Lo que abre el QR del acuse: confirma que la cadena corresponde a una solicitud registrada. */
  async validarAcuse(cadenaCodificada: string) {
    const solicitud = await this.solicitudModel.findOne({
      where: { cadena_validacion_codificada: cadenaCodificada },
      include: [{ model: Documento, where: { nombre_documento: DOC.acuse }, required: false }],
    });
    if (!solicitud) throw new NotFoundException('No hay solicitudes registradas para esa cadena de validación');
    const acuse = [...(solicitud.documentos ?? [])].sort((a, b) => b.id - a.id)[0];
    return { nus: nus(solicitud), uuid: acuse?.uuid ?? null, fechaRegistro: solicitud.created_at };
  }

  // ---------------------------------------------------------------------------------------
  // Consulta de solicitudes por token
  // ---------------------------------------------------------------------------------------

  async generarToken(email: string) {
    const correo = email.trim().toLowerCase();
    const solicitantes = await this.personaModel.findAll({
      where: { email: correo },
      include: [{ model: Solicitud, as: 'solicitudes_peticionario', required: true, attributes: ['id'] }],
    });
    if (!solicitantes.length) {
      throw new NotFoundException('No hay solicitudes registradas con ese correo electrónico');
    }

    const token = randomBytes(24).toString('hex');
    await this.tokenModel.destroy({ where: { expira_en: { [Op.lt]: new Date() } } });
    await this.tokenModel.create({ token, email: correo, expira_en: new Date(Date.now() + MINUTOS_TOKEN * 60_000) });

    const ultimo = solicitantes[solicitantes.length - 1];
    const nombre = ultimo.primer_apellido ? nombreCompleto(ultimo) : (ultimo.nombre ?? '');
    await this.correo.enviar(correo, 'Consulta de solicitudes de amnistía', this.correo.tokenConsulta(nombre, correo, token, MINUTOS_TOKEN));
    return { enviado: true, minutos: MINUTOS_TOKEN };
  }

  async solicitudesPorToken(token: string) {
    const email = await this.emailDeToken(token);
    const solicitudes = await this.solicitudModel.findAll({
      include: [
        { model: Persona, as: 'solicitante', required: true, where: { email } },
        { model: Persona, as: 'beneficiario' },
        EstatusSolicitud,
      ],
      order: [['id', 'DESC']],
    });
    return solicitudes.map((s) => ({
      id: s.id,
      nus: nus(s),
      fechaRegistro: s.created_at,
      beneficiario: nombreCompleto(s.beneficiario),
      peticionario: s.solicitante.primer_apellido ? nombreCompleto(s.solicitante) : s.solicitante.nombre,
      estatus: s.estatus_solicitud?.nombre ?? '',
    }));
  }

  /** Línea de tiempo de la solicitud para el peticionario. */
  async seguimientoPorToken(token: string, id: number) {
    const email = await this.emailDeToken(token);
    const s = await this.solicitudModel.findOne({
      where: { id },
      include: [
        { model: Persona, as: 'solicitante', required: true, where: { email } },
        EstatusSolicitud,
        {
          model: SolicitudUser,
          include: [EstatusTurno, Recomendacion, { model: Usuario, include: [Institucion] }],
        },
      ],
    });
    if (!s) throw new NotFoundException('No se encontró la solicitud');

    return {
      nus: nus(s),
      estatus: s.estatus_solicitud?.nombre ?? '',
      fechaRegistro: s.created_at,
      fechaAprobacion: s.fecha_aprovacion,
      fechaFinalizo: s.fecha_finalizo,
      turnos: (s.solicitud_usuarios ?? [])
        .sort((a, b) => a.id - b.id)
        .map((t) => ({
          institucion: t.user?.institucion?.nombre_institucion ?? '',
          fechaTurno: t.created_at,
          estatus: t.estatus?.nombre ?? '',
          recomendacion: t.recomendacion?.estado ?? null,
        })),
    };
  }

  private async emailDeToken(token: string): Promise<string> {
    const registro = await this.tokenModel.findOne({ where: { token, expira_en: { [Op.gt]: new Date() } } });
    if (!registro) throw new NotFoundException('La liga de consulta expiró o no es válida. Solicita una nueva.');
    return registro.email;
  }
}
