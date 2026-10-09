import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Semaforo = 'verde' | 'amarillo' | 'naranja' | 'rojo' | null;

export interface SolicitudListado {
  id: number;
  nus: string;
  beneficiario: string;
  solicitante: string;
  fechaRegistro: string;
  estatusId: number;
  estatus: string;
  miTurno: string | null;
  semaforo: Semaforo;
  fichaUuid: string | null;
}

export interface ResumenSolicitudes {
  total: number;
  estatus: { id: number; nombre: string; total: number }[];
  turnosPendientes: number;
}

export interface AccionesSolicitud {
  aceptar: boolean;
  negar: boolean;
  resolver: boolean;
  turnar: boolean;
  editar: boolean;
  regenerarDocumentos: boolean;
  indicarRecepcion: boolean;
  prevenir: boolean;
  opinar: boolean;
  concluir: boolean;
}

/** Datos complementarios del beneficiario (y titular del organismo); solo llegan las respuestas capturadas. */
export interface DatosFormatoDetalle {
  titularNombre?: string;
  titularPrimerApellido?: string;
  titularSegundoApellido?: string;
  estadoSeEncuentra?: string;
  fechaComisionDelito?: string;
  comunidad?: 'INDIGENA' | 'AFROMEXICANA' | 'NINGUNA';
  comunidadIndigenaCual?: string;
  interprete?: boolean;
  discapacidad?: boolean;
  discapacidadCual?: string;
  enfermedadCronica?: boolean;
  enfermedadCronicaCual?: string;
  ocupacionPrevia?: string;
  dependientesEconomicos?: string;
  situacionLibertad?: 'PRIVADO' | 'NO_PRIVADO' | 'MEDIDA_SEGURIDAD';
  medidaSeguridadCual?: string;
  investigacionNumero?: string;
  investigacionAgencia?: string;
  penaAnios?: number;
  penaMeses?: number;
  multa?: boolean;
  multaMonto?: string | number;
  apelacion?: boolean;
  apelacionToca?: string;
  apelacionTribunal?: string;
  apelacionResolucion?: 'CONFIRMO' | 'MODIFICO' | 'REVOCO';
  penaModificada?: boolean;
  penaCompurgarAnios?: number;
  penaCompurgarMeses?: number;
  amparo?: boolean;
  amparoEfectos?: string;
  amparoConcedido?: boolean;
  sentenciadoAntesMismoDelito?: boolean;
  otroProceso?: boolean;
  otroProcesoExpediente?: string;
  otroProcesoJuzgado?: string;
}

export interface SolicitudDetalle {
  id: number;
  nus: string;
  estatus: string;
  estatusId: number;
  fechaRegistro: string;
  fechaAprobacion: string | null;
  fechaFinalizo: string | null;
  recomendacion: string | null;
  semaforo: Semaforo;
  beneficiario: {
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
    fechaNacimiento: string | null;
    genero: string;
    curp: string | null;
    nacionalidad: string;
  };
  datosFormato: DatosFormatoDetalle | null;
  solicitante: {
    personaFisica: boolean;
    nombre: string;
    primerApellido: string | null;
    segundoApellido: string | null;
    rfc: string | null;
    genero: string;
    parentesco: string | null;
    email: string | null;
    telefono: string | null;
    celular: string | null;
    domicilio: {
      calle: string | null;
      numExt: string | null;
      numInt: string | null;
      colonia: string | null;
      entidadId: number | null;
      entidad: string;
      municipioId: number | null;
      municipio: string;
    } | null;
  };
  detalle: {
    cprs: string;
    situacionJuridica: string;
    tipoDefensor: string;
    juzgado: string;
    perfilCriminologico: string;
    nivelDelito: string;
    procedimientoAbreviado: boolean;
    observacionesHechos: string | null;
    informacionComplementaria: string | null;
  };
  carpetas: {
    id: number;
    carpeta: string;
    razon: string;
    tomo: string | null;
    foja: string | null;
    delitos: { id: number; delito: string }[];
  }[];
  miTurno: { id: number; estatus: string; prevencion: boolean } | null;
  acciones: AccionesSolicitud;
}

export interface Turno {
  id: number;
  usuarioId: number;
  usuario: string;
  institucion: string;
  estatus: string;
  prevencion: boolean;
  recomendacion: string;
  fechaTurno: string;
  fechaEvaluacion: string | null;
  fechaTermino: string | null;
}

export interface DocumentoSolicitud {
  id: number;
  uuid: string;
  nombre: string;
  descripcion: string;
  tamanoKb: number;
  fecha: string;
  fichaTecnica: boolean;
  usuarioId: number | null;
  usuario: string;
  institucion: string;
}

export type ActualizacionSolicitud = Partial<Record<string, string | number | boolean | null>>;

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly url = `${environment.apiUrl}/solicitudes`;

  constructor(private readonly http: HttpClient) {}

  listar(estatus = 0): Observable<SolicitudListado[]> {
    return this.http.get<SolicitudListado[]>(this.url, { params: estatus ? { estatus } : {} });
  }

  resumen(): Observable<ResumenSolicitudes> {
    return this.http.get<ResumenSolicitudes>(`${this.url}/resumen`);
  }

  excel(): Observable<Blob> {
    return this.http.get(`${this.url}/excel`, { responseType: 'blob' });
  }

  detalle(id: number): Observable<SolicitudDetalle> {
    return this.http.get<SolicitudDetalle>(`${this.url}/${id}`);
  }

  actualizar(id: number, datos: ActualizacionSolicitud): Observable<void> {
    return this.http.patch<void>(`${this.url}/${id}`, datos);
  }

  aceptar(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/aceptar`, {});
  }

  negar(id: number, archivo: File): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/negar`, this.conArchivo(archivo));
  }

  resolver(id: number, recomendacionId: number, archivo: File): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/resolucion`, this.conArchivo(archivo, { recomendacionId: String(recomendacionId) }));
  }

  regenerarDocumentos(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/regenerar-documentos`, {});
  }

  turnos(id: number): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.url}/${id}/turnos`);
  }

  turnar(id: number, usuarioId: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/turnos`, { usuarioId });
  }

  quitarTurno(id: number, turnoId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/turnos/${turnoId}`);
  }

  responderPrevencion(id: number, turnoId: number, archivo: File): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/turnos/${turnoId}/respuesta-prevencion`, this.conArchivo(archivo));
  }

  indicarRecepcion(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/recepcion`, {});
  }

  prevenir(id: number, archivo: File): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/prevencion`, this.conArchivo(archivo));
  }

  opinar(id: number, archivo: File): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/opinion`, this.conArchivo(archivo));
  }

  concluir(id: number, archivo: File): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/concluir`, this.conArchivo(archivo));
  }

  documentos(id: number): Observable<DocumentoSolicitud[]> {
    return this.http.get<DocumentoSolicitud[]>(`${this.url}/${id}/documentos`);
  }

  subirDocumento(id: number, archivo: File, descripcion: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/documentos`, this.conArchivo(archivo, { descripcion }));
  }

  /** Contenido de un documento (requiere sesión, por eso no se abre con una liga directa). */
  archivo(uuid: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/documentos/${uuid}/archivo`, { responseType: 'blob' });
  }

  private conArchivo(archivo: File, campos: Record<string, string> = {}): FormData {
    const form = new FormData();
    Object.entries(campos).forEach(([k, v]) => form.append(k, v));
    form.append('archivo', archivo);
    return form;
  }
}
