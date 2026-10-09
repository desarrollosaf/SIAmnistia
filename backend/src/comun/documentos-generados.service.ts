import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Op, Transaction } from 'sequelize';
import { createHash, randomBytes } from 'crypto';
import { Solicitud, nus } from '../database/models/solicitud.model';
import { Persona } from '../database/models/persona.model';
import { SolicitudCarpeta } from '../database/models/solicitud-carpeta.model';
import { CarpetaDelito } from '../database/models/carpeta-delito.model';
import { RazonSolicitud } from '../database/models/razon-solicitud.model';
import { Domicilio } from '../database/models/domicilio.model';
import { Entidad } from '../database/models/entidad.model';
import { Municipio } from '../database/models/municipio.model';
import { Genero } from '../database/models/genero.model';
import { Parentesco } from '../database/models/parentesco.model';
import { SituacionJuridica } from '../database/models/situacion-juridica.model';
import { NivelDelito } from '../database/models/nivel-delito.model';
import { SolicitudDatosFormato } from '../database/models/solicitud-datos-formato.model';
import { Documento, DOC } from '../database/models/documento.model';
import { nombreCompleto } from '../database/models/usuario.model';
import { MORPH } from '../database/models/opciones-tabla';
import { ArchivosService } from './archivos.service';
import { PdfService, DatosFormatoSolicitud } from './pdf.service';

/** Cadena aleatoria de validación del acuse; el QR lleva su MD5 (como el sistema anterior). */
export function nuevaCadenaValidacion() {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const cadena = Array.from(randomBytes(250), (b) => alfabeto[b % alfabeto.length]).join('');
  return { cadena, codificada: createHash('md5').update(cadena).digest('hex') };
}

const ENTIDADES_CURP = new Set([
  'AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG', 'GT', 'GR', 'HG', 'JC', 'MC', 'MN', 'MS',
  'NT', 'NL', 'OC', 'PL', 'QT', 'QR', 'SP', 'SL', 'SR', 'TC', 'TS', 'TL', 'VZ', 'YN', 'ZS',
]);

/** Nacionalidad según la entidad de nacimiento de la CURP (posiciones 12-13): "NE" es nacido en el extranjero. */
export function nacionalidadDeCurp(curp: string | null | undefined): string {
  const entidad = (curp ?? '').trim().toUpperCase().slice(11, 13);
  if (entidad === 'NE') return 'EXTRANJERA';
  return ENTIDADES_CURP.has(entidad) ? 'MEXICANA' : '';
}

/** Sexo registrado en la CURP (posición 11): H u M. */
export function sexoDeCurp(curp: string | null | undefined): 'HOMBRE' | 'MUJER' | null {
  const sexo = (curp ?? '').trim().toUpperCase().charAt(10);
  return sexo === 'H' ? 'HOMBRE' : sexo === 'M' ? 'MUJER' : null;
}

/** Fecha de nacimiento (YYYY-MM-DD) de la CURP (posiciones 5-10); el siglo se deduce del carácter 17 (dígito: 1900, letra: 2000). */
export function fechaNacimientoDeCurp(curp: string | null | undefined): string | null {
  const c = (curp ?? '').trim().toUpperCase();
  const m = c.match(/^.{4}(\d{2})(\d{2})(\d{2})/);
  if (!m || c.length < 17) return null;
  const anio = (/\d/.test(c.charAt(16)) ? 1900 : 2000) + Number(m[1]);
  const fecha = new Date(Date.UTC(anio, Number(m[2]) - 1, Number(m[3])));
  const valida = fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === Number(m[2]) - 1 && fecha.getUTCDate() === Number(m[3]);
  return valida ? `${anio}-${m[2]}-${m[3]}` : null;
}

/**
 * Documentos que el sistema genera para cada solicitud: acuse de recibo, narrativa de hechos,
 * información complementaria y la ficha técnica (acuse + anexos en un solo PDF).
 */
@Injectable()
export class DocumentosGeneradosService {
  private readonly appUrl: string;

  constructor(
    @InjectModel(Solicitud) private readonly solicitudModel: typeof Solicitud,
    @InjectModel(Documento) private readonly documentoModel: typeof Documento,
    private readonly archivos: ArchivosService,
    private readonly pdf: PdfService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('app.url')!;
  }

