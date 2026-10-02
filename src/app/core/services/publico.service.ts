import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RegistroRespuesta {
  uuid: string;
  folio: string;
}

export interface SolicitudConsulta {
  id: number;
  nus: string;
  fechaRegistro: string;
  beneficiario: string;
  peticionario: string;
  estatus: string;
}

export interface SeguimientoConsulta {
  nus: string;
  estatus: string;
  fechaRegistro: string;
  fechaAprobacion: string | null;
  fechaFinalizo: string | null;
  turnos: { institucion: string; fechaTurno: string; estatus: string; recomendacion: string | null }[];
}

export interface ValidacionAcuse {
  nus: string;
  uuid: string | null;
  fechaRegistro: string;
}

@Injectable({ providedIn: 'root' })
export class PublicoService {
  private readonly url = `${environment.apiUrl}/publico`;

  constructor(private readonly http: HttpClient) {}

  /** Envía la solicitud con sus PDFs; reporta el progreso de subida (los archivos pueden pesar). */
  registrar(form: FormData): Observable<HttpEvent<RegistroRespuesta>> {
    return this.http.post<RegistroRespuesta>(`${this.url}/solicitudes`, form, {
      reportProgress: true,
      observe: 'events',
    });
  }

  urlAcuse(uuid: string): string {
    return `${this.url}/acuse/${uuid}`;
  }

  validarAcuse(cadena: string): Observable<ValidacionAcuse> {
    return this.http.get<ValidacionAcuse>(`${this.url}/validar-acuse/${cadena}`);
  }

  solicitarToken(email: string): Observable<{ enviado: boolean; minutos: number }> {
    return this.http.post<{ enviado: boolean; minutos: number }>(`${this.url}/consulta/token`, { email });
  }

  solicitudes(token: string): Observable<SolicitudConsulta[]> {
    return this.http.get<SolicitudConsulta[]>(`${this.url}/consulta/${token}`);
  }

  seguimiento(token: string, id: number): Observable<SeguimientoConsulta> {
    return this.http.get<SeguimientoConsulta>(`${this.url}/consulta/${token}/solicitudes/${id}`);
  }
}
