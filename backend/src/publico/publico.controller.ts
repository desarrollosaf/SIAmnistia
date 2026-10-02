import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Res, UploadedFiles,
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
        { name: 'sentencia', maxCount: 1 },
        { name: 'verdad_hechos', maxCount: 1 },
      ],
      SOLO_PDF,
    ),
  )
  async registrar(@Body('datos') datos: string, @UploadedFiles() archivos: ArchivosRegistro) {
    const dto = await this.publicoService.validarDatos(datos);
    return this.publicoService.registrar(dto, archivos ?? {});
  }

  @Get('acuse/:uuid')
  async acuse(@Param('uuid') uuid: string, @Res() res: Response) {
    const { nombre, contenido } = await this.publicoService.acuse(uuid);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nombre}"` });
    res.send(contenido);
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
