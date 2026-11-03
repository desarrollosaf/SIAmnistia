import { Routes } from '@angular/router';

export const CONSULTA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./solicitar-token/solicitar-token').then((m) => m.SolicitarToken),
  },
  // Consulta de una sola solicitud por su folio (sin liga por correo).
  {
    path: 'folio/:folio/:anio',
    loadComponent: () => import('./mis-solicitudes/mis-solicitudes').then((m) => m.MisSolicitudes),
  },
  {
    path: ':token',
    loadComponent: () => import('./mis-solicitudes/mis-solicitudes').then((m) => m.MisSolicitudes),
  },
];
