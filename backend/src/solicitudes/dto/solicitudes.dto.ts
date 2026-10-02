import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength,
} from 'class-validator';

const mayusculas = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

/** Corrección de datos de la solicitud por el Poder Legislativo (todos los campos opcionales). */
export class ActualizarSolicitudDto {
  // Beneficiario
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) beneficiarioNombre?: string;
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) beneficiarioPrimerApellido?: string;
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) beneficiarioSegundoApellido?: string;
  @IsOptional() @IsDateString() beneficiarioFechaNacimiento?: string;
  @IsOptional() @IsString() @MaxLength(18) @Transform(mayusculas) beneficiarioCurp?: string;

  // Peticionario
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) solicitanteNombre?: string;
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) solicitantePrimerApellido?: string;
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) solicitanteSegundoApellido?: string;
  @IsOptional() @IsEmail() solicitanteEmail?: string;
  @IsOptional() @IsString() @MaxLength(20) solicitanteTelefono?: string;
  @IsOptional() @IsString() @MaxLength(20) solicitanteCelular?: string;

  // Domicilio del peticionario
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) calle?: string;
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) numExt?: string;
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) numInt?: string;
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) colonia?: string;
  @IsOptional() @Type(() => Number) @IsInt() entidadId?: number;
  @IsOptional() @Type(() => Number) @IsInt() municipioId?: number;

  // Solicitud
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) cprs?: string;
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas) juzgado?: string;
  @IsOptional() @IsBoolean() procedimientoAbreviado?: boolean;
}

export class TurnarDto {
  @Type(() => Number) @IsInt()
  usuarioId!: number;
}

export class ResolucionDto {
  @Type(() => Number) @IsInt()
  recomendacionId!: number;
}

export class DocumentoDto {
  @IsString() @IsNotEmpty({ message: 'Captura la descripción del documento' }) @MaxLength(191)
  descripcion!: string;
}
