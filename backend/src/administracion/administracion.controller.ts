import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Usuario } from '../auth/decorators/usuario.decorator';
import type { UsuarioActual } from '../auth/usuario-actual';
import { ROL } from '../common/amnistia.constants';
import { UsuariosService } from './usuarios.service';
import { CatalogosAdminService } from './catalogos-admin.service';
import {
  ContadorDto, DelitoDto, InstitucionDto, ModalidadDto, NombreDto, UsuarioDto,
} from './dto/administracion.dto';

/** Catálogos y usuarios: solo el Super usuario (como el menú de Administración del sistema anterior). */
@Controller('administracion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL.superUsuario)
export class AdministracionController {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly catalogos: CatalogosAdminService,
  ) {}

  // --- Usuarios ------------------------------------------------------------------------

  @Get('usuarios')
  listarUsuarios() {
    return this.usuarios.listar();
  }

  @Get('usuarios/:id')
  obtenerUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.obtener(id);
  }

  @Post('usuarios')
  crearUsuario(@Body() dto: UsuarioDto) {
    return this.usuarios.crear(dto);
  }

  @Patch('usuarios/:id')
  actualizarUsuario(@Param('id', ParseIntPipe) id: number, @Body() dto: UsuarioDto) {
    return this.usuarios.actualizar(id, dto);
  }

  @Delete('usuarios/:id')
  eliminarUsuario(@Param('id', ParseIntPipe) id: number, @Usuario() user: UsuarioActual) {
    return this.usuarios.eliminar(id, user.sub);
  }

  // --- Roles ---------------------------------------------------------------------------

  @Get('roles')
  roles() {
    return this.catalogos.roles();
  }

  @Post('roles')
  crearRol(@Body() dto: NombreDto) {
    return this.catalogos.guardarRol(dto.nombre);
  }

  @Patch('roles/:id')
  actualizarRol(@Param('id', ParseIntPipe) id: number, @Body() dto: NombreDto) {
    return this.catalogos.guardarRol(dto.nombre, id);
  }

  @Delete('roles/:id')
  eliminarRol(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.eliminarRol(id);
  }

  // --- Instituciones -------------------------------------------------------------------

  @Get('instituciones')
  instituciones() {
    return this.catalogos.instituciones();
  }

  @Post('instituciones')
  crearInstitucion(@Body() dto: InstitucionDto) {
    return this.catalogos.guardarInstitucion(dto);
  }

  @Patch('instituciones/:id')
  actualizarInstitucion(@Param('id', ParseIntPipe) id: number, @Body() dto: InstitucionDto) {
    return this.catalogos.guardarInstitucion(dto, id);
  }

  @Delete('instituciones/:id')
  eliminarInstitucion(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.eliminarInstitucion(id);
  }

  // --- Delitos -------------------------------------------------------------------------

  @Get('delitos')
  delitos() {
    return this.catalogos.delitos();
  }

  @Post('delitos')
  crearDelito(@Body() dto: DelitoDto) {
    return this.catalogos.guardarDelito(dto);
  }

  @Patch('delitos/:id')
  actualizarDelito(@Param('id', ParseIntPipe) id: number, @Body() dto: DelitoDto) {
    return this.catalogos.guardarDelito(dto, id);
  }

  @Delete('delitos/:id')
  eliminarDelito(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.eliminarDelito(id);
  }

  // --- Modalidades ---------------------------------------------------------------------

  @Get('modalidades')
  modalidades() {
    return this.catalogos.modalidades();
  }

  @Post('modalidades')
  crearModalidad(@Body() dto: ModalidadDto) {
    return this.catalogos.guardarModalidad(dto);
  }

  @Patch('modalidades/:id')
  actualizarModalidad(@Param('id', ParseIntPipe) id: number, @Body() dto: ModalidadDto) {
    return this.catalogos.guardarModalidad(dto, id);
  }

  @Delete('modalidades/:id')
  eliminarModalidad(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.eliminarModalidad(id);
  }

  // --- Géneros -------------------------------------------------------------------------

  @Get('generos')
  generos() {
    return this.catalogos.generos();
  }

  @Post('generos')
  crearGenero(@Body() dto: NombreDto) {
    return this.catalogos.guardarGenero(dto.nombre);
  }

  @Patch('generos/:id')
  actualizarGenero(@Param('id', ParseIntPipe) id: number, @Body() dto: NombreDto) {
    return this.catalogos.guardarGenero(dto.nombre, id);
  }

  @Delete('generos/:id')
  eliminarGenero(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.eliminarGenero(id);
  }

  // --- Contadores ----------------------------------------------------------------------

  @Get('contadores')
  contadores() {
    return this.catalogos.contadores();
  }

  @Patch('contadores/:id')
  actualizarContador(@Param('id', ParseIntPipe) id: number, @Body() dto: ContadorDto) {
    return this.catalogos.actualizarContador(id, dto.numero);
  }
}
