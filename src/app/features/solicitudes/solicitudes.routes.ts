import { Routes } from '@angular/router';

export const SOLICITUDES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./lista/solicitudes-lista').then((m) => m.SolicitudesLista),
  },
  {
    path: ':id',
    loadComponent: () => import('./detalle/solicitud-detalle').then((m) => m.SolicitudDetalle),
  },
];
