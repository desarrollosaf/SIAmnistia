import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Opcion {
  id: number;
  nombre: string;
  clave?: string;
}

export interface DelitoCatalogo extends Opcion {
  modalidades: Opcion[];
}

export interface CatalogosFormulario {
  generos: Opcion[];
  tiposSolicitante: Opcion[];
  entidades: Opcion[];
  situacionesJuridicas: Opcion[];
  tiposDefensores: Opcion[];
  perfilesCriminologicos: Opcion[];
  nivelesDelito: Opcion[];
  razonesSolicitud: Opcion[];
  parentescos: Opcion[];
  delitos: DelitoCatalogo[];
}

export interface UsuarioInstitucion {
  id: number;
  nombre: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly url = `${environment.apiUrl}/catalogos`;
  private formulario$?: Observable<CatalogosFormulario>;

  constructor(private readonly http: HttpClient) {}

  formulario(): Observable<CatalogosFormulario> {
    this.formulario$ ??= this.http.get<CatalogosFormulario>(`${this.url}/formulario`).pipe(shareReplay(1));
    return this.formulario$;
  }

  municipios(entidadId: number): Observable<Opcion[]> {
    return this.http.get<Opcion[]>(`${this.url}/municipios/${entidadId}`);
  }

  instituciones(): Observable<Opcion[]> {
    return this.http.get<Opcion[]>(`${this.url}/instituciones`);
  }

  usuariosInstitucion(institucionId: number): Observable<UsuarioInstitucion[]> {
    return this.http.get<UsuarioInstitucion[]>(`${this.url}/instituciones/${institucionId}/usuarios`);
  }

  recomendaciones(): Observable<Opcion[]> {
    return this.http.get<Opcion[]>(`${this.url}/recomendaciones`);
  }
}
