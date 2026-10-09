import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { rutaChromium } from '../common/chromium-path.util';

const ASSETS = join(__dirname, '..', 'pdf', 'assets');
const imagenBase64 = (archivo: string) =>
  `data:image/jpeg;base64,${readFileSync(join(ASSETS, archivo)).toString('base64')}`;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const escaparHtml = (texto: string | null | undefined) =>
  (texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** "Toluca, Estado de México; 1 de octubre de 2026" en hora de México. */
export function lugarYFecha(fecha = new Date()): string {
  const [anio, mes, dia] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(fecha).split('-').map(Number);
  return `Toluca, Estado de México; ${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** "01/10/2026 14:05" en hora de México. */
export function fechaHoraMexico(fecha: Date | string | null | undefined): string {
  if (!fecha) return '';
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(fecha));
}

export interface DatosAcuse {
  nus: string;
  fechaRecepcion: Date;
  beneficiario: string;
  personaFisica: boolean;
  razones: string;
  delitos: string;
  carpetas: string;
  email: string;
  telefono: string;
  cadena: string;
  urlValidacion: string;
}

export interface ComplementoFormato {
  estado_se_encuentra: string | null;
  fecha_comision_delito: string | null;
  comunidad: 'INDIGENA' | 'AFROMEXICANA' | 'NINGUNA' | null;
  comunidad_indigena_cual: string | null;
  interprete: boolean | null;
  discapacidad: boolean | null;
  discapacidad_cual: string | null;
  enfermedad_cronica: boolean | null;
  enfermedad_cronica_cual: string | null;
  ocupacion_previa: string | null;
  dependientes_economicos: string | null;
  situacion_libertad: 'PRIVADO' | 'NO_PRIVADO' | 'MEDIDA_SEGURIDAD' | null;
  medida_seguridad_cual: string | null;
  investigacion_numero: string | null;
  investigacion_agencia: string | null;
  pena_anios: number | null;
  pena_meses: number | null;
  multa: boolean | null;
  multa_monto: string | number | null;
  apelacion: boolean | null;
  apelacion_toca: string | null;
  apelacion_tribunal: string | null;
  apelacion_resolucion: 'CONFIRMO' | 'MODIFICO' | 'REVOCO' | null;
  pena_modificada: boolean | null;
  pena_compurgar_anios: number | null;
  pena_compurgar_meses: number | null;
  amparo: boolean | null;
  amparo_efectos: string | null;
  amparo_concedido: boolean | null;
  sentenciado_antes_mismo_delito: boolean | null;
  otro_proceso: boolean | null;
  otro_proceso_expediente: string | null;
  otro_proceso_juzgado: string | null;
}

/** Datos con los que se prellena el formato "Solicitud de amnistía" (persona física). Lo no capturado queda en blanco. */
export interface DatosFormatoSolicitud {
  /** FISICA: familiares o representante legal. ORGANISMO: persona jurídica colectiva (organismo público defensor de Derechos Humanos). */
  tipo: 'FISICA' | 'ORGANISMO';
  fecha: Date;
  solicitante: string;
  /** Solo organismo: nombre del organismo y de su titular o representante legal. */
  organismo: string;
  titular: string;
  autorizacionOrganismo: boolean;
  acreditacionTitular: { adjunta: boolean; descripcion: string };
  beneficiario: string;
  fechaNacimientoBeneficiario: string | null;
  delitos: string;
  /** Familiar (con parentesco) o null si no hay relación: en ese caso el peticionario es representante legal. */
  parentesco: string | null;
  /** Adjuntó el documento que designa al representante legal. */
  designacionRepresentante: boolean;
  domicilio: string;
  email: string;
  telefono: string;
  celular: string;
  sexo: 'MUJER' | 'HOMBRE' | null;
  nacionalidad: string;
  ocupacion: string;
  jurisdiccion: 'LOCAL' | 'FEDERAL' | null;
  privadoLibertad: boolean;
  centroPenitenciario: string;
  situacion: 'INVESTIGADA' | 'PROCESADO' | 'SENTENCIADO' | null;
  causaPenal: string;
  juzgado: string;
  documentacion: {
    identificacion: boolean;
    acta: boolean;
    averiguacionPrevia: boolean;
    constanciasProceso: boolean;
    noReincidencia: boolean;
    situacionSocioeconomica: boolean;
    calidadIndigena: boolean;
    /** Descripción de "Otro" (vacía si no adjuntó otro documento). */
    otro: string;
  };
  /** Respuestas capturadas en la pestaña del beneficiario (tabla solicitud_datos_formato); null = sin responder. */
  complemento: ComplementoFormato;
  /** HTML de la narrativa de hechos capturada por el peticionario. */
  argumentoHtml: string;
}

export interface DatosInformacion {
  nus: string;
  titulo: string;
  /** HTML capturado en el editor del formulario público. */
  contenidoHtml: string;
  firmante: string;
}

/**
 * Documentos PDF del sistema: el acuse de recibo (con QR de validación), los documentos de
 * narrativa / información complementaria y la ficha técnica (unión de varios PDFs).
 * Se renderizan como HTML con Chrome headless, igual que el comprobante de SIPresupuesto.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger('Pdf');
  private readonly encabezado = imagenBase64('encabezado.jpg');
  private readonly pie = imagenBase64('pie.jpg');

  async acuse(d: DatosAcuse): Promise<Buffer> {
    const qr = await QRCode.toDataURL(d.urlValidacion, { width: 120, margin: 1 });
    const fila = (etiqueta: string, valor: string) =>
      `<tr><th>${etiqueta}</th><td>${escaparHtml(valor)}</td></tr>`;

    const cuerpo = `
      <p class="derecha">${lugarYFecha(d.fechaRecepcion)}</p>
      <p class="derecha"><strong>Solicitud número: ${escaparHtml(d.nus)}</strong></p>
      <p><strong>${escaparHtml(d.beneficiario)}</strong><br><strong>P R E S E N T E</strong></p>
      <p class="justificado">Con fundamento en los artículos 1, 3 fracción IX, 7 y 16 de la Ley de Amnistía del Estado de México, se le tiene por presentada la solicitud de Amnistía, de conformidad con los datos siguientes:</p>
      <table class="datos">
        ${fila('Fecha y hora de recepción', fechaHoraMexico(d.fechaRecepcion))}
        ${fila('Número de control interno', d.nus)}
        ${fila('Calidad en la que se solicita', d.personaFisica ? 'PERSONA FÍSICA' : 'PERSONA JURÍDICO COLECTIVA')}
        ${fila('Tipo de violación', d.razones)}
        ${fila('Delito', d.delitos)}
        ${fila('Número de causa o carpeta', d.carpetas)}
        ${fila('Correo electrónico del contacto', d.email)}
        ${fila('Teléfono del contacto', d.telefono)}
        ${fila('Notas y documentos', 'INE, CURP, JUSTIFICACIÓN, VERDAD JURÍDICA, VERDAD DE LOS HECHOS')}
        ${fila('Número de anexos', '5')}
      </table>
      <p class="justificado">En atención a lo establecido por los artículos 1, 2, 7, 16, 17 y 18 de la Ley de Amnistía del Estado de México; primero, quinto, sexto, séptimo, octavo, noveno y décimo tercero de los Lineamientos para el procedimiento de atención a los casos que por su relevancia son puestos a consideración de la Comisión Especial, la solicitud será turnada a la Comisión de Derechos Humanos del Estado de México, a la Fiscalía General de Justicia del Estado de México, al Poder Judicial del Estado de México y al Ejecutivo estatal a través de la Secretaría de Justicia y Derechos Humanos, con el objeto de recabar la opinión consultiva prevista en la ley; por lo que se le solicita tomar en consideración que el estudio y probable emisión de una recomendación requiere de un procedimiento que, por la naturaleza de cada petición, podrá ser superior a los 60 días hábiles, contados a partir del día siguiente en que sea notificada la recepción de la solicitud de la opinión consultiva por parte de las diferentes áreas.</p>
      <p class="justificado">De acuerdo con lo establecido por el artículo 17 segundo párrafo de la Ley en la materia, se le informa que la recepción de la solicitud por parte de la Comisión no implica el otorgamiento de la amnistía.</p>
      <p class="justificado">Los acuerdos y/o comunicados serán notificados mediante la plataforma, por lo que deberá contar con el número de control y la clave de acceso para consultar la información.</p>
      <table class="validacion"><tr>
        <td><p class="cadena">Cadena de validación: ${escaparHtml(d.cadena)}</p></td>
        <td class="qr"><img src="${qr}" alt="QR de validación"></td>
      </tr></table>
      <p class="centrado"><strong>ATENTAMENTE</strong></p>
      <p class="centrado firma">INTEGRANTES DE LA COMISIÓN ESPECIAL EN MATERIA DE AMNISTÍA DEL PODER LEGISLATIVO DEL ESTADO DE MÉXICO</p>`;

    return this.html(this.documento(cuerpo));
  }


  /**
   * Formato "Solicitud de amnistía (presentada por familiares o representante legal)" con la
   * estructura del formato oficial, prellenado con lo capturado en el registro.
   */
  async formatoSolicitud(d: DatosFormatoSolicitud): Promise<Buffer> {
    const [anio, mes, dia] = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d.fecha).split('-').map(Number);
    const nacimiento = d.fechaNacimientoBeneficiario?.match(/^(\d{4})-(\d{2})-(\d{2})/);

    const campo = (valor: string | null | undefined, ancho = '') =>
      `<span class="campo" style="${ancho}">${escaparHtml(valor ?? '') || '&nbsp;'}</span>`;
    const caja = (marcada: boolean) => `<span class="caja">[${marcada ? '&nbsp;X&nbsp;' : '&nbsp;&nbsp;&nbsp;'}]</span>`;
    const opcion = (marcada: boolean, texto: string) => `<div class="opcion">${caja(marcada)} ${texto}</div>`;
    const pregunta = (n: string, texto: string) => `<p class="pregunta"><span class="num">${n}</span><span>${texto}</span></p>`;
    const lineaVacia = '<div class="renglon">&nbsp;</div>';

    const fechaNac = nacimiento
      ? `${campo(nacimiento[3], 'min-width:34px')} / ${campo(MESES[Number(nacimiento[2]) - 1], 'min-width:90px')} / ${campo(nacimiento[1], 'min-width:46px')}`
      : `${campo('', 'min-width:34px')} / ${campo('', 'min-width:90px')} / ${campo('', 'min-width:46px')}`;

    const docs = d.documentacion;
    const c = d.complemento;
    const si = (v: boolean | null) => v === true;
    const no = (v: boolean | null) => v === false;
    const fechaDelito = c.fecha_comision_delito?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const fechaComision = fechaDelito
      ? `${campo(fechaDelito[3], 'min-width:34px')} / ${campo(MESES[Number(fechaDelito[2]) - 1], 'min-width:90px')} / ${campo(fechaDelito[1], 'min-width:46px')}`
      : `${campo('', 'min-width:34px')} / ${campo('', 'min-width:90px')} / ${campo('', 'min-width:46px')}`;
    const num = (v: number | null) => (v === null || v === undefined ? '' : String(v));
    const monto = c.multa_monto === null || c.multa_monto === undefined ? '' : `$ ${Number(c.multa_monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const libertad = c.situacion_libertad ?? (d.privadoLibertad ? 'PRIVADO' : null);
    const investigada = d.situacion === 'INVESTIGADA';
    const org = d.tipo === 'ORGANISMO';
    const o = org ? -2 : 0;
    const cuerpo = `
      ${org ? `      <h1>SOLICITUD DE AMNISTÍA</h1>
      <p class="sub">(Presentada por organismos públicos defensores de Derechos Humanos)</p>
      <p class="derecha">Estado de México a ${campo(String(dia), 'min-width:36px')} de ${campo(MESES[mes - 1], 'min-width:110px')} de ${campo(String(anio), 'min-width:46px')}.</p>

      <p class="destino"><strong>COMISIÓN LEGISLATIVA DE AMNISTÍA<br>DEL ESTADO DE MÉXICO<br>PRESENTE.</strong></p>

      <p class="justificado interlineado">Yo, ${campo(d.titular, 'min-width:330px')}, titular o representante legal del organismo denominado ${campo(d.organismo, 'min-width:330px')}, solicito el beneficio al que hacen referencia los artículos 1, 7 y 11 de la Ley de Amnistía del Estado de México; así como el ACUERDO de la Comisión Legislativa de Seguimiento a los casos de Amnistía por el que se aprueban los Lineamientos de la Comisión de Seguimiento a los Casos de Amnistía para su organización y funcionamiento, así como para la recepción, análisis y seguimiento de los casos puestos a su consideración, en los numerales SEGUNDO, TERCERO y CUARTO, en favor de ${campo(d.beneficiario, 'min-width:300px')} con fecha de nacimiento ${fechaNac}, por el delito de ${campo(d.delitos, 'min-width:300px')}, cometido en fecha ${fechaComision}, para lo cual, proporciono la información que se describe.</p>

      <p class="justificado"><strong>${caja(d.autorizacionOrganismo)} ADJUNTO A LA PRESENTE SOLICITUD, DOCUMENTAL PÚBLICA O ESCRITO FIRMADO POR LA PERSONA INTERESADA, MEDIANTE EL CUAL AUTORIZA AL ORGANISMO, PARA REALIZAR EL TRÁMITE DE AMNISTÍA EN SU REPRESENTACIÓN.</strong></p>
      <p class="justificado"><strong>${caja(d.acreditacionTitular.adjunta)} ADJUNTO A LA PRESENTE SOLICITUD, COPIA SIMPLE O CERTIFICADA DE LA DOCUMENTAL QUE ME ACREDITA COMO TITULAR/REPRESENTANTE LEGAL DEL ORGANISMO</strong> ${campo(d.acreditacionTitular.descripcion, 'min-width:260px')}.</p>

      <h2>SECCIÓN I. DATOS DEL ORGANISMO PÚBLICO DEFENSOR DE DERECHOS HUMANOS</h2>
      <p class="pregunta"><span class="num">1.</span><strong>Domicilio para recibir notificaciones (calle, número, colonia, alcaldía o municipio, ciudad, estado y código postal):</strong></p>
      <div class="renglon">${escaparHtml(d.domicilio) || '&nbsp;'}</div>
      <p class="pregunta"><span class="num">2.</span><strong>Correo electrónico:</strong></p>
      <div class="renglon">${escaparHtml(d.email) || '&nbsp;'}</div>
      <p class="pregunta"><span class="num">3.</span><strong>Teléfono(s) (10 dígitos):</strong></p>
      <div class="renglon">${escaparHtml(d.telefono) || '&nbsp;'}</div>
      <div class="renglon">${escaparHtml(d.celular) || '&nbsp;'}</div>

      <h2>SECCIÓN I. DATOS GENERALES DE LA PERSONA INTERESADA EN OBTENER EL BENEFICIO QUE CONCEDE LA LEY DE AMNISTÍA DEL ESTADO DE MÉXICO</h2>

` : `      <h1>SOLICITUD DE AMNISTÍA</h1>
      <p class="sub">(Presentada por familiares o representante legal)</p>
      <p class="derecha">Estado de México a ${campo(String(dia), 'min-width:36px')} de ${campo(MESES[mes - 1], 'min-width:110px')} de ${campo(String(anio), 'min-width:46px')}.</p>

      <p class="destino"><strong>COMISIÓN LEGISLATIVA DE AMNISTÍA<br>DEL ESTADO DE MÉXICO<br>PRESENTE.</strong></p>

      <p class="justificado interlineado">Yo ${campo(d.solicitante, 'min-width:380px')}, solicito el beneficio que concede la Ley de Amnistía del Estado de México, en sus artículos 4, 7 y 11, así como el ACUERDO de la Comisión Legislativa de Seguimiento a los casos de Amnistía por el que se aprueban los Lineamientos de la Comisión de Seguimiento a los Casos de Amnistía para su organización y funcionamiento, así como para la recepción, análisis y seguimiento de los casos puestos a su consideración, en los numerales SEGUNDO, TERCERO y CUARTO, en favor de ${campo(d.beneficiario, 'min-width:300px')} con fecha de nacimiento ${fechaNac}, quien se encuentra en el estado de ${campo(c.estado_se_encuentra, 'min-width:130px')}, por el delito de ${campo(d.delitos, 'min-width:300px')}, cometido en fecha ${fechaComision}, para lo cual, proporciono la información que se describe.</p>

      <p class="titulo-n"><strong>1. Respecto a la persona interesada en obtener el beneficio de amnistía, manifiesto que soy su:</strong></p>
      <div class="sangria">
        ${opcion(!!d.parentesco, `Familiar (parentesco) ${campo(d.parentesco, 'min-width:300px')}`)}
        ${opcion(!d.parentesco, `Representante legal ${campo('', 'min-width:330px')}`)}
      </div>
      <p class="justificado"><strong>${caja(d.designacionRepresentante)} ADJUNTO A LA PRESENTE SOLICITUD, DOCUMENTAL PÚBLICA O EL ESCRITO FIRMADO POR LA PERSONA INTERESADA MEDIANTE EL CUAL DESIGNA AL REPRESENTANTE LEGAL PARA EL TRÁMITE DE AMNISTÍA.</strong></p>
      <p><strong>En caso de que la Secretaría Técnica de la Comisión de Amnistía requiera algún otro dato o documento, incluyo mi información de contacto:</strong></p>

      <p class="pregunta"><span class="num">2.</span><strong>Domicilio (calle, número, colonia, municipio, ciudad, estado y código postal):</strong></p>
      <div class="renglon">${escaparHtml(d.domicilio) || '&nbsp;'}</div>
      <p class="pregunta"><span class="num">3.</span><strong>Correo electrónico:</strong></p>
      <div class="renglon">${escaparHtml(d.email) || '&nbsp;'}</div>
      <p class="pregunta"><span class="num">4.</span><strong>Teléfono casa (10 dígitos):</strong></p>
      <div class="renglon">${escaparHtml(d.telefono) || '&nbsp;'}</div>
      <p class="pregunta"><span class="num">5.</span><strong>Teléfono celular (10 dígitos):</strong></p>
      <div class="renglon">${escaparHtml(d.celular) || '&nbsp;'}</div>

      <div class="salto"></div>
      <h2>SECCIÓN I. DATOS GENERALES DE LA PERSONA INTERESADA EN OBTENER EL BENEFICIO QUE CONCEDE LA LEY DE AMNISTÍA DEL ESTADO DE MÉXICO</h2>

`}
      ${pregunta(`${6 + o}.`, '<strong>Sexo:</strong>')}
      <div class="sangria">${opcion(d.sexo === 'MUJER', 'Mujer')}${opcion(d.sexo === 'HOMBRE', 'Hombre')}</div>

      <p class="pregunta"><span class="num">${7 + o}.</span><strong>Nacionalidad:</strong> ${campo(d.nacionalidad, 'min-width:380px')}</p>

      ${pregunta(`${8 + o}.`, '<strong>En términos del art. 2 de la Constitución Política de los Estados Unidos Mexicanos, perteneces a una comunidad:</strong>')}
      <div class="sangria">
        ${opcion(c.comunidad === 'INDIGENA', `Indígena &nbsp;&nbsp;&nbsp;<strong>¿Cuál?</strong> ${campo(c.comunidad_indigena_cual, 'min-width:260px')}`)}
        ${opcion(c.comunidad === 'AFROMEXICANA', 'Afromexicana')}
        ${opcion(c.comunidad === 'NINGUNA', 'Ninguna')}
      </div>
      <p class="sub-pregunta"><strong>${8 + o}.1 &nbsp;¿Contaste con un intérprete durante tu proceso?</strong></p>
      <div class="sangria">${opcion(si(c.interprete), 'Sí')}${opcion(no(c.interprete), 'No')}</div>

      ${pregunta(`${9 + o}.`, '<strong>¿Tienes una discapacidad permanente?</strong>')}
      <div class="sangria">${opcion(si(c.discapacidad), `Sí &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>¿Cuál?</strong> ${campo(c.discapacidad_cual, 'min-width:260px')}`)}${opcion(no(c.discapacidad), 'No')}</div>

      ${pregunta(`${10 + o}.`, '<strong>¿Tienes una enfermedad crónico-degenerativa?</strong>')}
      <div class="sangria">${opcion(si(c.enfermedad_cronica), `Sí &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>¿Cuál?</strong> ${campo(c.enfermedad_cronica_cual, 'min-width:260px')}`)}${opcion(no(c.enfermedad_cronica), 'No')}</div>

      ${pregunta(`${11 + o}.`, '<strong>Antes de cometer el delito por el cual solicitas el beneficio de amnistía, ¿a qué te dedicabas?</strong>')}
      <div class="renglon">${escaparHtml(c.ocupacion_previa || d.ocupacion) || '&nbsp;'}</div>

      ${pregunta(`${12 + o}.`, '<strong>¿Cuántas y quiénes son las personas que dependen económicamente de usted?</strong>')}
      ${c.dependientes_economicos?.trim() ? `<div class="renglon">${escaparHtml(c.dependientes_economicos)}</div>` : `${lineaVacia}${lineaVacia}${lineaVacia}`}

      <h2>SECCIÓN II. SITUACIÓN JURÍDICA</h2>

      ${pregunta(`${13 + o}.`, '<strong>¿A qué jurisdicción pertenece el delito?</strong>')}
      <div class="sangria">${opcion(d.jurisdiccion === 'LOCAL', 'Común/Local')}${opcion(d.jurisdiccion === 'FEDERAL', 'Federal')}</div>

      ${pregunta(`${14 + o}.`, '<strong>¿Te encuentras privada(o) de tu libertad?</strong>')}
      <div class="sangria">
        ${opcion(libertad === 'PRIVADO', 'Sí')}
        ${opcion(libertad === 'NO_PRIVADO', 'No')}
        ${opcion(libertad === 'MEDIDA_SEGURIDAD', `Bajo una medida de seguridad ¿Cuál? ${campo(c.medida_seguridad_cual, 'min-width:300px')}`)}
      </div>
      <p class="sub-pregunta"><strong>${14 + o}.1 ¿En qué entidad federativa te encuentras y cuál es el nombre del centro penitenciario?</strong></p>
      <div class="renglon">${escaparHtml(d.centroPenitenciario) || '&nbsp;'}</div>

      ${pregunta(`${15 + o}.`, '<strong>¿Cuál es tu situación jurídica? (Selecciona una de las tres opciones)</strong>')}
      <div class="sangria">
        <p class="opcion">I) ${caja(investigada)} Actualmente, investigada(o) por el Ministerio Público.</p>
        <p class="campo-t"><strong>Número de averiguación previa o carpeta de investigación:</strong></p>
        <div class="renglon">${escaparHtml(c.investigacion_numero || (investigada ? d.causaPenal : '')) || '&nbsp;'}</div>
        <p class="campo-t"><strong>Agencia del ministerio público/Procuraduría o Fiscalía que conoce del caso:</strong></p>
        <div class="renglon">${escaparHtml(c.investigacion_agencia) || '&nbsp;'}</div>
        <p class="opcion">II) ${caja(d.situacion === 'PROCESADO')} <strong>Actualmente, procesado ante un juez sin sentencia.</strong></p>
        <p class="campo-t"><strong>Número de la causa penal:</strong> ${campo(d.situacion === 'PROCESADO' ? d.causaPenal : '', 'min-width:330px')}</p>
        <p class="campo-t"><strong>Juzgado que conoce:</strong> ${campo(d.situacion === 'PROCESADO' ? d.juzgado : '', 'min-width:360px')}</p>
        <p class="opcion">III) ${caja(d.situacion === 'SENTENCIADO')} Actualmente, sentenciado por un juez.</p>
        <p class="campo-t"><strong>Número de la causa penal:</strong></p>
        <div class="renglon">${d.situacion === 'SENTENCIADO' ? escaparHtml(d.causaPenal) || '&nbsp;' : '&nbsp;'}</div>
        <p class="campo-t"><strong>Juzgado que conoce:</strong></p>
        <div class="renglon">${d.situacion === 'SENTENCIADO' ? escaparHtml(d.juzgado) || '&nbsp;' : '&nbsp;'}</div>
        <p class="campo-t"><strong>¿Cuál es la pena en tu sentencia?</strong></p>
        <p class="campo-t"><strong>Años</strong> ${campo(num(c.pena_anios), 'min-width:70px')} <strong>Meses</strong> ${campo(num(c.pena_meses), 'min-width:50px')}</p>
        <p class="campo-t"><strong>¿La pena incluye el pago de una multa?</strong></p>
        ${opcion(si(c.multa), `Sí &nbsp;&nbsp;&nbsp;Monto: ${campo(monto, 'min-width:300px')}`)}${opcion(no(c.multa), 'No')}
      </div>

      ${pregunta(`${16 + o}.`, '<strong>Segunda instancia: ¿Presentaste recurso de apelación contra tu sentencia?</strong>')}
      <div class="sangria">${opcion(si(c.apelacion), 'Sí')}${opcion(no(c.apelacion), 'No')}
        <p class="campo-t"><strong>${16 + o}.1 Número de toca penal:</strong></p><div class="renglon">${escaparHtml(c.apelacion_toca) || '&nbsp;'}</div>
        <p class="campo-t"><strong>${16 + o}.2 Tribunal que conoce:</strong></p><div class="renglon">${escaparHtml(c.apelacion_tribunal) || '&nbsp;'}</div>
        <p class="campo-t"><strong>${16 + o}.3 La resolución de la apelación:</strong></p>
        ${opcion(c.apelacion_resolucion === 'CONFIRMO', 'Confirmó')}${opcion(c.apelacion_resolucion === 'MODIFICO', 'Modificó')}${opcion(c.apelacion_resolucion === 'REVOCO', 'Revocó')}
        <p class="campo-t"><strong>${16 + o}.3.1 ¿Se modificó la pena de prisión?</strong></p>
        ${opcion(si(c.pena_modificada), '<span style="display:inline-block;width:150px">Sí</span>¿Cuántos años compurgarás en prisión')}
        ${opcion(no(c.pena_modificada), `<span style="display:inline-block;width:150px">No</span><strong>Años</strong> ${campo(num(c.pena_compurgar_anios), 'min-width:70px')} <strong>Meses</strong> ${campo(num(c.pena_compurgar_meses), 'min-width:70px')}`)}
      </div>

      ${pregunta(`${17 + o}.`, '<strong>¿Presentaste juicio de amparo contra tu sentencia?</strong>')}
      <div class="sangria">
        ${org
          ? `${opcion(si(c.amparo), 'Sí')}${opcion(no(c.amparo), 'No')}
        <p class="campo-t"><strong>${17 + o}.1 &nbsp;¿La resolución te concedió el amparo?</strong></p>
        ${opcion(si(c.amparo_concedido), `Sí &nbsp;&nbsp;&nbsp;&nbsp;¿Para qué efectos? ${campo(c.amparo_efectos, 'min-width:300px')}`)}${opcion(no(c.amparo_concedido), 'No')}`
          : `${opcion(si(c.amparo), `Sí &nbsp;&nbsp;&nbsp;¿Para qué efectos? ${campo(c.amparo_efectos, 'min-width:300px')}`)}${opcion(no(c.amparo), 'No')}
        <p class="campo-t"><strong>a. &nbsp;¿La resolución te concedió el amparo?</strong></p>
        ${opcion(si(c.amparo_concedido), 'Sí')}${opcion(no(c.amparo_concedido), 'No')}`}
      </div>

      ${pregunta(`${18 + o}.`, '<strong>¿Anteriormente fuiste sentenciado por el mismo delito por el que solicitas el beneficio de Amnistía?</strong>')}
      <div class="sangria">${opcion(si(c.sentenciado_antes_mismo_delito), 'Sí')}${opcion(no(c.sentenciado_antes_mismo_delito), 'No')}</div>

      ${pregunta(`${19 + o}.`, '<strong>¿Tienes otro proceso vinculado a tu persona?</strong>')}
      <div class="sangria">${opcion(si(c.otro_proceso), 'Sí')}${opcion(no(c.otro_proceso), 'No')}
        <p class="campo-t"><strong>${org ? `${19 + o}.1` : 'a.'} &nbsp;En ese proceso, ¿cuál es el número de tu expediente?</strong></p><div class="renglon">${escaparHtml(c.otro_proceso_expediente) || '&nbsp;'}</div>
        <p class="campo-t"><strong>${org ? `${19 + o}.2` : 'b.'} &nbsp;En ese proceso, ¿cuál es el juzgado que conoce?</strong></p><div class="renglon">${escaparHtml(c.otro_proceso_juzgado) || '&nbsp;'}</div>
      </div>

      <h2 class="izq">SECCIÓN III. DOCUMENTACIÓN</h2>
      ${pregunta(`${20 + o}.`, '<strong>¿Cuál de la siguiente documentación adjuntas?</strong>')}
      <div class="sangria">
        ${opcion(docs.identificacion, 'Identificación oficial')}
        ${opcion(docs.acta, 'Acta de nacimiento')}
        ${opcion(docs.averiguacionPrevia, 'Averiguación previa/Carpeta de investigación')}
        ${opcion(docs.constanciasProceso, 'Constancias de tu proceso penal ante el juez/sentencia de primera instancia, segunda instancia o amparo')}
        ${opcion(docs.noReincidencia, 'Documento que acredita la no reincidencia respecto al delito por el que solicitas el beneficio de amnistía')}
        ${opcion(docs.situacionSocioeconomica, 'Documento que acredita tu situación socioeconómica')}
        ${opcion(docs.calidadIndigena, 'Documento que acredita tu calidad de indígena')}
        ${opcion(!!docs.otro, `Otro: ${campo(docs.otro, 'min-width:380px')}`)}
      </div>

      ${org ? '' : '<div class="salto"></div>'}
      ${pregunta(`${21 + o}.`, '<strong>Explica brevemente el argumento o la situación por la cual consideras que tu caso se encuentra en los supuestos que establecidos en el artículo 4 de la Ley de Amnistía del Estado de México:</strong>')}
      <p class="nota"><strong>Nota: Se sugiere consultar el artículo 4 de la Ley de Amnistía del Estado de México, para saber cuáles son los supuestos que establece dicha Ley.</strong></p>
      ${d.argumentoHtml.trim() ? `<div class="contenido">${d.argumentoHtml}</div>` : `${lineaVacia}${lineaVacia}${lineaVacia}${lineaVacia}${lineaVacia}`}

      <p class="justificado protesta">Bajo protesta de decir verdad, manifiesto que la información contenida en la presente solicitud de amnistía es cierta y el caso cumple con los supuestos que se encuentran en el artículo 4 de la Ley de Amnistía del Estado de México.</p>

      <div class="firma-bloque"><div class="firma-linea"></div><strong>Nombre y firma</strong><div class="firma-nombre">${escaparHtml(org ? d.titular : d.solicitante)}</div></div>

      <p class="legal justificado">De conformidad con los artículos 122 y 140 Fracciones IV, VI, VIII y XI de la Ley de Transparencia y Acceso a la Información Pública del Estado de México y Municipios, la información contenida en este documento es susceptible de considerarse como reservada o confidencialidad; la persona que por algún motivo tenga conocimiento del contenido, deberá abstenerse de difundirlo por cualquier medio y adoptar las medidas necesarias para evitar su publicidad.</p>
      <p class="legal justificado">Por lo que usar, sustraer, divulgar, ocultar, alterar, mutilar, destruir o inutilizar, total o parcialmente, sin causa legítima, la información que se encuentre bajo su custodia como servidor público o a la cual tengan acceso o conocimiento con motivo de su empleo, cargo o comisión conforme a las facultades correspondientes puede estar sujeto a sanciones conforme a lo previsto en el artículo 186 del Código Penal del Estado de México y los artículos 4, 5 y 50 fracción IX de la Ley de Responsabilidades Administrativas del Estado de México; y demás relativos aplicables en la Legislación Estatal.</p>`;

    const estilos = `
      body { font-size: 11.5px; line-height: 1.5; }
      h1 { text-align: center; font-size: 17px; margin: 20px 0 0; color: #3a3a3c; }
      .sub { text-align: center; font-size: 12px; margin: 2px 0 14px; }
      h2 { text-align: center; font-size: 12.5px; margin: 18px 0 14px; } h2.izq { text-align: left; }
      .destino { margin: 18px 0 12px; font-size: 12.5px; }
      .interlineado { line-height: 2; margin: 0 0 14px; }
      .campo { display: inline-block; border-bottom: 1px solid #333; padding: 0 3px; font-weight: bold; color: #960048; vertical-align: bottom; line-height: 1.3; }
      .caja { font-family: monospace; font-weight: bold; }
      .opcion { margin: 1px 0; } .sangria { margin-left: 26px; }
      .pregunta { display: flex; gap: 10px; margin: 14px 0 3px; } .pregunta .num { min-width: 26px; font-weight: bold; }
      .sub-pregunta { margin: 10px 0 3px 26px; } .campo-t { margin: 9px 0 3px; }
      .titulo-n { margin: 16px 0 6px; }
      .renglon { border-bottom: 1px solid #333; min-height: 20px; margin: 4px 0 6px 26px; font-weight: bold; color: #960048; }
      .salto { page-break-after: always; }
      .nota { font-size: 10.5px; margin: 10px 0; }
      .protesta { margin: 18px 0 40px; }
      .firma-bloque { width: 56%; margin: 56px auto 28px; text-align: center; }
      .firma-linea { border-top: 1px solid #333; margin-bottom: 4px; } .firma-nombre { font-size: 10px; color: #555; margin-top: 2px; }
      .legal { font-size: 9px; line-height: 1.35; margin: 6px 0; }
      .contenido { margin: 10px 0 14px 26px; text-align: justify; }
    `;
    const html = this.documento(cuerpo, estilos, { conMembrete: false });
    return this.html(html, { numerar: true });
  }

  async informacion(d: DatosInformacion): Promise<Buffer> {
    const cuerpo = `
      <p class="derecha">${lugarYFecha()}</p>
      <p class="derecha"><strong>Solicitud número: ${escaparHtml(d.nus)}</strong></p>
      <p class="titulo">${escaparHtml(d.titulo)}</p>
      <div class="contenido">${d.contenidoHtml || '<p>Sin información capturada.</p>'}</div>
      <p class="centrado"><strong>ATENTAMENTE</strong></p>
      <p class="centrado firma">${escaparHtml(d.firmante)}</p>`;
    return this.html(this.documento(cuerpo));
  }

  /** Une los PDFs en el orden recibido; si alguno está dañado se omite y se registra. */
  async unir(pdfs: Buffer[]): Promise<Buffer> {
    const destino = await PDFDocument.create();
    for (const pdf of pdfs) {
      try {
        const origen = await PDFDocument.load(pdf, { ignoreEncryption: true });
        const paginas = await destino.copyPages(origen, origen.getPageIndices());
        paginas.forEach((p) => destino.addPage(p));
      } catch (error) {
        this.logger.warn(`Se omitió un PDF al armar la ficha técnica: ${(error as Error).message}`);
      }
    }
    return Buffer.from(await destino.save());
  }

  private documento(cuerpo: string, estilosExtra = '', opciones: { conMembrete?: boolean } = {}): string {
    const membrete = opciones.conMembrete !== false;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
      @page { size: Letter; margin: 14mm 16mm; }
      body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #2b2b2d; line-height: 1.45; }
      .encabezado { text-align: center; margin-bottom: 10px; } .encabezado img { width: 330px; }
      .pie { text-align: center; margin-top: 18px; } .pie img { width: 100%; }
      .derecha { text-align: right; margin: 2px 0; } .centrado { text-align: center; }
      .justificado { text-align: justify; } .titulo { font-weight: bold; color: #960048; font-size: 13px; }
      table.datos { width: 100%; border-collapse: collapse; margin: 10px 0 14px; }
      table.datos th { width: 34%; text-align: left; background: #ecebec; padding: 5px 8px; border: 1px solid #d2d3d5; }
      table.datos td { padding: 5px 8px; border: 1px solid #d2d3d5; font-weight: bold; color: #960048; }
      table.validacion { width: 100%; } .cadena { font-size: 8px; word-break: break-all; color: #555; }
      .qr { width: 130px; text-align: right; } .qr img { width: 115px; }
      .firma { font-weight: bold; font-size: 11px; }
      .contenido { margin: 12px 0 24px; text-align: justify; } .contenido img { max-width: 100%; }
      ${estilosExtra}
    </style></head><body>
      ${membrete ? `<div class="encabezado"><img src="${this.encabezado}" alt=""></div>` : ''}
      ${cuerpo}
      ${membrete ? `<div class="pie"><img src="${this.pie}" alt=""></div>` : ''}
    </body></html>`;
  }

  private async html(html: string, opciones: { numerar?: boolean } = {}): Promise<Buffer> {
    const browser = await puppeteer.launch({
      executablePath: rutaChromium(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      // El contenido de la narrativa lo captura el público: sin JavaScript y sin red,
      // solo se permiten las imágenes embebidas (data:).
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().startsWith('data:')) void req.continue();
        else void req.abort();
      });
      await page.setContent(html, { waitUntil: 'load' });
      if (opciones.numerar) {
        return Buffer.from(
          await page.pdf({
            format: 'Letter',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: '<span></span>',
            footerTemplate: '<div style="width:100%;font-size:10px;font-family:Helvetica,Arial,sans-serif;text-align:right;padding-right:16mm"><span class="pageNumber"></span></div>',
            margin: { top: '14mm', bottom: '16mm', left: '16mm', right: '16mm' },
          }),
        );
      }
      return Buffer.from(await page.pdf({ format: 'Letter', printBackground: true }));
    } finally {
      await browser.close();
    }
  }
}