  /** Narrativa de hechos e información complementaria capturadas en el formulario público. */
  async generarNarrativas(solicitudId: number, transaction?: Transaction): Promise<void> {
    const s = await this.cargar(solicitudId, transaction);
    const firmante = s.solicitante.primer_apellido ? nombreCompleto(s.solicitante) : (s.solicitante.nombre ?? '');

    const complementaria = await this.pdf.informacion({
      nus: nus(s),
      titulo: 'Detalles sobre su solicitud',
      contenidoHtml: s.informacion_complementaria ?? '',
      firmante,
    });
    await this.archivos.registrar({
      solicitudId,
      contenido: complementaria,
      nombreDocumento: DOC.informacionComplementaria,
      descripcion: 'Documento generado a petición del peticionario para brindar más detalles sobre su caso',
      transaction,
    });

    const observaciones = await this.pdf.informacion({
      nus: nus(s),
      titulo: 'Información complementaria de la narrativa de hechos',
      contenidoHtml: s.observaciones_hechos ?? '',
      firmante,
    });
    await this.archivos.registrar({
      solicitudId,
      contenido: observaciones,
      nombreDocumento: DOC.observacionesHechos,
      descripcion: 'Documento generado a petición del peticionario para brindar más detalles sobre su narrativa de hechos',
      transaction,
    });
  }

  /**
   * Genera una cadena de validación nueva, el acuse con su QR y la ficha técnica. Si ya había
   * acuse o ficha (regeneración) se eliminan los anteriores. Devuelve el documento del acuse.
   */
  async generarAcuseYFicha(solicitudId: number, transaction?: Transaction): Promise<Documento> {
    const { cadena, codificada } = nuevaCadenaValidacion();
    await this.solicitudModel.update(
      { cadena_validacion: cadena, cadena_validacion_codificada: codificada },
      { where: { id: solicitudId }, transaction },
    );
    const s = await this.cargar(solicitudId, transaction);

    const anteriores = await this.documentoModel.findAll({
      where: {
        documentable_id: solicitudId,
        documentable_type: MORPH.solicitud,
        nombre_documento: { [Op.in]: [DOC.acuse, DOC.fichaTecnica, DOC.formatoSolicitud] },
      },
      transaction,
    });
    for (const doc of anteriores) {
      await doc.destroy({ transaction });
      await this.archivos.eliminar(doc.ruta);
    }

    const carpetas = s.solicitud_carpetas ?? [];
    const acusePdf = await this.pdf.acuse({
      nus: nus(s),
      fechaRecepcion: s.created_at,
      beneficiario: [s.beneficiario.primer_apellido, s.beneficiario.segundo_apellido, s.beneficiario.nombre]
        .filter(Boolean)
        .join(' '),
      personaFisica: !!s.solicitante.primer_apellido,
      razones: carpetas.map((c) => c.razon_solicitud?.valor).filter(Boolean).join(', '),
      delitos: carpetas.flatMap((c) => (c.delitos ?? []).map((d) => d.delito)).join('; '),
      carpetas: carpetas.map((c) => c.carpeta).join(', '),
      email: s.solicitante.email ?? '',
      telefono: s.solicitante.telefono ?? '',
      cadena,
      urlValidacion: `${this.appUrl}/validar-acuse/${codificada}`,
    });
    const acuse = await this.archivos.registrar({
      solicitudId,
      contenido: acusePdf,
      nombreDocumento: DOC.acuse,
      descripcion: 'acuse de recibo de solicitud',
      transaction,
    });

    // Formato "Solicitud de amnistía" prellenado, que se genera junto con el acuse: el de familiares o
    // representante legal (persona física) o el de organismos públicos defensores de Derechos Humanos.
    const datosFormato = await this.datosFormato(s, transaction);
    const formatoPdf = await this.pdf.formatoSolicitud(datosFormato);
    await this.archivos.registrar({
      solicitudId,
      contenido: formatoPdf,
      nombreDocumento: DOC.formatoSolicitud,
      descripcion: `Formato de solicitud de amnistía (${datosFormato.tipo === 'FISICA' ? 'persona física' : 'organismo'})`,
      transaction,
    });

    // Ficha técnica: acuse + formato + verdad de hechos + narrativa + información complementaria + sentencia.
    const anexos = await this.documentoModel.findAll({
      where: {
        documentable_id: solicitudId,
        documentable_type: MORPH.solicitud,
        nombre_documento: {
          [Op.in]: [DOC.verdadHechos, DOC.observacionesHechos, DOC.informacionComplementaria, DOC.sentencia],
        },
      },
      order: [['id', 'DESC']],
      transaction,
    });
    const orden = [DOC.verdadHechos, DOC.observacionesHechos, DOC.informacionComplementaria, DOC.sentencia];
    const partes: Buffer[] = [acusePdf, formatoPdf];
    for (const nombre of orden) {
      const doc = anexos.find((a) => a.nombre_documento === nombre);
      if (doc && (await this.archivos.existe(doc.ruta))) {
        partes.push(await this.archivos.leer(doc.ruta));
      }
    }
    await this.archivos.registrar({
      solicitudId,
      contenido: await this.pdf.unir(partes),
      nombreDocumento: DOC.fichaTecnica,
      descripcion: 'Ficha técnica de la solicitud',
      fichaTecnica: true,
      transaction,
    });

    return acuse;
  }

