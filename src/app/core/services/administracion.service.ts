import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  email: string;
  telefono: string;
  celular: string;
  institucionId: number;
  institucion: string;
  roles: { id: number; nombre: string }[];
}

export interface UsuarioGuardar {
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  email: string;
  telefono: string;
  celular: string;
  institucionId: number;
  password?: string;
  rolIds: number[];
}

/** Fila genérica de un catálogo administrable; cada catálogo trae sus propios campos. */
export type FilaCatalogo = { id: number } & Record<string, string | number | boolean | null>;

@Injectable({ providedIn: 'root' })
export class AdministracionService {
  private readonly url = `${environment.apiUrl}/administracion`;

  constructor(private readonly http: HttpClient) {}

  usuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.url}/usuarios`);
  }

  guardarUsuario(datos: UsuarioGuardar, id?: number): Observable<UsuarioAdmin> {
    return id
      ? this.http.patch<UsuarioAdmin>(`${this.url}/usuarios/${id}`, datos)
      : this.http.post<UsuarioAdmin>(`${this.url}/usuarios`, datos);
  }

  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/usuarios/${id}`);
  }

  listar(recurso: string): Observable<FilaCatalogo[]> {
    return this.http.get<FilaCatalogo[]>(`${this.url}/${recurso}`);
  }

  guardar(recurso: string, datos: Record<string, unknown>, id?: number): Observable<unknown> {
    return id
      ? this.http.patch(`${this.url}/${recurso}/${id}`, datos)
      : this.http.post(`${this.url}/${recurso}`, datos);
  }

  eliminar(recurso: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${recurso}/${id}`);
  }
}
