import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ROL_SUPER_USUARIO } from './core/services/auth.service';

export const routes: Routes = [
  // Página de inicio pública (información de la Ley y acceso a la petición).
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  // Páginas públicas (sin sesión): registro, consulta del peticionario y acuse.
  {
    path: '',
    loadComponent: () => import('./layout/publico/publico-layout').then((m) => m.PublicoLayout),
    children: [
      {
        path: 'registro',
        loadComponent: () => import('./features/registro/registro').then((m) => m.Registro),
      },
      {
        path: 'consulta',
        loadChildren: () => import('./features/consulta/consulta.routes').then((m) => m.CONSULTA_ROUTES),
      },
      {
        path: 'validar-acuse/:cadena',
        loadComponent: () => import('./features/acuse/validar-acuse').then((m) => m.ValidarAcuse),
      },
    ],
  },
  {
    path: 'acuse/:uuid',
    loadComponent: () => import('./features/acuse/ver-acuse').then((m) => m.VerAcuse),
  },
  {
    path: 'formato/:uuid',
    loadComponent: () => import('./features/acuse/ver-formato').then((m) => m.VerFormato),
  },
  // Sistema interno.
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'inicio',
        loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio),
      },
      {
        path: 'solicitudes',
        loadChildren: () =>
          import('./features/solicitudes/solicitudes.routes').then((m) => m.SOLICITUDES_ROUTES),
      },
      {
        path: 'administracion',
        canActivate: [roleGuard([ROL_SUPER_USUARIO])],
        loadChildren: () =>
          import('./features/administracion/administracion.routes').then((m) => m.ADMINISTRACION_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
