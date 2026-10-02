import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TipoSuspension = 'solicitud' | 'institucion';

export interface Suspension {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  justificacion: string;
}

@Injectable({ providedIn: 'root' })
export class SuspensionesService {
  private readonly url = `${environment.apiUrl}/suspensiones`;

  constructor(private readonly http: HttpClient) {}

  listar(tipo: TipoSuspension, id: number): Observable<Suspension[]> {
    return this.http.get<Suspension[]>(`${this.url}/${tipo}/${id}`);
  }

  crear(tipo: TipoSuspension, id: number, fechaInicio: string, fechaFin: string, justificacion: string): Observable<void> {
    return this.http.post<void>(this.url, { tipo, id, fechaInicio, fechaFin, justificacion });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
