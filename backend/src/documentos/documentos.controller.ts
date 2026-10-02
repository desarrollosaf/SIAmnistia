import { Controller, Get, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Usuario } from '../auth/decorators/usuario.decorator';
import type { UsuarioActual } from '../auth/usuario-actual';
import { Documento } from '../database/models/documento.model';
import { MORPH } from '../database/models/opciones-tabla';
import { ArchivosService, tipoMime } from '../comun/archivos.service';
import { SolicitudesService } from '../solicitudes/solicitudes.service';

/** Descarga de documentos de una solicitud, solo para quien tiene acceso a ella. */
@Controller('documentos')
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(
    @InjectModel(Documento) private readonly documentoModel: typeof Documento,
    private readonly archivos: ArchivosService,
    private readonly solicitudesService: SolicitudesService,
  ) {}

  @Get(':uuid/archivo')
  async archivo(@Param('uuid') uuid: string, @Usuario() user: UsuarioActual, @Res() res: Response) {
    const doc = await this.documentoModel.findOne({ where: { uuid, documentable_type: MORPH.solicitud } });
    if (!doc) throw new NotFoundException('No se encontró el documento');
    await this.solicitudesService.verificarAcceso(doc.documentable_id, user);

    const contenido = await this.archivos.leer(doc.ruta);
    const nombre = encodeURIComponent(doc.nombre_documento);
    res.set({
      'Content-Type': tipoMime(doc.nombre_documento),
      'Content-Disposition': `inline; filename*=UTF-8''${nombre}`,
    });
    res.send(contenido);
  }
}
