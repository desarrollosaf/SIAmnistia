import { Routes } from '@angular/router';

export const CONSULTA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./solicitar-token/solicitar-token').then((m) => m.SolicitarToken),
  },
  {
    path: ':token',
    loadComponent: () => import('./mis-solicitudes/mis-solicitudes').then((m) => m.MisSolicitudes),
  },
];
