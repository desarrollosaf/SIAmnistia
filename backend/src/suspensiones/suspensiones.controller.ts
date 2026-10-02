import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards,
} from '@nestjs/common';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SoloLegislativo } from '../auth/decorators/usuario.decorator';
import { SuspensionesService } from './suspensiones.service';
import type { TipoSuspension } from './suspensiones.service';

class CrearSuspensionDto {
  @IsIn(['solicitud', 'institucion'])
  tipo!: TipoSuspension;

  @Type(() => Number) @IsInt()
  id!: number;

  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  fechaInicio!: string;

  @IsDateString({}, { message: 'La fecha de término no es válida' })
  fechaFin!: string;

  @IsString() @IsNotEmpty({ message: 'Captura la justificación' }) @MaxLength(191)
  justificacion!: string;
}

/** Suspensión de términos: periodos que no cuentan para el plazo de acuse de los turnos. */
@Controller('suspensiones')
@UseGuards(JwtAuthGuard, RolesGuard)
@SoloLegislativo()
export class SuspensionesController {
  constructor(private readonly suspensionesService: SuspensionesService) {}

  @Get(':tipo/:id')
  listar(@Param('tipo') tipo: TipoSuspension, @Param('id', ParseIntPipe) id: number) {
    return this.suspensionesService.listar(tipo, id);
  }

  @Post()
  crear(@Body() dto: CrearSuspensionDto) {
    return this.suspensionesService.crear(dto.tipo, dto.id, dto.fechaInicio.slice(0, 10), dto.fechaFin.slice(0, 10), dto.justificacion);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.suspensionesService.eliminar(id);
  }
}
