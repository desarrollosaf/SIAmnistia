import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

const mayusculas = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const REGEX_CURP =
  /^[A-Z]{4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[HMX](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[A-Z]{3}[0-9A-Z][0-9]$/;

export class SolicitanteDto {
  @Type(() => Number) @IsInt()
  tipoSolicitanteId!: number;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  nombre?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  primerApellido?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  segundoApellido?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  nombreInstitucion?: string;

  @IsOptional() @IsString() @MaxLength(13) @Transform(mayusculas)
  rfc?: string;

  // Persona jurídica colectiva: titular o representante legal del organismo y descripción de la
  // documental que lo acredita como tal.
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  titularNombre?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  titularPrimerApellido?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  titularSegundoApellido?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(recortar)
  acreditacionDescripcion?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  generoId?: number;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  generoOtro?: string;

  @IsBoolean()
  relacion!: boolean;

  @IsOptional() @Type(() => Number) @IsInt()
  parentescoId?: number;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  parentescoOtro?: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @Matches(/^[0-9]{10}$/, { message: 'El teléfono debe tener 10 dígitos' })
  telefono!: string;

  @Matches(/^[0-9]{10}$/, { message: 'El celular debe tener 10 dígitos' })
  celular!: string;
}

export class DomicilioDto {
  @IsString() @MinLength(1) @MaxLength(191) @Transform(mayusculas)
  calle!: string;

  @IsString() @MinLength(1) @MaxLength(191) @Transform(mayusculas)
  numExt!: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  numInt?: string;

  @IsString() @MinLength(1) @MaxLength(191) @Transform(mayusculas)
  colonia!: string;

  @IsOptional() @IsString() @MaxLength(10) @Transform(recortar)
  codigoPostal?: string;

  @Type(() => Number) @IsInt()
  entidadId!: number;

  @Type(() => Number) @IsInt()
  municipioId!: number;
}

export class BeneficiarioDto {
  @IsString() @MinLength(2) @MaxLength(191) @Transform(mayusculas)
  nombre!: string;

  @IsString() @MinLength(2) @MaxLength(191) @Transform(mayusculas)
  primerApellido!: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  segundoApellido?: string;

  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  fechaNacimiento!: string;

  @Type(() => Number) @IsInt()
  generoId!: number;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  generoOtro?: string;

  @Matches(REGEX_CURP, { message: 'La CURP del beneficiario no es válida' })
  @Transform(mayusculas)
  curp!: string;
}

export class DelitoCarpetaDto {
  @Type(() => Number) @IsInt()
  delitoId!: number;

  @IsOptional() @Type(() => Number) @IsInt()
  modalidadId?: number | null;

  // Solo cuando el delito elegido es "OTRO".
  @IsOptional() @IsString() @MaxLength(255) @Transform(mayusculas)
  delitoOtro?: string;
}

export class CarpetaDto {
  @IsString() @MinLength(1) @MaxLength(191) @Transform(mayusculas)
  carpeta!: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  tomo?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  foja?: string;

  @IsBoolean()
  conoceUbicacion!: boolean;

  @Type(() => Number) @IsInt()
  razonSolicitudId!: number;

  @IsArray() @ArrayMinSize(1, { message: 'Cada carpeta debe tener al menos un delito' })
  @ValidateNested({ each: true }) @Type(() => DelitoCarpetaDto)
  delitos!: DelitoCarpetaDto[];
}

export class DetalleSolicitudDto {
  @IsString() @MinLength(1) @MaxLength(191) @Transform(mayusculas)
  cprs!: string;

  @Type(() => Number) @IsInt()
  situacionJuridicaId!: number;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  otroSituacionJuridica?: string;

  @Type(() => Number) @IsInt()
  tipoDefensorId!: number;

  @IsString() @MinLength(1) @MaxLength(191) @Transform(mayusculas)
  juzgado!: string;

  @Type(() => Number) @IsInt()
  perfilCriminologicoId!: number;

  @Type(() => Number) @IsInt()
  nivelDelitoId!: number;

  @IsBoolean()
  procedimientoAbreviado!: boolean;
}

/** Datos del beneficiario que completan el formato "Solicitud de amnistía"; todos opcionales. */
export class DatosFormatoDto {
  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  estadoSeEncuentra?: string;

  @IsOptional() @IsDateString()
  fechaComisionDelito?: string;

  @IsOptional() @IsIn(['INDIGENA', 'AFROMEXICANA', 'NINGUNA'])
  comunidad?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  comunidadIndigenaCual?: string;

  @IsOptional() @IsBoolean()
  interprete?: boolean;

  @IsOptional() @IsBoolean()
  discapacidad?: boolean;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  discapacidadCual?: string;

  @IsOptional() @IsBoolean()
  enfermedadCronica?: boolean;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  enfermedadCronicaCual?: string;

  @IsOptional() @IsString() @MaxLength(2000) @Transform(recortar)
  ocupacionPrevia?: string;

  @IsOptional() @IsString() @MaxLength(2000) @Transform(recortar)
  dependientesEconomicos?: string;

  @IsOptional() @IsIn(['PRIVADO', 'NO_PRIVADO', 'MEDIDA_SEGURIDAD'])
  situacionLibertad?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  medidaSeguridadCual?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  investigacionNumero?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  investigacionAgencia?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100)
  penaAnios?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100)
  penaMeses?: number;

  @IsOptional() @IsBoolean()
  multa?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  multaMonto?: number;

  @IsOptional() @IsBoolean()
  apelacion?: boolean;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  apelacionToca?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  apelacionTribunal?: string;

  @IsOptional() @IsIn(['CONFIRMO', 'MODIFICO', 'REVOCO'])
  apelacionResolucion?: string;

  @IsOptional() @IsBoolean()
  penaModificada?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100)
  penaCompurgarAnios?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100)
  penaCompurgarMeses?: number;

  @IsOptional() @IsBoolean()
  amparo?: boolean;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  amparoEfectos?: string;

  @IsOptional() @IsBoolean()
  amparoConcedido?: boolean;

  @IsOptional() @IsBoolean()
  sentenciadoAntesMismoDelito?: boolean;

  @IsOptional() @IsBoolean()
  otroProceso?: boolean;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  otroProcesoExpediente?: string;

  @IsOptional() @IsString() @MaxLength(191) @Transform(mayusculas)
  otroProcesoJuzgado?: string;
}

