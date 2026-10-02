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

  private documento(cuerpo: string): string {
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
    </style></head><body>
      <div class="encabezado"><img src="${this.encabezado}" alt=""></div>
      ${cuerpo}
      <div class="pie"><img src="${this.pie}" alt=""></div>
    </body></html>`;
  }

  private async html(html: string): Promise<Buffer> {
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
      return Buffer.from(await page.pdf({ format: 'Letter', printBackground: true }));
    } finally {
      await browser.close();
    }
  }
}
