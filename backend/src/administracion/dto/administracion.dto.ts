import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique, IsArray, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength,
  Min, MinLength,
} from 'class-validator';

const mayusculas = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UsuarioDto {
  @IsString() @IsNotEmpty() @MaxLength(191) @Transform(mayusculas)
  nombre!: string;

  @IsString() @IsNotEmpty() @MaxLength(191) @Transform(mayusculas)
  primerApellido!: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  segundoApellido?: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @Matches(/^[0-9]{10}$/, { message: 'El teléfono debe tener 10 dígitos' })
  telefono!: string;

  @Matches(/^[0-9]{10}$/, { message: 'El celular debe tener 10 dígitos' })
  celular!: string;

  @Type(() => Number) @IsInt()
  institucionId!: number;

  // Obligatoria al crear; al editar, vacía significa "no cambiarla".
  @IsOptional() @IsString() @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @IsOptional() @IsArray() @ArrayUnique() @Type(() => Number) @IsInt({ each: true })
  rolIds?: number[];
}

export class NombreDto {
  @IsString() @IsNotEmpty({ message: 'Captura el nombre' }) @MaxLength(191) @Transform(recortar)
  nombre!: string;
}

export class InstitucionDto {
  @IsString() @IsNotEmpty({ message: 'Captura el nombre de la institución' }) @MaxLength(191) @Transform(mayusculas)
  nombre!: string;

  @IsEmail({}, { message: 'El correo de la institución no es válido' }) @Transform(recortar)
  email!: string;
}

export class DelitoDto {
  @IsString() @IsNotEmpty({ message: 'Captura el delito' }) @MaxLength(191) @Transform(mayusculas)
  delito!: string;
}

export class ModalidadDto {
  @Type(() => Number) @IsInt()
  delitoId!: number;

  @IsString() @IsNotEmpty({ message: 'Captura la modalidad' }) @Transform(recortar)
  nombre!: string;
}

export class ContadorDto {
  @Type(() => Number) @IsInt() @Min(1)
  numero!: number;
}
