import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Institucion } from './models/institucion.model';
import { Usuario } from './models/usuario.model';
import { Rol } from './models/rol.model';
import { ModelHasRole } from './models/model-has-role.model';
import { Entidad } from './models/entidad.model';
import { Municipio } from './models/municipio.model';
import { Genero } from './models/genero.model';
import { TipoPersona } from './models/tipo-persona.model';
import { TipoSolicitante } from './models/tipo-solicitante.model';
import { Parentesco } from './models/parentesco.model';
import { SituacionJuridica } from './models/situacion-juridica.model';
import { TipoDefensor } from './models/tipo-defensor.model';
import { PerfilCriminologico } from './models/perfil-criminologico.model';
import { NivelDelito } from './models/nivel-delito.model';
import { RazonSolicitud } from './models/razon-solicitud.model';
import { Recomendacion } from './models/recomendacion.model';
import { EstatusSolicitud } from './models/estatus-solicitud.model';
import { EstatusTurno } from './models/estatus-turno.model';
import { TipoContador } from './models/tipo-contador.model';
import { Contador } from './models/contador.model';
import { Delito } from './models/delito.model';
import { ModalidadDelito } from './models/modalidad-delito.model';
import { Persona } from './models/persona.model';
import { Domicilio } from './models/domicilio.model';
import { Solicitud } from './models/solicitud.model';
import { SolicitudCarpeta } from './models/solicitud-carpeta.model';
import { CarpetaDelito } from './models/carpeta-delito.model';
import { SolicitudUser } from './models/solicitud-user.model';
import { Documento } from './models/documento.model';
import { Suspencion } from './models/suspencion.model';
import { TokenConsulta } from './models/token-consulta.model';

export const MODELOS = [
  Institucion,
  Usuario,
  Rol,
  ModelHasRole,
  Entidad,
  Municipio,
  Genero,
  TipoPersona,
  TipoSolicitante,
  Parentesco,
  SituacionJuridica,
  TipoDefensor,
  PerfilCriminologico,
  NivelDelito,
  RazonSolicitud,
  Recomendacion,
  EstatusSolicitud,
  EstatusTurno,
  TipoContador,
  Contador,
  Delito,
  ModalidadDelito,
  Persona,
  Domicilio,
  Solicitud,
  SolicitudCarpeta,
  CarpetaDelito,
  SolicitudUser,
  Documento,
  Suspencion,
  TokenConsulta,
];

// Registra todos los modelos de la base de amnistía; los módulos de dominio solo inyectan los que usan.
@Global()
@Module({
  imports: [SequelizeModule.forFeature(MODELOS)],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
