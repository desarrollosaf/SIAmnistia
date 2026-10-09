import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, Res, UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { IsEmail } from 'class-validator';
import { SOLO_PDF } from '../common/pdf-upload.util';
import { PublicoService } from './publico.service';
import type { ArchivosRegistro } from './publico.service';

class SolicitarTokenDto {
  @IsEmail({}, { message: 'Captura un correo electrónico válido' })
  email!: string;
}

/** Endpoints sin sesión: registro de solicitudes, acuse y consulta del peticionario. */
@Controller('publico')
export class PublicoController {
  constructor(private readonly publicoService: PublicoService) {}

  @Post('solicitudes')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'identificacion', maxCount: 1 },
        { name: 'curp', maxCount: 1 },
        { name: 'acta_nacimiento', maxCount: 1 },
        { name: 'designacion_representante', maxCount: 1 },
        { name: 'autorizacion_organismo', maxCount: 1 },
        { name: 'acreditacion_titular', maxCount: 1 },
        { name: 'sentencia', maxCount: 1 },
        { name: 'verdad_hechos', maxCount: 1 },
        { name: 'averiguacion_previa', maxCount: 1 },
        { name: 'constancias_proceso', maxCount: 1 },
        { name: 'no_reincidencia', maxCount: 1 },
        { name: 'situacion_socioeconomica', maxCount: 1 },
        { name: 'calidad_indigena', maxCount: 1 },
        { name: 'otros_documentos', maxCount: 10 },
      ],
      SOLO_PDF,
    ),
  )
  async registrar(@Body('datos') datos: string, @UploadedFiles() archivos: ArchivosRegistro) {
    const dto = await this.publicoService.validarDatos(datos);
    return this.publicoService.registrar(dto, archivos ?? {});
  }

  @Get('acuse/:uuid')
  async acuse(@Param('uuid') uuid: string, @Query('descargar') descargar: string | undefined, @Res() res: Response) {
    this.enviarPdf(res, await this.publicoService.acuse(uuid), descargar !== undefined);
  }

  @Get('formato/:uuid')
  async formato(@Param('uuid') uuid: string, @Query('descargar') descargar: string | undefined, @Res() res: Response) {
    this.enviarPdf(res, await this.publicoService.formato(uuid), descargar !== undefined);
  }

  /** "inline" lo abre en el navegador; con ?descargar el navegador lo guarda como archivo. */
  private enviarPdf(res: Response, pdf: { nombre: string; contenido: Buffer }, descargar: boolean) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${pdf.nombre}"`,
    });
    res.send(pdf.contenido);
  }

  @Get('validar-acuse/:cadena')
  validarAcuse(@Param('cadena') cadena: string) {
    return this.publicoService.validarAcuse(cadena);
  }

  @Post('consulta/token')
  @HttpCode(HttpStatus.OK)
  solicitarToken(@Body() dto: SolicitarTokenDto) {
    return this.publicoService.generarToken(dto.email);
  }

  @Get('consulta/:token')
  solicitudes(@Param('token') token: string) {
    return this.publicoService.solicitudesPorToken(token);
  }

  @Get('consulta/:token/solicitudes/:id')
  seguimiento(@Param('token') token: string, @Param('id', ParseIntPipe) id: number) {
    return this.publicoService.seguimientoPorToken(token, id);
  }
}