/** Descripción de cada documento "Otro" adjunto; va en el mismo orden que los archivos del campo otros_documentos. */
export class OtroDocumentoDto {
  @IsString() @MinLength(1, { message: 'Describe cada documento "Otro" que adjuntes' }) @MaxLength(191) @Transform(recortar)
  descripcion!: string;
}

/** Datos del formulario público; viajan como JSON en el campo "datos" del multipart. */
export class RegistroSolicitudDto {
  @ValidateNested() @Type(() => SolicitanteDto)
  solicitante!: SolicitanteDto;

  @ValidateNested() @Type(() => DomicilioDto)
  domicilio!: DomicilioDto;

  @ValidateNested() @Type(() => BeneficiarioDto)
  beneficiario!: BeneficiarioDto;

  @IsArray() @ArrayMinSize(1, { message: 'Agrega al menos una carpeta de investigación' })
  @ValidateNested({ each: true }) @Type(() => CarpetaDto)
  carpetas!: CarpetaDto[];

  @ValidateNested() @Type(() => DetalleSolicitudDto)
  solicitud!: DetalleSolicitudDto;

  @IsOptional() @ValidateNested() @Type(() => DatosFormatoDto)
  datosFormato?: DatosFormatoDto;

  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => OtroDocumentoDto)
  otrosDocumentos?: OtroDocumentoDto[];

  @IsOptional() @IsString()
  observacionesHechos?: string;

  @IsOptional() @IsString()
  informacionComplementaria?: string;
}