  /** Reúne lo capturado en el registro para prellenar el formato; lo que no se captura queda en blanco. */
  private async datosFormato(s: Solicitud, transaction?: Transaction): Promise<DatosFormatoSolicitud> {
    const completo = await this.solicitudModel.findByPk(s.id, {
      include: [
        { model: Persona, as: 'solicitante', include: [Parentesco, { model: Domicilio, include: [Entidad, Municipio] }] },
        { model: Persona, as: 'beneficiario', include: [Genero] },
        SituacionJuridica,
        NivelDelito,
        SolicitudDatosFormato,
      ],
      transaction,
    });
    const sol = completo!.solicitante;
    const ben = completo!.beneficiario;
    const carpetas = s.solicitud_carpetas ?? [];
    const dom = sol.domicilio;
    const datos = completo!.datos_formato;

    const domicilio = dom
      ? [
          [dom.calle, dom.num_ext && `No. ${dom.num_ext}`, dom.num_int && `Int. ${dom.num_int}`].filter(Boolean).join(' '),
          dom.colonia && `Col. ${dom.colonia}`,
          dom.municipio?.municipio,
          dom.entidad?.entidad,
          dom.codigo_postal && `C.P. ${dom.codigo_postal}`,
        ].filter(Boolean).join(', ')
      : '';

    const parentesco = sol.relacion && sol.parentesco
      ? (sol.parentesco.clave === 'OTRO' ? (sol.parentesco_otro ?? '') : sol.parentesco.valor)
      : null;

    const generoNombre = (ben.genero?.nombre ?? '').toUpperCase();
    const situacionNombre = (completo!.situacion_juridica?.nombre ?? '').toUpperCase();
    const nivelNombre = (completo!.nivel_delito?.nombre ?? '').toUpperCase();

    const adjuntos = await this.documentoModel.findAll({
      where: { documentable_id: s.id, documentable_type: MORPH.solicitud },
      attributes: ['nombre_documento', 'descripcion'],
      transaction,
    });
    const tiene = (nombre: string) => adjuntos.some((a) => a.nombre_documento === nombre);

    return {
      tipo: sol.primer_apellido ? 'FISICA' : 'ORGANISMO',
      fecha: s.created_at,
      solicitante: sol.primer_apellido ? nombreCompleto(sol) : (sol.nombre ?? ''),
      organismo: sol.nombre ?? '',
      titular: [datos?.titular_nombre, datos?.titular_primer_apellido, datos?.titular_segundo_apellido].filter(Boolean).join(' '),
      autorizacionOrganismo: tiene(DOC.autorizacionOrganismo),
      acreditacionTitular: {
        adjunta: tiene(DOC.acreditacionTitular),
        descripcion: adjuntos.find((a) => a.nombre_documento === DOC.acreditacionTitular)?.descripcion ?? '',
      },
      beneficiario: nombreCompleto(ben),
      fechaNacimientoBeneficiario: ben.fecha_nacimiento || fechaNacimientoDeCurp(ben.curp),
      delitos: carpetas.flatMap((c) => (c.delitos ?? []).map((d) => d.delito)).join('; '),
      parentesco,
      designacionRepresentante: tiene(DOC.designacionRepresentante),
      domicilio,
      email: sol.email ?? '',
      telefono: sol.telefono ?? '',
      celular: sol.celular ?? '',
      sexo: generoNombre === 'MUJER' ? 'MUJER' : generoNombre === 'HOMBRE' ? 'HOMBRE' : generoNombre ? null : sexoDeCurp(ben.curp),
      nacionalidad: ben.nacionalidad || nacionalidadDeCurp(ben.curp),
      ocupacion: ben.ocupacion ?? '',
      jurisdiccion: nivelNombre === 'LOCAL' ? 'LOCAL' : nivelNombre === 'FEDERAL' ? 'FEDERAL' : null,
      privadoLibertad: !!completo!.cprs?.trim(),
      centroPenitenciario: completo!.cprs ?? '',
      situacion: situacionNombre.startsWith('INVESTIG') ? 'INVESTIGADA' : situacionNombre === 'PROCESADO' ? 'PROCESADO' : situacionNombre === 'SENTENCIADO' ? 'SENTENCIADO' : null,
      causaPenal: carpetas.map((c) => c.carpeta).join(', '),
      juzgado: completo!.juzgado ?? '',
      documentacion: {
        identificacion: tiene('Identificacion.pdf'),
        acta: tiene('acta_peticionario.pdf'),
        averiguacionPrevia: tiene(DOC.averiguacionPrevia),
        constanciasProceso: tiene(DOC.constanciasProceso) || tiene(DOC.sentencia),
        noReincidencia: tiene(DOC.noReincidencia),
        situacionSocioeconomica: tiene(DOC.situacionSocioeconomica),
        calidadIndigena: tiene(DOC.calidadIndigena),
        otro: adjuntos.filter((a) => a.nombre_documento === DOC.otroDocumento).map((a) => a.descripcion).join('; '),
      },
      complemento: {
        estado_se_encuentra: datos?.estado_se_encuentra ?? null,
        fecha_comision_delito: datos?.fecha_comision_delito ?? null,
        comunidad: datos?.comunidad ?? null,
        comunidad_indigena_cual: datos?.comunidad_indigena_cual ?? null,
        interprete: datos?.interprete ?? null,
        discapacidad: datos?.discapacidad ?? null,
        discapacidad_cual: datos?.discapacidad_cual ?? null,
        enfermedad_cronica: datos?.enfermedad_cronica ?? null,
        enfermedad_cronica_cual: datos?.enfermedad_cronica_cual ?? null,
        ocupacion_previa: datos?.ocupacion_previa ?? null,
        dependientes_economicos: datos?.dependientes_economicos ?? null,
        situacion_libertad: datos?.situacion_libertad ?? null,
        medida_seguridad_cual: datos?.medida_seguridad_cual ?? null,
        investigacion_numero: datos?.investigacion_numero ?? null,
        investigacion_agencia: datos?.investigacion_agencia ?? null,
        pena_anios: datos?.pena_anios ?? null,
        pena_meses: datos?.pena_meses ?? null,
        multa: datos?.multa ?? null,
        multa_monto: datos?.multa_monto ?? null,
        apelacion: datos?.apelacion ?? null,
        apelacion_toca: datos?.apelacion_toca ?? null,
        apelacion_tribunal: datos?.apelacion_tribunal ?? null,
        apelacion_resolucion: datos?.apelacion_resolucion ?? null,
        pena_modificada: datos?.pena_modificada ?? null,
        pena_compurgar_anios: datos?.pena_compurgar_anios ?? null,
        pena_compurgar_meses: datos?.pena_compurgar_meses ?? null,
        amparo: datos?.amparo ?? null,
        amparo_efectos: datos?.amparo_efectos ?? null,
        amparo_concedido: datos?.amparo_concedido ?? null,
        sentenciado_antes_mismo_delito: datos?.sentenciado_antes_mismo_delito ?? null,
        otro_proceso: datos?.otro_proceso ?? null,
        otro_proceso_expediente: datos?.otro_proceso_expediente ?? null,
        otro_proceso_juzgado: datos?.otro_proceso_juzgado ?? null,
      },
      argumentoHtml: completo!.observaciones_hechos ?? '',
    };
  }

  /** uuid del formato de solicitud vigente (el que se liga en el correo y en la descarga pública). */
  async uuidFormato(solicitudId: number): Promise<string | null> {
    const doc = await this.documentoModel.findOne({
      where: { documentable_id: solicitudId, documentable_type: MORPH.solicitud, nombre_documento: DOC.formatoSolicitud },
      attributes: ['uuid'],
      order: [['id', 'DESC']],
    });
    return doc?.uuid ?? null;
  }

  private async cargar(id: number, transaction?: Transaction): Promise<Solicitud> {
    const s = await this.solicitudModel.findByPk(id, {
      include: [
        { model: Persona, as: 'solicitante' },
        { model: Persona, as: 'beneficiario' },
        { model: SolicitudCarpeta, include: [RazonSolicitud, CarpetaDelito] },
      ],
      transaction,
    });
    if (!s) throw new NotFoundException('No existe la solicitud');
    return s;
  }
}
