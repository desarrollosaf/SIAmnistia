import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { ROL_REGISTRO } from '../../core/services/auth.service';

export const SOLICITUDES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./lista/solicitudes-lista').then((m) => m.SolicitudesLista),
  },
  // Captura de una solicitud dentro del sistema (rol Registro).
  {
    path: 'nueva',
    canActivate: [roleGuard([ROL_REGISTRO])],
    data: { interno: true },
    loadComponent: () => import('../registro/registro').then((m) => m.Registro),
  },
  {
    path: ':id',
    loadComponent: () => import('./detalle/solicitud-detalle').then((m) => m.SolicitudDetalle),
  },
];
