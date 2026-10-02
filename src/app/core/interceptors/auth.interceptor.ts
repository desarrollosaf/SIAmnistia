import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token;

  const solicitud = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(solicitud).pipe(
    catchError((error: unknown) => {
      const esLogin = req.url === `${environment.apiUrl}/auth/login`;
      const esPublico = req.url.startsWith(`${environment.apiUrl}/publico`);

      if (error instanceof HttpErrorResponse && error.status === 401 && !esLogin && !esPublico) {
        authService.logout();
        void router.navigate(['/login'], { queryParams: { motivo: 'sesion' } });
      }

      return throwError(() => error);
    }),
  );
};

/** Mensaje legible de un error del backend (los filtros de Nest ya lo traducen al español). */
export function mensajeError(error: unknown, porDefecto: string): string {
  if (error instanceof HttpErrorResponse) {
    const mensaje = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(mensaje) && mensaje.length) return mensaje[0];
    if (typeof mensaje === 'string' && mensaje) return mensaje;
    if (error.status === 0) return 'No hay conexión con el servidor.';
  }
  return porDefecto;
}
