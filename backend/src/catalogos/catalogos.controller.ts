import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogosService } from './catalogos.service';

@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  // Públicos: los usa el formulario de registro, que no requiere sesión.
  @Get('formulario')
  formulario() {
    return this.catalogosService.formulario();
  }

  @Get('municipios/:entidadId')
  municipios(@Param('entidadId', ParseIntPipe) entidadId: number) {
    return this.catalogosService.municipios(entidadId);
  }

  @Get('instituciones')
  @UseGuards(JwtAuthGuard)
  instituciones() {
    return this.catalogosService.instituciones();
  }

  @Get('instituciones/:id/usuarios')
  @UseGuards(JwtAuthGuard)
  usuariosInstitucion(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.usuariosInstitucion(id);
  }

  @Get('recomendaciones')
  @UseGuards(JwtAuthGuard)
  recomendaciones() {
    return this.catalogosService.recomendaciones();
  }

  @Get('estatus-solicitud')
  @UseGuards(JwtAuthGuard)
  estatusSolicitud() {
    return this.catalogosService.estatusSolicitud();
  }
}
