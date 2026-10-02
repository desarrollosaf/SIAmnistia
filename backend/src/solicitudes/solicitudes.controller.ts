import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SoloLegislativo, Usuario } from '../auth/decorators/usuario.decorator';
import type { UsuarioActual } from '../auth/usuario-actual';
import { SOLO_PDF } from '../common/pdf-upload.util';
import { MAX_PDF_BYTES } from '../common/amnistia.constants';
import { fechaHoyMexico } from '../common/fecha-mexico.util';
import { SolicitudesService } from './solicitudes.service';
import { ActualizarSolicitudDto, DocumentoDto, ResolucionDto, TurnarDto } from './dto/solicitudes.dto';

const PDF = (campo: string) => FileInterceptor(campo, SOLO_PDF);

@Controller('solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Get()
  listar(@Usuario() user: UsuarioActual, @Query('estatus') estatus?: string) {
    return this.solicitudesService.listar(user, Number(estatus) || 0);
  }

  @Get('resumen')
  resumen(@Usuario() user: UsuarioActual) {
    return this.solicitudesService.resumen(user);
  }

  @Get('excel')
  @SoloLegislativo()
  async excel(@Res() res: Response) {
    const contenido = await this.solicitudesService.excel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="solicitudes-${fechaHoyMexico()}.xlsx"`,
    });
    res.send(contenido);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number, @Usuario() user: UsuarioActual) {
    return this.solicitudesService.detalle(id, user);
  }

  @Patch(':id')
  @SoloLegislativo()
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarSolicitudDto) {
    return this.solicitudesService.actualizar(id, dto);
  }

  // --- Poder Legislativo ---------------------------------------------------------------

  @Post(':id/aceptar')
  @SoloLegislativo()
  aceptar(@Param('id', ParseIntPipe) id: number) {
    return this.solicitudesService.aceptar(id);
  }

  @Post(':id/negar')
  @SoloLegislativo()
  @UseInterceptors(PDF('archivo'))
  negar(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() user: UsuarioActual,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.solicitudesService.negar(id, user, archivo);
  }

  @Post(':id/resolucion')
  @SoloLegislativo()
  @UseInterceptors(PDF('archivo'))
  resolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolucionDto,
    @Usuario() user: UsuarioActual,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.solicitudesService.resolver(id, dto.recomendacionId, user, archivo);
  }

  @Post(':id/regenerar-documentos')
  @SoloLegislativo()
  regenerar(@Param('id', ParseIntPipe) id: number) {
    return this.solicitudesService.regenerarDocumentos(id);
  }

  @Get(':id/turnos')
  turnos(@Param('id', ParseIntPipe) id: number, @Usuario() user: UsuarioActual) {
    return this.solicitudesService.turnos(id, user);
  }

  @Post(':id/turnos')
  @SoloLegislativo()
  turnar(@Param('id', ParseIntPipe) id: number, @Body() dto: TurnarDto) {
    return this.solicitudesService.turnar(id, dto.usuarioId);
  }

  @Delete(':id/turnos/:turnoId')
  @SoloLegislativo()
  quitarTurno(@Param('id', ParseIntPipe) id: number, @Param('turnoId', ParseIntPipe) turnoId: number) {
    return this.solicitudesService.quitarTurno(id, turnoId);
  }

  @Post(':id/turnos/:turnoId/respuesta-prevencion')
  @SoloLegislativo()
  @UseInterceptors(PDF('archivo'))
  responderPrevencion(
    @Param('id', ParseIntPipe) id: number,
    @Param('turnoId', ParseIntPipe) turnoId: number,
    @Usuario() user: UsuarioActual,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.solicitudesService.responderPrevencion(id, turnoId, user, archivo);
  }

  // --- Instituciones turnadas ----------------------------------------------------------

  @Post(':id/recepcion')
  indicarRecepcion(@Param('id', ParseIntPipe) id: number, @Usuario() user: UsuarioActual) {
    return this.solicitudesService.indicarRecepcion(id, user);
  }

  @Post(':id/prevencion')
  @UseInterceptors(PDF('archivo'))
  prevenir(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() user: UsuarioActual,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.solicitudesService.prevenir(id, user, archivo);
  }

  @Post(':id/opinion')
  @UseInterceptors(PDF('archivo'))
  opinar(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() user: UsuarioActual,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.solicitudesService.opinar(id, user, archivo);
  }

  @Post(':id/concluir')
  @UseInterceptors(PDF('archivo'))
  concluir(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() user: UsuarioActual,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.solicitudesService.concluir(id, user, archivo);
  }

  // --- Documentos ----------------------------------------------------------------------

  @Get(':id/documentos')
  documentos(@Param('id', ParseIntPipe) id: number, @Usuario() user: UsuarioActual) {
    return this.solicitudesService.documentos(id, user);
  }

  @Post(':id/documentos')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: MAX_PDF_BYTES } }))
  subirDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DocumentoDto,
    @Usuario() user: UsuarioActual,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.solicitudesService.subirDocumento(id, user, dto.descripcion, archivo);
  }
}
