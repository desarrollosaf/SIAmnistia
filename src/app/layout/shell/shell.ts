import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { interval, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { InactivityService } from '../../core/services/inactivity.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';
import { Icono } from '../../shared/icono/icono';

const INTERVALO_NOTIFICACIONES_MS = 60000;

interface NavChild {
  label: string;
  route: string;
}

interface NavItem {
  label: string;
  icono: string;
  route?: string;
  children?: NavChild[];
}

const ADMINISTRACION: NavItem = {
  label: 'Administración',
  icono: 'ajustes',
  children: [
    { label: 'Usuarios', route: '/administracion/usuarios' },
    { label: 'Roles', route: '/administracion/roles' },
    { label: 'Instituciones', route: '/administracion/instituciones' },
    { label: 'Delitos', route: '/administracion/delitos' },
    { label: 'Modalidades de delitos', route: '/administracion/modalidades' },
    { label: 'Géneros', route: '/administracion/generos' },
    { label: 'Folios (contadores)', route: '/administracion/contadores' },
  ],
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icono],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit, OnDestroy {
  protected readonly user;
  protected readonly nav;
  protected readonly pendientes;
  protected readonly etiquetaPendientes;
  protected readonly anio = new Date().getFullYear();

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    solicitudesService: SolicitudesService,
    protected readonly inactivity: InactivityService,
  ) {
    this.user = this.authService.currentUser;

    this.nav = computed<NavItem[]>(() => {
      const base: NavItem[] = [
        { label: 'Inicio', icono: 'grafica', route: '/inicio' },
        { label: 'Solicitudes', icono: 'bandeja', route: '/solicitudes' },
      ];
      return this.authService.esSuperUsuario() ? [...base, ADMINISTRACION] : base;
    });

    // Turnos que esperan respuesta de la institución del usuario.
    const pendientes$ = interval(INTERVALO_NOTIFICACIONES_MS).pipe(
      startWith(0),
      switchMap(() =>
        solicitudesService.resumen().pipe(
          map((r) => r.turnosPendientes),
          catchError(() => of(0)),
        ),
      ),
    );
    this.pendientes = toSignal(pendientes$, { initialValue: 0 });
    this.etiquetaPendientes = computed(() => (this.pendientes() > 9 ? '9+' : String(this.pendientes())));
  }

  ngOnInit(): void {
    this.inactivity.start();
  }

  ngOnDestroy(): void {
    this.inactivity.stop();
  }

  logout(): void {
    this.inactivity.stop();
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  cerrarMenuMovil(): void {
    const menu = document.getElementById('mainNav');
    if (!menu || !menu.classList.contains('show')) return;

    const bootstrapGlobal = (window as unknown as { bootstrap?: BootstrapGlobal }).bootstrap;
    bootstrapGlobal?.Collapse.getOrCreateInstance(menu).hide();
  }
}

interface BootstrapGlobal {
  Collapse: {
    getOrCreateInstance(element: Element): { hide(): void };
  };
}
