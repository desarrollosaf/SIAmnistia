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
import { Documento, DOC } from '../database/models/documento.model';
import { nombreCompleto } from '../database/models/usuario.model';
import { MORPH } from '../database/models/opciones-tabla';
import { ArchivosService } from './archivos.service';
import { PdfService } from './pdf.service';

/** Cadena aleatoria de validación del acuse; el QR lleva su MD5 (como el sistema anterior). */
export function nuevaCadenaValidacion() {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const cadena = Array.from(randomBytes(250), (b) => alfabeto[b % alfabeto.length]).join('');
  return { cadena, codificada: createHash('md5').update(cadena).digest('hex') };
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
        nombre_documento: { [Op.in]: [DOC.acuse, DOC.fichaTecnica] },
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

    // Ficha técnica: acuse + verdad de hechos + narrativa + información complementaria + sentencia.
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
    const partes: Buffer[] = [acusePdf];
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
