import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, Res, ServiceUnavailableException,
  UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { IsEmail } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROL } from '../common/amnistia.constants';
import { SOLO_PDF } from '../common/pdf-upload.util';
import { PublicoService } from './publico.service';
import type { ArchivosRegistro } from './publico.service';

class SolicitarTokenDto {
  @IsEmail({}, { message: 'Captura un correo electrónico válido' })
  email!: string;
}

/** Archivos que acepta el formulario de registro (público e interno). */
const ADJUNTOS_REGISTRO = () =>
  FileFieldsInterceptor(
    [
      { name: 'identificacion', maxCount: 1 },
      { name: 'curp', maxCount: 1 },
      { name: 'acta_nacimiento', maxCount: 1 },
      { name: 'designacion_representante', maxCount: 1 },
      { name: 'autorizacion_organismo', maxCount: 1 },
      { name: 'acreditacion_titular', maxCount: 1 },
      { name: 'sentencia', maxCount: 1 },
      { name: 'verdad_hechos', maxCount: 20 },
      { name: 'averiguacion_previa', maxCount: 1 },
      { name: 'constancias_proceso', maxCount: 1 },
      { name: 'no_reincidencia', maxCount: 1 },
      { name: 'situacion_socioeconomica', maxCount: 1 },
      { name: 'calidad_indigena', maxCount: 1 },
      { name: 'otros_documentos', maxCount: 10 },
    ],
    SOLO_PDF,
  );

/** Endpoints sin sesión: registro de solicitudes, acuse y consulta del peticionario. */
@Controller('publico')
export class PublicoController {
  constructor(
    private readonly publicoService: PublicoService,
    private readonly config: ConfigService,
  ) {}

  /** El registro está abierto salvo que REGISTRO_ABIERTO=false en .env (cortina de "próximamente"). */
  private registroAbierto(): boolean {
    return String(this.config.get('REGISTRO_ABIERTO') ?? 'true').toLowerCase() !== 'false';
  }

  @Get('estado')
  estado() {
    return { registroAbierto: this.registroAbierto() };
  }

  @Post('solicitudes')
  @UseInterceptors(ADJUNTOS_REGISTRO())
  async registrar(@Body('datos') datos: string, @UploadedFiles() archivos: ArchivosRegistro) {
    if (!this.registroAbierto()) {
      throw new ServiceUnavailableException('Por el momento no se están recibiendo solicitudes de amnistía');
    }
    const dto = await this.publicoService.validarDatos(datos);
    return this.publicoService.registrar(dto, archivos ?? {});
  }

  /** Registro capturado dentro del sistema por el rol Registro; sigue disponible aunque la cortina esté puesta. */
  @Post('solicitudes/interno')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROL.registro)
  @UseInterceptors(ADJUNTOS_REGISTRO())
  async registrarInterno(@Body('datos') datos: string, @UploadedFiles() archivos: ArchivosRegistro) {
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

  @Get('consulta/:token/solicitudes/:id/negacion')
  async negacion(@Param('token') token: string, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    this.enviarPdf(res, await this.publicoService.negacionPorToken(token, id), false);
  }

  @Get('consulta/:token/solicitudes/:id')
  seguimiento(@Param('token') token: string, @Param('id', ParseIntPipe) id: number) {
    return this.publicoService.seguimientoPorToken(token, id);
  }
}
