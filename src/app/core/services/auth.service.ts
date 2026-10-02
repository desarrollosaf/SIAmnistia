import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export const ROL_SUPER_USUARIO = 'Super usuario';

export interface AuthUser {
  id: number;
  email: string;
  nombre: string;
  institucionId: number;
  institucion: string;
  /** Poder Legislativo: acepta, turna y resuelve solicitudes. */
  legislativo: boolean;
  /** Poder Judicial: concluye las solicitudes resueltas. */
  judicial: boolean;
  roles: string[];
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'amn_token';
const USER_KEY = 'amn_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());
  readonly esSuperUsuario = computed(() => this.currentUser()?.roles.includes(ROL_SUPER_USUARIO) ?? false);
  readonly esLegislativo = computed(() => this.currentUser()?.legislativo ?? false);

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(({ access_token, user }) => {
        localStorage.setItem(TOKEN_KEY, access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  private readStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
