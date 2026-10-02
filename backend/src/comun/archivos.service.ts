import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, join, normalize, sep } from 'path';
import type { Transaction } from 'sequelize';
import { Documento } from '../database/models/documento.model';
import { MORPH } from '../database/models/opciones-tabla';

export const UPLOADS_ROOT = join(__dirname, '..', '..', 'uploads');

export interface NuevoDocumento {
  solicitudId: number;
  contenido: Buffer;
  /** Nombre lógico que verá el usuario (acuse.pdf, sentencia.pdf, el nombre original...). */
  nombreDocumento: string;
  descripcion: string;
  /** Extensión del archivo físico; por defecto la de nombreDocumento o .pdf. */
  extension?: string;
  userId?: number | null;
  fichaTecnica?: boolean;
  transaction?: Transaction;
}

/**
 * Guarda los archivos de cada solicitud en uploads/solicitud/{id}/ con un nombre aleatorio
 * (igual que Laravel en storage/app/solicitud/{id}/) y registra la fila en "documentos".
 */
@Injectable()
export class ArchivosService {
  constructor(
    @InjectModel(Documento)
    private readonly documentoModel: typeof Documento,
  ) {}

  async registrar(datos: NuevoDocumento): Promise<Documento> {
    const extension = (datos.extension ?? (extname(datos.nombreDocumento) || '.pdf')).toLowerCase();
    const uuid = randomUUID();
    const nombre = `${uuid}${extension}`;
    const ruta = `solicitud/${datos.solicitudId}/${nombre}`;

    await mkdir(join(UPLOADS_ROOT, 'solicitud', String(datos.solicitudId)), { recursive: true });
    await writeFile(this.rutaAbsoluta(ruta), datos.contenido);

    return this.documentoModel.create(
      {
        documentable_id: datos.solicitudId,
        documentable_type: MORPH.solicitud,
        ruta,
        nombre,
        nombre_documento: datos.nombreDocumento,
        descripcion: datos.descripcion,
        tamano: (datos.contenido.length / 1024).toFixed(2),
        user_id: datos.userId ?? null,
        uuid,
        ficha_tecnica: datos.fichaTecnica ?? false,
      },
      { transaction: datos.transaction },
    );
  }

  async leer(ruta: string): Promise<Buffer> {
    try {
      return await readFile(this.rutaAbsoluta(ruta));
    } catch {
      throw new NotFoundException('No se encontró el archivo del documento');
    }
  }

  async existe(ruta: string): Promise<boolean> {
    try {
      await stat(this.rutaAbsoluta(ruta));
      return true;
    } catch {
      return false;
    }
  }

  async eliminar(ruta: string): Promise<void> {
    await unlink(this.rutaAbsoluta(ruta)).catch(() => undefined);
  }

  /** Resuelve la ruta guardada en BD dentro de uploads/, sin permitir salir de esa carpeta. */
  private rutaAbsoluta(ruta: string): string {
    const absoluta = normalize(join(UPLOADS_ROOT, ruta));
    if (!absoluta.startsWith(normalize(UPLOADS_ROOT) + sep)) {
      throw new NotFoundException('Ruta de documento inválida');
    }
    return absoluta;
  }
}

export function tipoMime(nombre: string): string {
  const ext = extname(nombre).toLowerCase();
  const tipos: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return tipos[ext] ?? 'application/octet-stream';
}
